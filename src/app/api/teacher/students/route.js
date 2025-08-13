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

    // 강사 권한 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'teacher') {
      return NextResponse.json({ error: '강사 권한이 필요합니다.' }, { status: 403 })
    }

    // 강사의 수업에 등록된 학생 목록 조회
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('class_students')
      .select(`
        id,
        status,
        created_at,
        classes!inner (
          id,
          title,
          subject,
          day_of_week,
          start_time,
          duration,
          teacher_id
        ),
        students:student_id (
          user_id,
          name,
          email,
          phone
        )
      `)
      .eq('classes.teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (enrollmentsError) {
      console.error('수업 등록 정보 조회 오류:', enrollmentsError)
      return NextResponse.json({ error: '학생 목록을 불러오는데 실패했습니다.' }, { status: 500 })
    }

    // 데이터 구조 변환
    const processedEnrollments = enrollments?.map(enrollment => {
      // 종료시간 계산 함수
      const calculateEndTime = (startTime, duration) => {
        const [hours, minutes] = startTime.split(':').map(Number)
        const startMinutes = hours * 60 + minutes
        const endMinutes = startMinutes + duration
        const endHours = Math.floor(endMinutes / 60)
        const endMins = endMinutes % 60
        return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
      }

      const startTime = enrollment.classes?.start_time
      const duration = enrollment.classes?.duration || 60
      const endTime = startTime ? calculateEndTime(startTime, duration) : null

      return {
        id: enrollment.id,
        status: enrollment.status,
        created_at: enrollment.created_at,
        lesson_duration: duration,
        day_of_week: enrollment.classes?.day_of_week,
        lesson_time: startTime,
        lesson_end_time: endTime,
        students: {
          user_profiles: {
            name: enrollment.students?.name,
            email: enrollment.students?.email,
            phone: enrollment.students?.phone
          }
        },
        classes: enrollment.classes
      }
    }) || []

    return NextResponse.json({ enrollments: processedEnrollments })

  } catch (error) {
    console.error('서버 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 