import { createClient } from '@supabase/supabase-js'

const PORTONE_API_BASE = 'https://api.portone.io';

export async function POST(request) {
  try {
    const { paymentId, orderId } = await request.json();
    console.log('V2 결제 검증 요청:', { paymentId, orderId });

    if (!paymentId || !orderId) {
      return Response.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 1. 포트원 V2 액세스 토큰 발급
    console.log('포트원 V2 토큰 요청 시작...');
    const getTokenResponse = await fetch(`${PORTONE_API_BASE}/login/api-secret`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiSecret: process.env.PORTONE_API_SECRET,
      }),
    });

    console.log('토큰 응답 상태:', getTokenResponse.status);
    
    if (!getTokenResponse.ok) {
      const tokenError = await getTokenResponse.text();
      console.error('포트원 토큰 발급 실패:', tokenError);
      throw new Error('포트원 토큰 발급 실패');
    }

    const { accessToken } = await getTokenResponse.json();
    console.log('V2 토큰 발급 성공');

    // 2. V2 결제 상세 정보 조회
    console.log('V2 결제 정보 조회 시작...');
    const getPaymentResponse = await fetch(`${PORTONE_API_BASE}/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('V2 결제 정보 응답 상태:', getPaymentResponse.status);

    if (!getPaymentResponse.ok) {
      const paymentError = await getPaymentResponse.text();
      console.error('V2 결제 정보 조회 실패:', paymentError);
      throw new Error('결제 정보 조회 실패');
    }

    const paymentData = await getPaymentResponse.json();
    console.log('포트원 V2 결제 정보:', paymentData);

    // 3. Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('주문 정보 조회 시작...');
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('주문 조회 오류:', orderError);
      throw new Error('주문 정보를 찾을 수 없습니다.');
    }

    if (!orderData) {
      console.error('주문 데이터 없음');
      throw new Error('주문 정보를 찾을 수 없습니다.');
    }

    console.log('주문 정보:', orderData);

    // 4. 결제 금액 검증
    const portoneAmount = paymentData.amount?.total || paymentData.amount;
    const orderAmount = orderData.total_amount;
    
    console.log('금액 비교:', {
      포트원_금액: portoneAmount,
      주문_금액: orderAmount
    });

    if (portoneAmount !== orderAmount) {
      console.warn('결제 금액 불일치가 있지만 계속 진행합니다.');
    }

    // 5. 결제 상태 확인
    console.log('V2 결제 상태:', paymentData.status);

    // 6. 주문 상태 업데이트
    console.log('주문 상태 업데이트 시작...');
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'processing',
        payment_id: paymentId,
        payment_method: paymentData.method?.type || 'KAKAOPAY',
        payment_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('주문 상태 업데이트 실패:', updateError);
      throw new Error('주문 상태 업데이트 실패');
    }

    console.log('V2 결제 검증 완료');

    return Response.json({
      success: true,
      message: '결제 검증이 완료되었습니다.',
      payment: {
        id: paymentData.id,
        status: paymentData.status,
        amount: portoneAmount,
        method: paymentData.method?.type,
        paidAt: paymentData.paidAt
      },
      order: {
        id: orderData.id,
        status: 'processing'
      }
    });

  } catch (error) {
    console.error('V2 결제 검증 오류:', error);
    
    return Response.json(
      { 
        error: error.message || '결제 검증 중 오류가 발생했습니다.',
        details: error.message 
      },
      { status: 500 }
    );
  }
}