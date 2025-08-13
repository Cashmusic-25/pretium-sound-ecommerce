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

    // 강사의 수업 목록 조회 (방정보와 참여학생 포함)
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select(`
        *,
        rooms:room_id (
          id,
          name,
          capacity,
          description
        ),
        class_students (
          id,
          status,
          created_at,
          students:student_id (
            user_id,
            name,
            email,
            phone
          )
        )
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (classesError) {
      console.error('수업 목록 조회 오류:', classesError)
      return NextResponse.json({ error: '수업 목록을 불러오는데 실패했습니다.' }, { status: 500 })
    }

    // 데이터 가공: 방이름과 학생 정보를 편리하게 접근할 수 있도록 변환
    const processedClasses = (classes || []).map(cls => ({
      ...cls,
      room_name: cls.rooms?.name || '방 정보 없음',
      student_count: cls.class_students?.length || 0,
      student_names: cls.class_students?.map(cs => cs.students?.name || '이름없음') || []
    }))

    return NextResponse.json({ classes: processedClasses })

  } catch (error) {
    console.error('서버 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 