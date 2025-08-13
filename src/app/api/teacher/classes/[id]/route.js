import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  const { id } = params;

  try {
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'teacher') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data: classInfo, error } = await supabase
      .from('classes')
      .select(`
        *,
        rooms(name)
      `)
      .eq('id', id)
      .eq('teacher_id', user.id) // Ensure teacher owns the class
      .single();

    if (error) {
      console.error('Error fetching class:', error);
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    return NextResponse.json(classInfo);

  } catch (error) {
    console.error('Teacher class API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { id } = params;

  try {
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    // 강사 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'teacher') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 수업이 강사 소유인지 확인
    const { data: existingClass } = await supabase
      .from('classes')
      .select('id')
      .eq('id', id)
      .eq('teacher_id', user.id)
      .single();

    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found or access denied' }, { status: 404 });
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { title, subject, description, room_id, day_of_week, start_time, duration, student_names } = body;

    // 필수 필드 검증
    if (!title || !subject || !room_id || !day_of_week || !start_time || !duration) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    // 수업 정보 업데이트
    const { data: updatedClass, error: updateError } = await supabase
      .from('classes')
      .update({
        title,
        subject,
        description,
        room_id,
        day_of_week,
        start_time,
        duration,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('teacher_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating class:', updateError);
      return NextResponse.json({ error: '수업 업데이트 실패' }, { status: 500 });
    }

    // 학생 목록 업데이트 (기존 학생들 삭제 후 새로 추가)
    if (student_names && Array.isArray(student_names)) {
      // 기존 학생들 삭제
      await supabase
        .from('class_students')
        .delete()
        .eq('class_id', id);

      // 새 학생들 추가
      for (const studentName of student_names) {
        if (studentName.trim()) {
          // 학생 이름으로 user_profiles에서 user_id 찾기
          const { data: studentProfile } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('name', studentName.trim())
            .eq('role', 'student')
            .single();

          if (studentProfile) {
            await supabase
              .from('class_students')
              .insert({
                class_id: id,
                student_id: studentProfile.user_id
              });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '수업이 성공적으로 수정되었습니다.',
      class: updatedClass
    });

  } catch (error) {
    console.error('Update class API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 