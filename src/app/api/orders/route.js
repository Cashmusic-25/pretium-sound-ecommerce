// src/app/api/orders/route.js - 최종 Service Role 버전
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    console.log('🚀 주문 생성 API 시작');

    // 1. Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Authorization 헤더 없음');
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 토큰 추출 완료');

    // 2. 일반 클라이언트로 토큰 검증
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ 인증 실패:', authError);
      return Response.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 });
    }

    console.log('✅ 사용자 인증 성공:', user.email, user.id);

    // 3. 요청 데이터 파싱
    const requestBody = await request.json();
    const { orderId, userId, items, totalAmount, shippingAddress, status } = requestBody;
    
    console.log('📦 요청 데이터:', {
      orderId,
      userId,
      itemsCount: items?.length,
      totalAmount,
      status
    });

    // 4. 요청한 userId와 인증된 사용자가 일치하는지 확인
    if (userId !== user.id) {
      console.error('❌ 사용자 불일치:', { requested: userId, authenticated: user.id });
      return Response.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    // 5. Service Role로 주문 생성 (RLS 우회)
    console.log('💾 Service Role로 주문 생성 시작');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const orderData = {
      id: orderId,
      user_id: user.id, // 인증된 사용자 ID 사용
      items: items,
      total_amount: totalAmount,
      shipping_address: shippingAddress,
      status: status || 'pending'
    };

    console.log('💾 삽입할 주문 데이터:', orderData);

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (error) {
      console.error('❌ 주문 생성 오류:', error);
      return Response.json({ 
        error: '주문 생성 실패', 
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    console.log('✅ 주문 생성 성공:', data.id);
    return Response.json({ success: true, order: data });
    
  } catch (error) {
    console.error('❌ API 전체 오류:', error);
    return Response.json({ 
      error: '서버 오류', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    console.log('🔍 주문 조회 API 시작');

    // 1. Authorization 헤더 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // 2. 토큰으로 사용자 인증
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ 인증 실패:', authError);
      return Response.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 });
    }

    console.log('✅ 사용자 인증 성공:', user.email);

    // 3. Service Role로 해당 사용자의 주문만 조회
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('user_id', user.id) // 인증된 사용자의 주문만
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ 주문 조회 오류:', error);
      return Response.json({ error: '주문 조회 실패' }, { status: 500 });
    }

    console.log('✅ 주문 조회 성공:', data.length, '개');
    return Response.json({ orders: data });
    
  } catch (error) {
    console.error('❌ 조회 API 전체 오류:', error);
    return Response.json({ error: '서버 오류' }, { status: 500 });
  }
}