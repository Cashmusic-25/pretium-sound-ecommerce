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

    if (profileError || userProfile?.role !== 'teacher') {
      return NextResponse.json({ error: '강사만 접근할 수 있습니다.' }, { status: 403 })
    }

    // 학생번호 정보 조회 (user_profiles에서 phone을 student_number로 사용)
    const { data: studentNumbers, error: studentError } = await supabase
      .from('user_profiles')
      .select('user_id, phone')
      .eq('role', 'student')
      .not('phone', 'is', null)

    if (studentError) {
      console.error('학생번호 조회 오류:', studentError)
      return NextResponse.json({ error: '학생번호 조회에 실패했습니다.' }, { status: 500 })
    }

    // user_id와 phone을 매핑하여 반환
    const studentNumberMap = (studentNumbers || []).map(student => ({
      user_id: student.user_id,
      student_number: student.phone
    }))

    return NextResponse.json(studentNumberMap)

  } catch (error) {
    console.error('학생번호 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 