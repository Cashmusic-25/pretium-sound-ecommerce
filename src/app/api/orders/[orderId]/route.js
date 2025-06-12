// src/app/api/orders/[orderId]/route.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  try {
    const { orderId } = params;

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('주문 조회 오류:', error);
      return Response.json({ error: '주문 조회 실패' }, { status: 500 });
    }

    if (!data) {
      return Response.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 });
    }

    return Response.json({ order: data });
  } catch (error) {
    console.error('API 오류:', error);
    return Response.json({ error: '서버 오류' }, { status: 500 });
  }
}