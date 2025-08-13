import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  if (!classId) {
    return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
  }

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

    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data: attendance, error } = await supabase
      .rpc('get_class_attendance_status', {
        p_class_id: classId,
        p_date: date
      });

    if (error) {
      console.error('Error fetching attendance:', error);
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }

    const { data: summary } = await supabase
      .rpc('get_daily_attendance_summary', {
        p_class_id: classId,
        p_date: date
      });

    return NextResponse.json({
      attendance,
      summary,
      date
    });

  } catch (error) {
    console.error('Attendance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { classId, absentStudentIds, date, notes } = body;

    if (!classId || !absentStudentIds) {
      return NextResponse.json({ error: 'Class ID and absent student IDs are required' }, { status: 400 });
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
      .rpc('mark_absent_students', {
        p_class_id: classId,
        p_absent_student_ids: absentStudentIds,
        p_date: date || new Date().toISOString().split('T')[0],
        p_notes: notes
      });

    if (error) {
      console.error('Error marking attendance:', error);
      return NextResponse.json({ error: 'Failed to mark attendance' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Attendance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 