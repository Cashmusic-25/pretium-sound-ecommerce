import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    // 강사 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 오늘의 자동 출석 처리 상태 조회 (현재 강사의 수업만)
    const todayDow = new Date().getDay();
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });

    // 현재 강사의 오늘 수업 목록
    const { data: todayClasses, error: classesError } = await supabase
      .from('classes')
      .select('id, title, start_time, duration, teacher_id')
      .eq('day_of_week', todayDow)
      .eq('status', 'active')
      .eq('teacher_id', user.id);

    if (classesError) {
      console.error('Error fetching today classes:', classesError);
      return NextResponse.json({ error: 'Failed to fetch today classes' }, { status: 500 });
    }

    // 이미 처리된 수업 목록
    const { data: processedClasses, error: processedError } = await supabase
      .from('classes')
      .select(`
        id, title, start_time,
        attendance_records!inner(created_at)
      `)
      .eq('day_of_week', todayDow)
      .eq('status', 'active')
      .eq('teacher_id', user.id)
      .eq('attendance_records.attendance_date', currentDate);

    if (processedError) {
      console.error('Error fetching processed classes:', processedError);
      return NextResponse.json({ error: 'Failed to fetch processed classes' }, { status: 500 });
    }

    // 아직 처리되지 않은 수업 목록
    let pendingClasses = [];
    if (processedClasses.length > 0) {
      const processedIds = processedClasses.map(c => c.id);
      const { data: pendingData, error: pendingError } = await supabase
        .from('classes')
        .select('id, title, start_time')
        .eq('day_of_week', todayDow)
        .eq('status', 'active')
        .eq('teacher_id', user.id)
        .not('id', 'in', `(${processedIds.join(',')})`);
      
      if (pendingError) {
        console.error('Error fetching pending classes:', pendingError);
        return NextResponse.json({ error: 'Failed to fetch pending classes' }, { status: 500 });
      }
      pendingClasses = pendingData || [];
    } else {
      // 처리된 수업이 없으면 모든 오늘 수업이 pending
      pendingClasses = todayClasses;
    }

    // 12시 이후인지 확인 (자동 처리 시간)
    const isAfterAutoTime = currentTime >= '12:00:00';

    const result = {
      date: currentDate,
      day_of_week: todayDow,
      current_time: currentTime,
      total_classes: todayClasses.length,
      processed_classes: processedClasses.map(c => ({
        id: c.id,
        title: c.title,
        start_time: c.start_time,
        processed_at: c.attendance_records[0]?.created_at
      })),
      pending_classes: pendingClasses,
      auto_attendance_enabled: true,
      auto_processed_time: '12:00',
      is_after_auto_time: isAfterAutoTime,
      next_auto_time: 'tomorrow 12:00'
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Attendance status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 