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

    // 모든 학생의 수업 정보 조회
    const { data: studentClasses, error: studentClassesError } = await supabase
      .from('class_students')
      .select(`
        id,
        status,
        created_at,
        classes (
          id,
          subject,
          title,
          day_of_week,
          start_time,
          duration,
          teacher_id
        ),
        students:student_id (
          user_id,
          name,
          email
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (studentClassesError) {
      console.error('학생 수업 정보 조회 오류:', studentClassesError)
      return NextResponse.json({ error: '학생 수업 정보를 불러오는데 실패했습니다.' }, { status: 500 })
    }

    // 학생별로 과목 정보 그룹화
    const studentSubjectsMap = {}
    
    studentClasses?.forEach(enrollment => {
      const studentId = enrollment.students?.user_id
      const subject = enrollment.classes?.subject
      
      if (studentId && subject) {
        if (!studentSubjectsMap[studentId]) {
          studentSubjectsMap[studentId] = []
        }
        
        // 중복 과목 제거
        if (!studentSubjectsMap[studentId].includes(subject)) {
          studentSubjectsMap[studentId].push(subject)
        }
      }
    })

    return NextResponse.json({ studentSubjects: studentSubjectsMap })

  } catch (error) {
    console.error('서버 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 