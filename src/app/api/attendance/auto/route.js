import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { classId, date } = body;

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
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

    // 자동 출석 처리 실행
    const { data, error } = await supabase
      .rpc('auto_mark_attendance_for_class', {
        p_class_id: classId,
        p_date: date || new Date().toISOString().split('T')[0]
      });

    if (error) {
      console.error('Error auto-marking attendance:', error);
      return NextResponse.json({ error: 'Failed to auto-mark attendance' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Auto attendance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 수동으로 자동 출석 처리 실행 (관리자용)
export async function GET(request) {
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

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 수동으로 일일 자동 출석 처리 실행
    const { data, error } = await supabase
      .rpc('trigger_daily_auto_attendance');

    if (error) {
      console.error('Error auto-marking attendance:', error);
      return NextResponse.json({ error: 'Failed to auto-mark attendance' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Daily auto-attendance processing completed manually',
      currentTime: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Auto attendance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 