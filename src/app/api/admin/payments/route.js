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

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 모든 결제 기록 조회 (class_payments와 class_paid 조인)
    const { data: payments, error } = await supabase
      .from('class_payments')
      .select(`
        *,
        classes(
          title,
          teacher,
          teacher_id
        ),
        user_profiles!class_payments_student_id_fkey(name),
        class_paid!class_paid_class_payment_id_fkey(
          id,
          payment_amount,
          payment_date,
          payment_notes
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }

    // 강사 정보 별도 조회
    const teacherIds = [...new Set(payments.map(p => p.classes?.teacher_id).filter(Boolean))];
    let teacherProfiles = {};
    
    if (teacherIds.length > 0) {
      const { data: teachers, error: teacherError } = await supabase
        .from('user_profiles')
        .select('user_id, name')
        .in('user_id', teacherIds);
      
      if (!teacherError && teachers) {
        teachers.forEach(teacher => {
          teacherProfiles[teacher.user_id] = teacher.name;
        });
      }
    }

    // 데이터 포맷팅 (기본 필드)
    const formattedPayments = payments.map(payment => {
      // class_paid 테이블에서 결제 완료 정보 확인
      const paidRecords = payment.class_paid || [];
      const totalPaidAmount = paidRecords.reduce((sum, record) => sum + record.payment_amount, 0);
      const remainingAttendance = payment.attendance_count - totalPaidAmount;
      const isFullyPaid = totalPaidAmount > 0 && remainingAttendance <= 0;
      const lastPaymentDate = paidRecords.length > 0 
        ? Math.max(...paidRecords.map(r => new Date(r.payment_date).getTime()))
        : null;
      
      // 실제 결제 상태 계산
      const actualPaymentStatus = isFullyPaid ? 'paid' : payment.payment_status;
      
      // 강사명 결정
      const teacherName = payment.classes?.teacher_id 
        ? (teacherProfiles[payment.classes.teacher_id] || payment.classes.teacher || 'Unknown Teacher')
        : (payment.classes?.teacher || 'Unknown Teacher');
      
      return {
        id: payment.id,
        class_id: payment.class_id,
        student_id: payment.student_id,
        payment_status: actualPaymentStatus,
        attendance_count: payment.attendance_count,
        last_attendance_date: payment.last_attendance_date,
        payment_completed_date: lastPaymentDate ? new Date(lastPaymentDate).toISOString() : null,
        notes: payment.notes,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        class_title: payment.classes?.title || 'Unknown Class',
        student_name: payment.user_profiles?.name || 'Unknown Student',
        teacher_name: teacherName,
        // 새로운 필드들
        total_paid_amount: totalPaidAmount,
        paid_records: paidRecords,
        remaining_attendance: payment.attendance_count - totalPaidAmount
      };
    });

    // 미결제 출석 수(unpaid_present_count) 계산: 총 present - 결제합계 (is_hidden에 의존하지 않음)
    try {
      const classIds = Array.from(new Set(formattedPayments.map(p => p.class_id).filter(Boolean)));
      const studentIds = Array.from(new Set(formattedPayments.map(p => p.student_id).filter(Boolean)));

      let presentMap = new Map();
      if (classIds.length > 0 && studentIds.length > 0) {
        const { data: ar } = await supabase
          .from('attendance_records')
          .select('class_id, student_id, status')
          .in('class_id', classIds)
          .in('student_id', studentIds)
          .eq('status', 'present');
        if (Array.isArray(ar)) {
          for (const row of ar) {
            const key = `${row.class_id}::${row.student_id}`;
            presentMap.set(key, (presentMap.get(key) || 0) + 1);
          }
        }
      }

      // 병합
      for (const p of formattedPayments) {
        const key = `${p.class_id}::${p.student_id}`;
        const totalPresent = presentMap.get(key) || 0;
        const totalPaid = p.total_paid_amount || 0;
        const unpaid = Math.max(totalPresent - totalPaid, 0);
        p.unpaid_present_count = unpaid;
        // remaining_attendance를 최신 계산값으로 보정
        p.remaining_attendance = unpaid;
      }
    } catch (e) {
      console.error('Failed to compute unpaid_present_count:', e);
      // 실패 시 0으로 채움
      for (const p of formattedPayments) {
        if (typeof p.unpaid_present_count !== 'number') p.unpaid_present_count = 0;
      }
    }

    // 캐시 방지 헤더 추가
    const response = NextResponse.json({ payments: formattedPayments });

    // 브라우저 캐시 방지
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    // 데이터가 항상 최신임을 보장
    response.headers.set('Last-Modified', new Date().toUTCString());
    response.headers.set('ETag', `"${Date.now()}"`);

    return response;

  } catch (error) {
    console.error('Payments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 