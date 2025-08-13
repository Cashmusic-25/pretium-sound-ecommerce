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

    // 학생 권한 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (profileError || userProfile?.role !== 'student') {
      return NextResponse.json({ error: '학생만 접근할 수 있습니다.' }, { status: 403 })
    }

    // 1단계: class_students에서 student_id로 row 조회
    const { data: classStudentRows, error: classStudentError } = await supabase
      .from('class_students')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
    if (!classStudentRows || classStudentRows.length === 0) {
      return NextResponse.json({
        success: true,
        enrollments: [],
        teachers: [],
        rooms: []
      })
    }

    // 2단계: classes 테이블에서 수업 정보 조회
    const classIds = classStudentRows.map(row => row.class_id)
    const { data: classRows, error: classRowsError } = await supabase
      .from('classes')
      .select('*')
      .in('id', classIds)
    if (!classRows || classRows.length === 0) {
      return NextResponse.json({
        success: true,
        enrollments: [],
        teachers: [],
        rooms: []
      })
    }

    // 3단계: 강사 user_id 목록 추출 후 user_profiles에서 강사 정보 조회
    const teacherIds = [...new Set(classRows.map(cls => cls.teacher_id).filter(Boolean))]
    let teacherProfiles = []
    if (teacherIds.length > 0) {
      const { data: teacherRows } = await supabase
        .from('user_profiles')
        .select('user_id, name, email, phone')
        .in('user_id', teacherIds)
      teacherProfiles = teacherRows || []
    }

    // 4단계: room 정보 조회 (필요시)
    // rooms 테이블의 모든 방을 항상 반환
    let roomProfiles = []
    const { data: allRooms, error: allRoomsError } = await supabase
      .from('rooms')
      .select('*')
    roomProfiles = allRooms || []

    // enrollments 형태로 변환
    const enrollments = classStudentRows.map(row => {
      const cls = classRows.find(c => c.id === row.class_id)
      if (!cls) return null
      const teacherProfile = teacherProfiles.find(t => t.user_id === cls.teacher_id) || null
      const roomProfile = roomProfiles.find(r => r.id === cls.room_id) || null
      return {
        id: row.id, // class_students의 id를 enrollment id로 사용
        class_id: cls.id, // classes의 id도 함께 저장
        subject: cls.subject,
        teacher_id: cls.teacher_id,
        teacher_profile: {
          user_id: teacherProfile?.user_id,
          name: teacherProfile?.name,
          email: teacherProfile?.email,
          phone: teacherProfile?.phone,
        },
        room_id: cls.room_id,
        room_name: roomProfile ? roomProfile.name : '',
        day_of_week: cls.day_of_week,
        lesson_time: cls.start_time,
        lesson_duration: cls.duration,
        status: cls.status,
        created_at: cls.created_at,
        start_date: cls.date,
        end_time: cls.end_time,
        teacher: cls.teacher,
      }
    }).filter(Boolean)

    return NextResponse.json({
      success: true,
      enrollments,
      teachers: teacherProfiles,
      rooms: roomProfiles
    })
  } catch (error) {
    console.error('학생 수업 정보 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 