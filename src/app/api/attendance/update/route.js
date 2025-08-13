import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { classId, studentId, status, date, notes } = body;

    if (!classId || !studentId || !status) {
      return NextResponse.json({
        error: 'Class ID, student ID, and status are required'
      }, { status: 400 });
    }

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

    const { data, error } = await supabase
      .rpc('update_student_attendance', {
        p_class_id: classId,
        p_student_id: studentId,
        p_status: status,
        p_date: date || new Date().toISOString().split('T')[0],
        p_notes: notes
      });

    if (error) {
      console.error('Error updating attendance:', error);
      return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Update attendance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 