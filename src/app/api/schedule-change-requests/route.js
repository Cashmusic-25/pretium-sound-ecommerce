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

    // 사용자 권한 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    let requests = []

    if (userProfile.role === 'teacher') {
      console.log('강사 조회 시작, teacher_id:', user.id)
      
      // 강사의 수업에 대한 일정변경 요청 조회 (학생 정보 포함)
      const { data: teacherRequests, error: teacherError } = await supabase
        .from('schedule_change_requests')
        .select(`
          *,
          classes!inner(
            id,
            title,
            teacher_id,
            subject
          ),
          student:student_id(
            user_id,
            name,
            email
          )
        `)
        .eq('classes.teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (teacherError) {
        console.error('강사 변경 요청 조회 오류:', teacherError)
        return NextResponse.json({ error: '일정변경 요청을 불러오는데 실패했습니다.' }, { status: 500 })
      }

      console.log('강사 조회 결과:', teacherRequests)
      requests = teacherRequests || []

    } else if (userProfile.role === 'student') {
      console.log('🎓 학생 요청 조회 시작, student_id:', user.id)
      
      // 학생인 경우: 자신의 일정변경 요청 조회 (수업 정보 포함)
      const { data: studentRequests, error: studentError } = await supabase
        .from('schedule_change_requests')
        .select(`
          *,
          classes(
            id,
            title,
            subject
          )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })

      if (studentError) {
        console.error('❌ 학생 변경 요청 조회 오류:', studentError)
        return NextResponse.json({ error: '일정변경 요청을 불러오는데 실패했습니다.' }, { status: 500 })
      }

      console.log('✅ 학생 요청 조회 결과:', studentRequests?.length || 0, '개')
      requests = studentRequests || []
    }

    return NextResponse.json({ requests })

  } catch (error) {
    console.error('서버 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request) {
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

    // 학생 권한 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || userProfile?.role !== 'student') {
      return NextResponse.json({ error: '학생만 변경 요청을 할 수 있습니다.' }, { status: 403 })
    }

    // 요청 데이터 파싱
    const body = await request.json()
    const {
      class_id,
      current_day_of_week,
      current_lesson_time,
      current_room_id,
      requested_day_of_week,
      requested_lesson_time,
      requested_room_id,
      reason
    } = body

    // 입력 유효성 검사
    if (!class_id || !reason || !reason.trim()) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 })
    }

    if (requested_day_of_week === undefined || !requested_lesson_time) {
      return NextResponse.json({ error: '변경 희망 요일과 시간을 선택해주세요.' }, { status: 400 })
    }

    // 수업 등록 정보 확인 (학생이 해당 수업을 수강하는지 확인)
    console.log('조회할 class_id:', class_id)
    console.log('조회할 student_id:', user.id)
    
    // 1단계: class_students에서 수강 등록 확인
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from('class_students')
      .select('*')
      .eq('class_id', class_id)
      .eq('student_id', user.id)
      .single()

    if (enrollmentError) {
      console.error('enrollment 조회 오류:', enrollmentError)
      return NextResponse.json({ error: '해당 수업을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 })
    }
    
    if (!enrollmentData) {
      console.error('enrollment 데이터 없음')
      return NextResponse.json({ error: '해당 수업을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 })
    }

    // 2단계: classes 테이블에서 수업 정보 조회
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, teacher_id, day_of_week, start_time, duration')
      .eq('id', class_id)
      .single()

    if (classError || !classData) {
      console.error('class 조회 오류:', classError)
      return NextResponse.json({ error: '수업 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // enrollmentData와 classData를 합쳐서 사용
    const combinedData = {
      ...enrollmentData,
      classes: classData
    }

    // 이미 대기 중인 변경 요청이 있는지 확인
    const { data: existingRequest, error: existingError } = await supabase
      .from('schedule_change_requests')
      .select('id')
      .eq('class_id', class_id)
      .eq('student_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingError) {
      console.error('기존 요청 확인 오류:', existingError)
      return NextResponse.json({ error: '요청 확인 중 오류가 발생했습니다.' }, { status: 500 })
    }

    if (existingRequest) {
      return NextResponse.json({ error: '이미 대기 중인 변경 요청이 있습니다.' }, { status: 400 })
    }

    // 24시간 이내 제한 확인
    const getNextClassTime = (enrollment) => {
      const now = new Date()
      const currentDay = now.getDay() // 0 = 일요일
      const currentTime = now.getHours() * 100 + now.getMinutes() // HHMM 형식
      
      // 수업 요일과 시간
      const classDay = enrollment.classes.day_of_week
      const classTime = parseInt(enrollment.classes.start_time.replace(':', '')) // "14:30" -> 1430
      
      let targetDate = new Date(now)
      
      // 이번 주 수업일 찾기
      const daysUntilClass = (classDay - currentDay + 7) % 7
      
      if (daysUntilClass === 0) {
        // 같은 요일인 경우 시간 비교
        if (classTime <= currentTime) {
          // 이미 지났으면 다음 주
          targetDate.setDate(targetDate.getDate() + 7)
        }
      } else {
        // 다른 요일인 경우
        targetDate.setDate(targetDate.getDate() + daysUntilClass)
      }
      
      // 수업 시간 설정
      const [hours, minutes] = enrollment.classes.start_time.split(':')
      targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      return targetDate
    }

    const nextClassTime = getNextClassTime(combinedData)
    const now = new Date()
    const timeDiff = nextClassTime.getTime() - now.getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)
    
    if (hoursDiff <= 24 && hoursDiff > 0) {
      const hoursUntilClass = Math.round(hoursDiff)
      return NextResponse.json({ 
        error: `수업 ${hoursUntilClass}시간 전입니다. 수업 24시간 이내에는 일정변경을 신청할 수 없습니다.` 
      }, { status: 400 })
    }

    // 강사의 해당 시간 가능 여부 확인
    const { data: availability, error: availabilityError } = await supabase
      .from('teacher_availability')
      .select('*')
      .eq('teacher_id', combinedData.classes.teacher_id)
      .eq('day_of_week', requested_day_of_week)
      .lte('start_time', requested_lesson_time)
      .gt('end_time', requested_lesson_time)
      .eq('is_available', true)
      .maybeSingle()

    if (availabilityError) {
      console.error('가능 시간 확인 오류:', availabilityError)
      return NextResponse.json({ error: '시간 확인 중 오류가 발생했습니다.' }, { status: 500 })
    }

    if (!availability) {
      return NextResponse.json({ error: '선택한 시간에 강사님이 수업 불가능합니다.' }, { status: 400 })
    }

    // 변경 요청 생성
    const { data: newRequest, error: insertError } = await supabase
      .from('schedule_change_requests')
      .insert({
        class_id,
        student_id: user.id,
        current_day_of_week,
        current_lesson_time,
        current_room_id,
        requested_day_of_week,
        requested_lesson_time,
        requested_room_id,
        reason,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('변경 요청 생성 오류:', insertError)
      return NextResponse.json({ error: '변경 요청 생성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      request: newRequest
    })

  } catch (error) {
    console.error('변경 요청 생성 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 