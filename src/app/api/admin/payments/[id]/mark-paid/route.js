import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hideAttendanceRecords, showAttendanceRecords } from '../../../../../../lib/attendance-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request, { params }) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { attendanceCount } = body; // 결제할 출석 횟수

    if (!attendanceCount || attendanceCount <= 0) {
      return NextResponse.json({ error: '결제할 출석 횟수를 입력해주세요.' }, { status: 400 });
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

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 현재 결제 정보 조회
    const { data: currentPayment, error: fetchError } = await supabase
      .from('class_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentPayment) {
      return NextResponse.json({ error: '결제 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 출석 횟수 검증
    if (attendanceCount > currentPayment.attendance_count) {
      return NextResponse.json({ 
        error: `결제할 출석 횟수(${attendanceCount}회)가 현재 출석 횟수(${currentPayment.attendance_count}회)를 초과합니다.` 
      }, { status: 400 });
    }

    // 출석 카운트 차감 후 남은 횟수 계산
    const remainingCount = currentPayment.attendance_count - attendanceCount;

    // class_paid 테이블에 결제 기록 추가
    const { data: paidRecord, error: paidError } = await supabase
      .from('class_paid')
      .insert({
        class_payment_id: id,
        student_id: currentPayment.student_id,
        class_id: currentPayment.class_id,
        payment_amount: attendanceCount,
        payment_notes: `${attendanceCount}회분 결제 (${new Date().toLocaleDateString('ko-KR')})`
      })
      .select()
      .single();

    if (paidError) {
      console.error('Error creating paid record:', paidError);
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 });
    }

    // class_payments 테이블 업데이트 (attendance_count는 그대로 유지, notes만 업데이트)
    const { data, error } = await supabase
      .from('class_payments')
      .update({
        notes: `결제 완료: ${attendanceCount}회분 결제 (${new Date().toLocaleDateString('ko-KR')})`,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment record:', error);
      return NextResponse.json({ error: 'Failed to update payment record' }, { status: 500 });
    }

    // 결제 완료 시 해당 학생의 출석 기록에서 가장 날짜가 빠른 것부터(미결제 대상만) 결제된 횟수만큼 숨김 처리
    try {
      // 해당 학생의 출석 기록을 날짜순으로 조회 (가장 빠른 날짜부터)
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('class_id', currentPayment.class_id)
        .eq('student_id', currentPayment.student_id)
        .eq('status', 'present')
        .eq('is_hidden', false)
        .order('attendance_date', { ascending: true }); // 날짜 오름차순 (가장 빠른 날짜부터)

      if (attendanceError) {
        console.error('Error fetching attendance records:', attendanceError);
        // 출석 기록 조회 실패해도 결제는 성공으로 처리
      } else if (attendanceRecords && attendanceRecords.length > 0) {
        // 결제된 횟수만큼 가장 빠른 날짜의 출석 기록들을 숨김 처리
        const recordsToHide = attendanceRecords.slice(0, attendanceCount);
        
        if (recordsToHide.length > 0) {
          const recordIds = recordsToHide.map(record => record.id);
          const reason = `결제 완료로 인한 숨김 처리 (${new Date().toLocaleDateString('ko-KR')})`;
          
          const { success, error: hideError } = await hideAttendanceRecords(recordIds, reason);
          
          if (!success && hideError) {
            console.error('Error hiding attendance records:', hideError);
            // 숨김 처리 실패해도 결제는 성공으로 처리
          }
        }
      }
    } catch (hideError) {
      console.error('Error in attendance hiding process:', hideError);
      // 숨김 처리 중 오류가 발생해도 결제는 성공으로 처리
    }

    // 결제 상태 즉시 갱신 시도 (실패해도 전체 흐름에는 영향 주지 않음)
    try {
      await supabase.rpc('update_payment_status');
    } catch (e) {
      console.error('update_payment_status RPC failed (non-blocking):', e);
    }

    return NextResponse.json({
      success: true,
      message: `${attendanceCount}회분 결제가 성공적으로 완료 처리되었습니다. (남은 출석: ${remainingCount}회)`,
      payment: data,
      paidCount: attendanceCount,
      remainingCount: remainingCount
    });

  } catch (error) {
    console.error('Mark payment as paid API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 결제 완료 취소
export async function DELETE(request, { params }) {
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

    // 현재 결제 정보 조회
    const { data: currentPayment, error: fetchError } = await supabase
      .from('class_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentPayment) {
      return NextResponse.json({ error: '결제 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // class_paid 테이블에서 결제 기록이 있는지 확인
    const { data: existingPaidRecords, error: paidCheckError } = await supabase
      .from('class_paid')
      .select('id')
      .eq('class_payment_id', id);

    if (paidCheckError) {
      console.error('Error checking paid records:', paidCheckError);
      return NextResponse.json({ error: '결제 기록 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }

    if (!existingPaidRecords || existingPaidRecords.length === 0) {
      return NextResponse.json({ error: '결제 완료 상태가 아닙니다.' }, { status: 400 });
    }

    // class_paid 테이블에서 가장 최근 결제 기록 조회
    const { data: paidRecords, error: paidFetchError } = await supabase
      .from('class_paid')
      .select('*')
      .eq('class_payment_id', id)
      .order('payment_date', { ascending: false })
      .limit(1);

    if (paidFetchError || !paidRecords || paidRecords.length === 0) {
      return NextResponse.json({ error: '결제 기록을 찾을 수 없습니다.' }, { status: 404 });
    }

    const latestPaidRecord = paidRecords[0];
    const paidCount = latestPaidRecord.payment_amount;
    const restoredCount = currentPayment.attendance_count + paidCount;

    // class_paid 테이블에서 해당 결제 기록 삭제
    const { error: deleteError } = await supabase
      .from('class_paid')
      .delete()
      .eq('id', latestPaidRecord.id);

    if (deleteError) {
      console.error('Error deleting paid record:', deleteError);
      return NextResponse.json({ error: 'Failed to delete payment record' }, { status: 500 });
    }

    // class_payments 테이블 업데이트 (attendance_count는 그대로 유지, notes만 업데이트)
    const { data, error } = await supabase
      .from('class_payments')
      .update({
        notes: `결제 취소: ${paidCount}회분 환불 (${new Date().toLocaleDateString('ko-KR')})`,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment record:', error);
      return NextResponse.json({ error: 'Failed to update payment record' }, { status: 500 });
    }

    // 결제 취소 시 숨겨진 출석 기록을 다시 보이게 처리
    try {
      // 해당 학생의 숨겨진 출석 기록을 날짜순으로 조회 (가장 빠른 날짜부터)
      const { data: hiddenRecords, error: hiddenError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('class_id', currentPayment.class_id)
        .eq('student_id', currentPayment.student_id)
        .eq('is_hidden', true)
        .eq('status', 'present')
        .ilike('hidden_reason', '%결제 완료로 인한 숨김 처리%')
        .order('attendance_date', { ascending: true }); // 날짜 오름차순 (가장 빠른 날짜부터)

      if (hiddenError) {
        console.error('Error fetching hidden attendance records:', hiddenError);
        // 숨겨진 출석 기록 조회 실패해도 결제 취소는 성공으로 처리
      } else if (hiddenRecords && hiddenRecords.length > 0) {
        // 환불된 횟수만큼 가장 빠른 날짜의 숨겨진 출석 기록들을 다시 보이게 처리
        const recordsToShow = hiddenRecords.slice(0, paidCount);
        
        if (recordsToShow.length > 0) {
          const recordIds = recordsToShow.map(record => record.id);
          
          const { success, error: showError } = await showAttendanceRecords(recordIds);
          
          if (!success && showError) {
            console.error('Error showing attendance records:', showError);
            // 보이게 처리 실패해도 결제 취소는 성공으로 처리
          }
        }
      }
    } catch (showError) {
      console.error('Error in attendance showing process:', showError);
      // 보이게 처리 중 오류가 발생해도 결제 취소는 성공으로 처리
    }

    // 결제 상태 즉시 갱신 시도 (실패해도 전체 흐름에는 영향 주지 않음)
    try {
      await supabase.rpc('update_payment_status');
    } catch (e) {
      console.error('update_payment_status RPC failed (non-blocking):', e);
    }

    return NextResponse.json({
      success: true,
      message: `${paidCount}회분 결제가 취소되었습니다. (복원된 출석: ${restoredCount}회)`,
      payment: data,
      canceledCount: paidCount,
      restoredCount: restoredCount
    });

  } catch (error) {
    console.error('Cancel payment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 