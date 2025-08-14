import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    // 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    // 관리자 권한 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    // 모든 활성 수업 조회 (방/강사/학생 포함)
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select(`
        *,
        rooms:room_id (
          id,
          name
        ),
        class_students (
          id,
          status,
          created_at,
          students:student_id (
            user_id,
            name,
            email
          )
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (classesError) {
      console.error('수업 목록 조회 오류:', classesError)
      return NextResponse.json({ error: '수업 목록을 불러오는데 실패했습니다.' }, { status: 500 })
    }

    // teacher_id → name 매핑을 위해 user_profiles 조회 (FK가 없을 수 있으므로 별도 조회)
    const teacherIds = Array.from(new Set((classes || []).map(c => c.teacher_id).filter(Boolean)))
    let teacherMap = {}
    if (teacherIds.length > 0) {
      const { data: teachers, error: teacherErr } = await supabase
        .from('user_profiles')
        .select('user_id,name,email')
        .in('user_id', teacherIds)

      if (!teacherErr && Array.isArray(teachers)) {
        teacherMap = teachers.reduce((acc, t) => {
          acc[t.user_id] = t
          return acc
        }, {})
      }
    }

    // 날짜 유틸
    const toDate = (ymd) => {
      if (!ymd) return null
      const [y, m, d] = String(ymd).split('-').map(Number)
      if (!y || !m || !d) return null
      const dt = new Date(y, m - 1, d)
      dt.setHours(0, 0, 0, 0)
      return dt
    }
    const fmt = (dt) => {
      if (!dt) return null
      const y = dt.getFullYear()
      const m = String(dt.getMonth() + 1).padStart(2, '0')
      const d = String(dt.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    const addDays = (dt, n) => {
      const nd = new Date(dt)
      nd.setDate(nd.getDate() + n)
      nd.setHours(0, 0, 0, 0)
      return nd
    }
    const nextDayOfWeek = (from, targetDOW) => {
      const day = from.getDay()
      const diff = (targetDOW - day + 7) % 7
      return addDays(from, diff)
    }
    const sameDowNextOnOrAfter = (base, today) => {
      // 다음(오늘 포함) 동일 요일
      return nextDayOfWeek(today, base.getDay())
    }
    const weeksBetween = (a, b) => {
      const ms = b - a
      return Math.floor(ms / (1000 * 60 * 60 * 24 * 7))
    }
    const nextBiWeekly = (base, today) => {
      // base와 요일 동일, 주차 parity 유지
      let candidate = sameDowNextOnOrAfter(base, today)
      const w = weeksBetween(base, candidate)
      if (w % 2 !== 0) {
        candidate = addDays(candidate, 7)
      }
      return candidate
    }
    const nextMonthly = (base, today) => {
      const day = base.getDate()
      const candidateThis = new Date(today.getFullYear(), today.getMonth(), day)
      candidateThis.setHours(0, 0, 0, 0)
      if (candidateThis >= today) return candidateThis
      const candidateNext = new Date(today.getFullYear(), today.getMonth() + 1, day)
      candidateNext.setHours(0, 0, 0, 0)
      return candidateNext
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const processed = (classes || []).map((cls) => {
      const studentNames = (cls.class_students || [])
        .map((cs) => cs?.students?.name)
        .filter(Boolean)
      const studentIds = (cls.class_students || [])
        .map((cs) => cs?.students?.user_id)
        .filter(Boolean)
      const teacherProfile = cls.teacher_id ? teacherMap[cls.teacher_id] : null

      // day_of_week 보정: 없으면 date로 계산
      let normalizedDayOfWeek = typeof cls.day_of_week === 'number' ? cls.day_of_week : null
      if (normalizedDayOfWeek === null && cls.date) {
        const dt = toDate(cls.date)
        if (dt) normalizedDayOfWeek = dt.getDay()
      }

      // duration 보정: 없으면 start/end로 계산
      let normalizedDuration = cls.duration || null
      if (!normalizedDuration && cls.start_time && cls.end_time) {
        const toMin = (t) => { const [h,m] = String(t).split(':').map(Number); return h*60+m }
        const diff = toMin(cls.end_time) - toMin(cls.start_time)
        normalizedDuration = diff > 0 ? diff : null
      }

       // next_date 계산
      const baseDate = toDate(cls.date)
      let nextDate = null
      const hasDOW = typeof cls.day_of_week === 'number'
      const recurrencePattern = cls.recurrence_pattern || null
      const isRecurring = !!cls.is_recurring
      const recurrenceType = cls.recurrence_type || null
      const recurrenceEnd = toDate(cls.recurrence_end_date)

      if (isRecurring) {
        // 반복 수업
        const pattern = recurrencePattern || (hasDOW ? 'weekly' : 'daily')
        let candidate = null
        switch (pattern) {
          case 'daily':
            candidate = today
            break
          case 'weekly': {
            const anchor = baseDate || (hasDOW ? addDays(nextDayOfWeek(today, cls.day_of_week), 0) : today)
            candidate = sameDowNextOnOrAfter(anchor, today)
            break
          }
          case 'biweekly': {
            const anchor = baseDate || (hasDOW ? addDays(nextDayOfWeek(today, cls.day_of_week), 0) : today)
            candidate = nextBiWeekly(anchor, today)
            break
          }
          case 'monthly': {
            const anchor = baseDate || today
            candidate = nextMonthly(anchor, today)
            break
          }
          default:
            candidate = today
        }
        // 종료일 제한
        if (recurrenceType === 'finite' && recurrenceEnd && candidate > recurrenceEnd) {
          nextDate = null
        } else {
          nextDate = fmt(candidate)
        }
      } else {
        // 단일/요일 기반 수업
        if (baseDate && baseDate >= today) {
          nextDate = fmt(baseDate)
        } else if (hasDOW) {
          const candidate = nextDayOfWeek(today, cls.day_of_week)
          nextDate = fmt(candidate)
        } else if (baseDate) {
          // 과거 단일 수업: 다음 없음
          nextDate = null
        } else {
          nextDate = null
        }
      }

      return {
        id: cls.id,
        title: cls.title,
        subject: cls.subject || null,
        date: cls.date || null,
        next_date: nextDate,
        day_of_week: normalizedDayOfWeek,
        start_time: cls.start_time || null,
        end_time: cls.end_time || null,
        duration: normalizedDuration,
        status: cls.status,
        room_id: cls.room_id,
        room_name: cls.rooms?.name || '방 정보 없음',
        teacher_id: cls.teacher_id || null,
        teacher_name: teacherProfile?.name || cls.teacher || '강사',
        student_count: studentNames.length,
        student_ids: studentIds,
        student_names: studentNames,
        created_at: cls.created_at,
        updated_at: cls.updated_at
      }
    })

    return NextResponse.json({ classes: processed })
  } catch (error) {
    console.error('서버 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      title,
      subject,
      room_id,
      date, // optional when weekly
      day_of_week, // 0-6
      start_time,
      end_time,
      duration, // optional if end_time given
      status = 'active',
      teacher_id,
      student_ids = [], // array of user_id
      is_recurring = false
      // recurrence_* 필드는 현재 스키마에 없으므로 무시
    } = body || {}

    // 인증/권한
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    // 필수값 검증
    if (!title || !room_id || !start_time || (!end_time && !duration)) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
    }

    // 종료시간 계산
    const calcEnd = (start, dur) => {
      if (!dur) return end_time
      const [h, m] = String(start).split(':').map(Number)
      const startMin = h * 60 + m
      const endMin = startMin + Number(dur)
      const eh = String(Math.floor(endMin / 60)).padStart(2, '0')
      const em = String(endMin % 60).padStart(2, '0')
      return `${eh}:${em}`
    }
    const finalEnd = end_time || calcEnd(start_time, duration)

    // 기본 row 생성
    const insertPayload = {
      title,
      subject: subject || null,
      room_id,
      date: date || null,
      day_of_week: typeof day_of_week === 'number' ? day_of_week : null,
      start_time,
      end_time: finalEnd,
      duration: duration || null,
      status,
      teacher_id: teacher_id || null,
      is_recurring: !!is_recurring,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: created, error: insertErr } = await supabase
      .from('classes')
      .insert([insertPayload])
      .select()
      .single()
    if (insertErr || !created) {
      console.error('수업 생성 실패:', { insertPayload, insertErr })
      return NextResponse.json({ error: `수업 생성에 실패했습니다: ${insertErr?.message || '알 수 없는 오류'}` }, { status: 500 })
    }

    // 학생 매핑 생성
    if (Array.isArray(student_ids) && student_ids.length > 0) {
      const classStudents = student_ids.map((sid) => ({
        class_id: created.id,
        student_id: sid,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      const { error: csErr } = await supabase.from('class_students').insert(classStudents)
      if (csErr) {
        console.error('class_students 생성 실패:', csErr)
      }
    }

    return NextResponse.json({ class: created })
  } catch (error) {
    console.error('서버 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body || {}

    // 인증/권한
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    if (!id) {
      return NextResponse.json({ error: '수정할 수업 ID가 필요합니다.' }, { status: 400 })
    }

    // students 업데이트가 포함된 경우 분리 처리
    const { student_ids, ...classFields } = updates

    // 허용 필드만 화이트리스트로 업데이트 (스키마 외 컬럼 차단)
    const allowedKeys = new Set([
      'title', 'description', 'room_id', 'date', 'start_time', 'end_time',
      'subject', 'day_of_week', 'duration', 'status', 'teacher_id', 'is_recurring'
    ])
    const safeFields = {}
    for (const [k, v] of Object.entries(classFields)) {
      if (allowedKeys.has(k) && v !== undefined) {
        safeFields[k] = v
      }
    }
    // 빈 문자열을 null로 정규화
    for (const key of ['room_id','subject','date','start_time','end_time','status','teacher_id']) {
      if (Object.prototype.hasOwnProperty.call(safeFields, key) && safeFields[key] === '') {
        safeFields[key] = null
      }
    }

    // duration이 없고 start/end가 있으면 계산
    if ((safeFields.duration === undefined || safeFields.duration === null) && safeFields.start_time && safeFields.end_time) {
      const toMin = (t) => { const [h,m] = String(t).split(':').map(Number); return h*60+m }
      const diff = toMin(safeFields.end_time) - toMin(safeFields.start_time)
      safeFields.duration = diff > 0 ? diff : null
    }

    // 제목 자동 생성: 과목/날짜/시작시간이 변경된 경우 일관 포맷으로 동기화
    const needRetitle = ['subject','date','start_time'].some(k => Object.prototype.hasOwnProperty.call(safeFields, k))
    if (needRetitle) {
      // 현재 행 조회하여 누락된 값 보완
      const { data: currentRow } = await supabase
        .from('classes')
        .select('subject,date,start_time')
        .eq('id', id)
        .single()
      const subjectRaw = (safeFields.subject ?? currentRow?.subject) || '수업'
      const subjectMap = { piano: '피아노', drum: '드럼', guitar: '기타', bass: '베이스기타', vocal: '보컬', composition: '작곡', general: '음악' }
      const subjectKo = subjectMap[subjectRaw] || subjectRaw
      const dateStr = (safeFields.date ?? currentRow?.date) || null
      const startStr = (safeFields.start_time ?? currentRow?.start_time) || ''
      const toDOW = (d) => {
        if (!d) return null
        const parts = String(d).split('-').map(Number)
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null
        const dt = new Date(parts[0], parts[1]-1, parts[2])
        if (isNaN(dt)) return null
        return dt.getDay()
      }
      const days = ['일','월','화','수','목','금','토']
      const dow = toDOW(dateStr)
      const title = dow !== null ? `${subjectKo} (${days[dow]}요일 ${String(startStr).slice(0,5)})` : `${subjectKo} (${String(startStr).slice(0,5)})`
      safeFields.title = title
    }
    // updated_at 갱신
    if (Object.keys(safeFields).length > 0) {
      safeFields.updated_at = new Date().toISOString()
      const { error: upErr } = await supabase
        .from('classes')
        .update(safeFields)
        .eq('id', id)
      if (upErr) {
        console.error('수업 수정 실패:', { safeFields, upErr })
        return NextResponse.json({ error: `수업 수정에 실패했습니다: ${upErr.message}` }, { status: 500 })
      }
    }

    if (Array.isArray(student_ids)) {
      // 기존 매핑 삭제 후 재삽입 (간단 접근)
      const { error: delErr } = await supabase
        .from('class_students')
        .delete()
        .eq('class_id', id)
      if (delErr) {
        console.error('학생 매핑 삭제 실패:', delErr)
      }
      if (student_ids.length > 0) {
        const inserts = student_ids.map((sid) => ({
          class_id: id,
          student_id: sid,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
        const { error: insErr } = await supabase.from('class_students').insert(inserts)
        if (insErr) {
          console.error('학생 매핑 생성 실패:', insErr)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('서버 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}


