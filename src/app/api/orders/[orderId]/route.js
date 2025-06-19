// src/app/api/orders/[orderId]/route.js - Service Role 버전
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request, { params }) {
  try {
    const { orderId } = params;
    console.log('🔍 단일 주문 조회 API 시작:', orderId);

    // 1. Authorization 헤더 확인
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

    // 3. Service Role로 주문 조회
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id) // 본인 주문만 조회 가능
      .single();

    if (error) {
      console.error('❌ 주문 조회 오류:', error);
      if (error.code === 'PGRST116') {
        return Response.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 });
      }
      return Response.json({ error: '주문 조회 실패' }, { status: 500 });
    }

    if (!data) {
      console.log('❌ 주문 없음 또는 권한 없음:', orderId);
      return Response.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 });
    }

    console.log('✅ 주문 조회 성공:', data.id);
    return Response.json({ order: data });
    
  } catch (error) {
    console.error('❌ API 전체 오류:', error);
    return Response.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { orderId } = params;
    console.log('🔄 주문 상태 업데이트 API 시작:', orderId);

    // 1. Authorization 헤더 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // 2. 토큰 검증
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ 인증 실패:', authError);
      return Response.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 });
    }

    // 3. 요청 데이터 파싱
    const { status } = await request.json();
    console.log('📦 상태 업데이트 데이터:', { orderId, status, userId: user.id });

    // 4. Service Role로 주문 상태 업데이트
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('user_id', user.id) // 본인 주문만 수정 가능
      .select()
      .single();

    if (error) {
      console.error('❌ 주문 상태 업데이트 오류:', error);
      return Response.json({ error: '주문 상태 업데이트 실패' }, { status: 500 });
    }

    if (!data) {
      return Response.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 });
    }

    console.log('✅ 주문 상태 업데이트 성공:', data.id, data.status);
    return Response.json({ success: true, order: data });
    
  } catch (error) {
    console.error('❌ 상태 업데이트 API 전체 오류:', error);
    return Response.json({ error: '서버 오류' }, { status: 500 });
  }
}