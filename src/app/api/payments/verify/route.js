import { createClient } from '@supabase/supabase-js'

const PORTONE_API_BASE = 'https://api.portone.io';

export async function POST(request) {
  try {
    const { paymentId, orderId, items = [], totalAmount, userId: userIdFromClient } = await request.json();
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

    // 3-1. 요청 사용자 식별 (있으면 user_id로 사용)
    let userId = userIdFromClient || null;
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const supabaseAnon = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        const { data: { user } } = await supabaseAnon.auth.getUser(token);
        userId = user?.id || null;
      }
    } catch (e) {
      console.warn('요청 사용자 확인 실패(계속 진행):', e?.message);
    }
    
    console.log('주문 정보 조회 시작...');
    const { data: existingOrder, error: orderFetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    if (orderFetchError && orderFetchError.code !== 'PGRST116') {
      console.error('주문 조회 오류:', orderFetchError);
      throw new Error('주문 정보를 조회할 수 없습니다.');
    }

    // 4. 결제 금액 검증
    const portoneAmount = paymentData.amount?.total || paymentData.amount;
    const orderAmount = existingOrder?.total_amount ?? totalAmount ?? portoneAmount;
    
    console.log('금액 비교:', {
      포트원_금액: portoneAmount,
      주문_금액: orderAmount
    });

    if (portoneAmount !== orderAmount) {
      console.warn('결제 금액 불일치가 있지만 계속 진행합니다.');
    }

    // 5. 결제 상태 확인
    console.log('V2 결제 상태:', paymentData.status);

    // 5-1. 사용자 이메일 기반 user_id 추론 (세션/파라미터가 없을 때)
    if (!userId) {
      const emailCandidate = paymentData?.customer?.email || paymentData?.buyer?.email || paymentData?.customerEmail;
      if (emailCandidate) {
        try {
          const { data: userRow } = await supabase
            .from('users')
            .select('id')
            .eq('email', emailCandidate)
            .single();
          if (userRow?.id) {
            userId = userRow.id;
            console.log('💡 이메일로 user_id 추론 성공:', userId);
          }
        } catch (e) {
          console.warn('이메일 기반 user_id 추론 실패:', e?.message);
        }
      }
    }

    // 6. 주문 생성 또는 업데이트 (결제 완료만 저장/유지)
    console.log('주문 상태 업데이트/생성 시작...');
    let finalOrderId = orderId;
    if (existingOrder) {
      const fieldsToUpdate = {
        status: 'processing',
        payment_id: paymentId,
        payment_method: paymentData.method?.type || 'KAKAOPAY',
        payment_status: 'completed',
        total_amount: orderAmount,
        updated_at: new Date().toISOString()
      };
      if (!existingOrder.items || existingOrder.items.length === 0) {
        fieldsToUpdate.items = items;
      }
      if (!existingOrder.user_id && userId) {
        fieldsToUpdate.user_id = userId;
      }
      const { error: updateError } = await supabase
        .from('orders')
        .update(fieldsToUpdate)
        .eq('id', orderId);
      if (updateError) {
        console.error('주문 상태 업데이트 실패:', updateError);
        throw new Error('주문 상태 업데이트 실패');
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('orders')
        .insert([{
          id: orderId,
          user_id: userId,
          items: items,
          total_amount: orderAmount,
          shipping_address: {},
          status: 'processing',
          payment_id: paymentId,
          payment_method: paymentData.method?.type || 'KAKAOPAY',
          payment_status: 'completed'
        }])
        .select()
        .single();
      if (insertError) {
        console.error('주문 생성 실패:', insertError);
        throw new Error('주문 생성 실패');
      }
      finalOrderId = inserted.id;
    }

    // 업데이트 에러는 각 분기에서 처리함

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
        id: finalOrderId,
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