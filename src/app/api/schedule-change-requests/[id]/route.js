import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function PATCH(request, { params }) {
  try {
    console.log('일정변경 요청 처리 API 시작:', { params })
    
    const { id } = params

    // 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.log('인증 헤더 없음')
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.log('인증 실패:', authError)
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    console.log('사용자 확인됨:', user.id)

    // 강사 권한 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.log('프로필 조회 실패:', profileError)
      return NextResponse.json({ error: '사용자 프로필 조회 실패' }, { status: 500 })
    }

    if (userProfile?.role !== 'teacher') {
      console.log('권한 없음. 사용자 역할:', userProfile?.role)
      return NextResponse.json({ error: '강사만 접근할 수 있습니다.' }, { status: 403 })
    }

    console.log('강사 권한 확인됨')

    // 요청 데이터 파싱
    const body = await request.json()
    const { action, rejectionReason } = body // 'approve' 또는 'reject'

    console.log('요청 액션:', action, '거절 사유:', rejectionReason)

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '유효하지 않은 액션입니다.' }, { status: 400 })
    }

    if (action === 'reject' && !rejectionReason?.trim()) {
      return NextResponse.json({ error: '거절 사유를 입력해주세요.' }, { status: 400 })
    }

    // 일정변경 요청 조회 및 권한 확인
    console.log('요청 ID로 조회 시작:', id)
    
    const { data: changeRequest, error: requestError } = await supabase
      .from('schedule_change_requests')
      .select(`
        *,
        classes!inner (
          id,
          teacher_id,
          day_of_week,
          start_time,
          room_id
        )
      `)
      .eq('id', id)
      .eq('classes.teacher_id', user.id)
      .single()

    if (requestError) {
      console.error('요청 조회 실패:', requestError)
      return NextResponse.json({ error: `요청 조회 실패: ${requestError.message}` }, { status: 500 })
    }

    if (!changeRequest) {
      console.log('요청을 찾을 수 없음')
      return NextResponse.json({ error: '해당 요청을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 })
    }

    console.log('요청 정보:', changeRequest)

    if (changeRequest.status !== 'pending') {
      console.log('이미 처리된 요청. 현재 상태:', changeRequest.status)
      return NextResponse.json({ error: '이미 처리된 요청입니다.' }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    console.log('새로운 상태:', newStatus)

    // 트랜잭션 시작
    if (action === 'approve') {
      console.log('승인 처리 시작')
      
      // 승인인 경우: 기존 수업 일정 변경
      const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
      
      // 기존 title에서 요일 정보 업데이트
      let updatedTitle = changeRequest.classes.title
      dayNames.forEach((dayName, index) => {
        if (updatedTitle.includes(dayName)) {
          updatedTitle = updatedTitle.replace(dayName, dayNames[changeRequest.requested_day_of_week])
        }
      })
      
      const { error: updateClassError } = await supabase
        .from('classes')
        .update({
          title: updatedTitle,
          day_of_week: changeRequest.requested_day_of_week,
          start_time: changeRequest.requested_lesson_time,
          room_id: changeRequest.requested_room_id || changeRequest.classes.room_id
        })
        .eq('id', changeRequest.class_id)

      if (updateClassError) {
        console.error('수업 일정 업데이트 실패:', updateClassError)
        return NextResponse.json({ error: '수업 일정 업데이트에 실패했습니다.' }, { status: 500 })
      }

      console.log('수업 일정 업데이트 완료')
    }

    // 요청 상태 업데이트
    console.log('요청 상태 업데이트 시작')
    
    const updateData = { 
      status: newStatus,
      approved_by: user.id,
      approved_at: new Date().toISOString()
    }
    if (action === 'reject' && rejectionReason) {
      updateData.rejection_reason = rejectionReason.trim()
    }
    
    const { data: updatedRequest, error: updateError } = await supabase
      .from('schedule_change_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('요청 상태 업데이트 실패:', updateError)
      return NextResponse.json({ error: `요청 상태 업데이트 실패: ${updateError.message}` }, { status: 500 })
    }

    console.log('요청 처리 완료:', updatedRequest)

    return NextResponse.json({
      success: true,
      request: updatedRequest,
      message: action === 'approve' ? '일정변경이 승인되었습니다.' : '일정변경이 거부되었습니다.'
    })

  } catch (error) {
    console.error('일정변경 요청 처리 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 