import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function PUT(request, { params }) {
  try {
    const { id } = params

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

    // 강사 권한 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || userProfile?.role !== 'teacher') {
      return NextResponse.json({ error: '강사만 접근할 수 있습니다.' }, { status: 403 })
    }

    // 수정할 가능 시간이 본인 것인지 확인
    const { data: existing, error: existingError } = await supabase
      .from('teacher_availability')
      .select('*')
      .eq('id', id)
      .eq('teacher_id', user.id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: '해당 시간 슬롯을 찾을 수 없습니다.' }, { status: 404 })
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

    // 중복 시간 체크 (자기 자신 제외)
    const { data: conflicting, error: checkError } = await supabase
      .from('teacher_availability')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('day_of_week', day_of_week)
      .neq('id', id)
      .or(
        `and(start_time.lte.${start_time},end_time.gt.${start_time}),` +
        `and(start_time.lt.${end_time},end_time.gte.${end_time}),` +
        `and(start_time.gte.${start_time},end_time.lte.${end_time})`
      )

    if (checkError) {
      console.error('중복 시간 체크 오류:', checkError)
      return NextResponse.json({ error: '시간 확인에 실패했습니다.' }, { status: 500 })
    }

    if (conflicting && conflicting.length > 0) {
      return NextResponse.json({ error: '선택한 시간과 겹치는 시간 슬롯이 이미 존재합니다.' }, { status: 400 })
    }

    // 가능 시간 업데이트
    const { data: updated, error: updateError } = await supabase
      .from('teacher_availability')
      .update({
        day_of_week,
        start_time,
        end_time,
        is_available,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('teacher_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('가능 시간 수정 오류:', updateError)
      return NextResponse.json({ error: '가능 시간 수정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      availability: updated
    })

  } catch (error) {
    console.error('가능 시간 수정 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

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

    // 강사 권한 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || userProfile?.role !== 'teacher') {
      return NextResponse.json({ error: '강사만 접근할 수 있습니다.' }, { status: 403 })
    }

    // 삭제할 가능 시간이 본인 것인지 확인
    const { data: existing, error: existingError } = await supabase
      .from('teacher_availability')
      .select('*')
      .eq('id', id)
      .eq('teacher_id', user.id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: '해당 시간 슬롯을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 해당 시간에 등록된 수업이 있는지 확인
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('day_of_week', existing.day_of_week)
      .gte('start_time', existing.start_time)
      .lt('start_time', existing.end_time)
      .eq('status', 'active')

    if (classesError) {
      console.error('수업 등록 확인 오류:', classesError)
      return NextResponse.json({ error: '수업 등록 확인에 실패했습니다.' }, { status: 500 })
    }

    if (classes && classes.length > 0) {
      return NextResponse.json({ 
        error: '해당 시간에 등록된 수업이 있어 삭제할 수 없습니다. 먼저 수업을 취소하거나 시간을 변경해주세요.' 
      }, { status: 400 })
    }

    // 가능 시간 삭제
    const { error: deleteError } = await supabase
      .from('teacher_availability')
      .delete()
      .eq('id', id)
      .eq('teacher_id', user.id)

    if (deleteError) {
      console.error('가능 시간 삭제 오류:', deleteError)
      return NextResponse.json({ error: '가능 시간 삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '가능 시간이 삭제되었습니다.'
    })

  } catch (error) {
    console.error('가능 시간 삭제 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 