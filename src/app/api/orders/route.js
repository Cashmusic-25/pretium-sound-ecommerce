// src/app/api/orders/route.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { orderId, userId, items, totalAmount, shippingAddress, status } = await request.json();
    
    console.log('📦 주문 생성 시도:', {
      orderId,
      userId,
      items: items?.length,
      totalAmount,
      status
    });

    // 주문 정보를 데이터베이스에 저장
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          id: orderId,
          user_id: userId,
          items: items,
          total_amount: totalAmount,
          shipping_address: shippingAddress,
          status: status || 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ 주문 생성 오류:', error);
      return Response.json({ error: '주문 생성 실패', details: error.message }, { status: 500 });
    }

    console.log('✅ 주문 생성 성공:', data.id);
    return Response.json({ success: true, order: data });
  } catch (error) {
    console.error('❌ API 오류:', error);
    return Response.json({ error: '서버 오류', details: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('주문 조회 오류:', error);
      return Response.json({ error: '주문 조회 실패' }, { status: 500 });
    }

    return Response.json({ orders: data });
  } catch (error) {
    console.error('API 오류:', error);
    return Response.json({ error: '서버 오류' }, { status: 500 });
  }
}