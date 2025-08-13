import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  try {
    // 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    // 강사 권한 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || userProfile?.role !== 'teacher') {
      return NextResponse.json({ error: '강사만 접근할 수 있습니다.' }, { status: 403 })
    }
    
    // 현재 로그인한 강사의 수업 가능 시간과 실제 수업 비교
    const { data: availability, error } = await supabase
      .from('teacher_availability')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('is_available', true)
      .order('day_of_week')
      .order('start_time')
    
    if (error) {
      console.error('강사 수업 가능 시간 조회 실패:', error)
      return NextResponse.json({ error: '강사 수업 가능 시간 조회 실패' }, { status: 500 })
    }

    // 실제 수업 조회
    const { data: existingClasses, error: classesError } = await supabase
      .from('classes')
      .select('id, title, day_of_week, start_time, duration, room_id')
      .eq('teacher_id', user.id)
      .eq('status', 'active')

    if (classesError) {
      console.error('실제 수업 조회 실패:', classesError)
      return NextResponse.json({ error: '실제 수업 조회 실패' }, { status: 500 })
    }

    // 실제 가능한 시간 계산
    const actualAvailability = availability.filter(slot => {
      // 해당 시간에 실제 수업이 있는지 확인
      const hasConflict = existingClasses.some(cls => {
        if (cls.day_of_week !== slot.day_of_week) return false
        
        const slotStart = slot.start_time
        const slotEnd = slot.end_time
        const classStart = cls.start_time
        
        // 수업 종료 시간 계산
        const [hours, minutes] = cls.start_time.split(':').map(Number)
        const endMinutes = hours * 60 + minutes + (cls.duration || 60)
        const endHours = Math.floor(endMinutes / 60)
        const endMins = endMinutes % 60
        const classEnd = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
        
        // 시간 겹침 확인
        return !(slotEnd <= classStart || slotStart >= classEnd)
      })
      
      return !hasConflict
    })
    
    return NextResponse.json({ 
      availability: actualAvailability || [],
      currentClasses: existingClasses || []
    })
  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    // 강사 권한 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || userProfile?.role !== 'teacher') {
      return NextResponse.json({ error: '강사만 접근할 수 있습니다.' }, { status: 403 })
    }

    // 요청 데이터 파싱
    const body = await request.json()
    const { day_of_week, start_time, end_time, is_available = true } = body

    // 입력 유효성 검사
    if (day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 })
    }

    if (day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json({ error: '유효하지 않은 요일입니다.' }, { status: 400 })
    }

    if (start_time >= end_time) {
      return NextResponse.json({ error: '시작 시간은 종료 시간보다 빨라야 합니다.' }, { status: 400 })
    }

    // 중복 시간 체크
    const { data: existing, error: checkError } = await supabase
      .from('teacher_availability')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('day_of_week', day_of_week)
      .or(
        `and(start_time.lte.${start_time},end_time.gt.${start_time}),` +
        `and(start_time.lt.${end_time},end_time.gte.${end_time}),` +
        `and(start_time.gte.${start_time},end_time.lte.${end_time})`
      )

    if (checkError) {
      console.error('중복 시간 체크 오류:', checkError)
      return NextResponse.json({ error: '시간 확인에 실패했습니다.' }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: '선택한 시간과 겹치는 시간 슬롯이 이미 존재합니다.' }, { status: 400 })
    }

    // 새 가능 시간 추가
    const { data: newAvailability, error: insertError } = await supabase
      .from('teacher_availability')
      .insert({
        teacher_id: user.id,
        day_of_week,
        start_time,
        end_time,
        is_available
      })
      .select()
      .single()

    if (insertError) {
      console.error('가능 시간 추가 오류:', insertError)
      return NextResponse.json({ error: '가능 시간 추가에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      availability: newAvailability
    })

  } catch (error) {
    console.error('가능 시간 추가 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 