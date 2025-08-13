import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAttendanceRecordsWithoutHidden, getAttendanceRecordsForPaidClass, getAllAttendanceRecords } from '../../../../../../lib/attendance-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  const { id } = await params;

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

    // 결제 정보 조회 (class_paid 정보 포함)
    const { data: payment, error: paymentError } = await supabase
      .from('class_payments')
      .select(`
        *,
        class_paid!class_paid_class_payment_id_fkey(
          id,
          payment_amount,
          payment_date,
          payment_notes
        )
      `)
      .eq('id', id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: '결제 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 결제 완료 정보 계산
    const paidRecords = payment.class_paid || [];
    const totalPaidAmount = paidRecords.reduce((sum, record) => sum + record.payment_amount, 0);
    const isPaid = paidRecords.length > 0;
    const lastPaymentDate = paidRecords.length > 0 
      ? Math.max(...paidRecords.map(r => new Date(r.payment_date).getTime()))
      : null;

    // 출석 기록 조회 로직 개선
    let attendanceRecords;
    let attendanceError;
    
    if (isPaid) {
      // 결제 완료된 수업: 모든 출석 기록 조회 (숨겨진 기록 포함)
      const result = await getAttendanceRecordsForPaidClass(
        payment.class_id,
        payment.student_id
      );
      attendanceRecords = result.data;
      attendanceError = result.error;
    } else if (payment.attendance_count < 4) {
      // 4회 미만 출석 목록: 모든 출석 기록 조회 (숨겨진 기록 포함)
      // 이는 관리자가 출석 현황을 정확히 파악할 수 있도록 하기 위함
      const result = await getAllAttendanceRecords(
        payment.class_id,
        payment.student_id
      );
      attendanceRecords = result.data;
      attendanceError = result.error;
    } else {
      // 4회 이상 미결제 수업: 숨겨진 기록 제외하고 조회
      const result = await getAttendanceRecordsWithoutHidden(
        payment.class_id,
        payment.student_id
      );
      attendanceRecords = result.data;
      attendanceError = result.error;
    }

    if (attendanceError) {
      console.error('Error fetching attendance records:', attendanceError);
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
    }

    // 출석 통계 계산
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(record => record.status === 'present').length;
    const absentCount = attendanceRecords.filter(record => record.status === 'absent').length;
    const lateCount = attendanceRecords.filter(record => record.status === 'late').length;
    const excusedCount = attendanceRecords.filter(record => record.status === 'excused').length;

    // 출석률 계산
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        class_id: payment.class_id,
        student_id: payment.student_id,
        attendance_count: payment.attendance_count,
        payment_status: isPaid ? 'paid' : payment.payment_status,
        last_attendance_date: payment.last_attendance_date,
        payment_completed_date: lastPaymentDate ? new Date(lastPaymentDate).toISOString() : null,
        notes: payment.notes,
        total_paid_amount: totalPaidAmount,
        paid_records: paidRecords,
        remaining_attendance: payment.attendance_count - totalPaidAmount
      },
      attendanceRecords: attendanceRecords.map(record => ({
        id: record.id,
        attendance_date: record.attendance_date,
        status: record.status,
        notes: record.notes,
        marked_at: record.marked_at,
        class_title: record.classes?.title || 'Unknown Class',
        is_hidden: record.is_hidden || false,
        hidden_reason: record.hidden_reason || null
      })),
      statistics: {
        totalRecords,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        attendanceRate
      }
    });

  } catch (error) {
    console.error('Attendance history API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 