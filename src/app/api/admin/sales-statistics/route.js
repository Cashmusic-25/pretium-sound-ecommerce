// src/app/api/admin/sales-statistics/route.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
  try {
    console.log('📊 교재별 매출 통계 API 시작');

    if (!supabaseServiceKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY 미설정');
      return Response.json({ error: '서버 설정 오류(SERVICE_ROLE_KEY 없음). 환경변수를 설정해주세요.' }, { status: 500 });
    }

    // 1. Authorization 헤더 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // 2. 사용자 인증 및 관리자 권한 확인
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ 인증 실패:', authError);
      return Response.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 });
    }

    // 관리자 권한 확인: 허용 이메일 또는 메타데이터 role=admin
    const adminEmails = new Set(['admin@pretiumsound.com', 'jasonincompany@gmail.com']);
    const isAdmin = adminEmails.has(user.email) || user.user_metadata?.role === 'admin';
    if (!isAdmin) {
      return Response.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    console.log('✅ 관리자 인증 성공:', user.email);

    // 3. URL 파라미터 파싱
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange') || '30days';
    const period = url.searchParams.get('period'); // e.g., month:2025-12, quarter:2025-Q4
    const sortBy = url.searchParams.get('sortBy') || 'revenue';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    // 4. 날짜 범위 계산
    const now = new Date();
    let startDate = new Date();
    
    if (period) {
      const [kind, value] = period.split(':');
      if (kind === 'month') {
        const [y, m] = value.split('-').map(Number);
        startDate = new Date(y, m - 1, 1);
        const end = new Date(y, m, 1);
        now.setTime(end.getTime());
      } else if (kind === 'quarter') {
        const [y, qStr] = value.split('-');
        const yNum = Number(y);
        const q = Number(qStr?.replace('Q',''));
        const startMonth = (q - 1) * 3; // 0,3,6,9
        startDate = new Date(yNum, startMonth, 1);
        const end = new Date(yNum, startMonth + 3, 1);
        now.setTime(end.getTime());
      }
    } else switch (timeRange) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date('2020-01-01'); // 충분히 과거 날짜
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    console.log(`📅 분석 기간: ${startDate.toISOString()} ~ ${now.toISOString()}`);

    // 5. Service Role로 주문 데이터 조회
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())
      .in('status', ['processing', 'delivered']); // 결제 완료된 주문만 (E-book)

    if (error) {
      console.error('❌ 주문 데이터 조회 실패:', error);
      return Response.json({ error: '데이터 조회 실패' }, { status: 500 });
    }

    console.log('✅ 주문 데이터 조회 성공:', orders.length, '개');

    // 6. 교재별 매출 통계 계산
    const productStats = new Map();

    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productId = item.id;
          const productTitle = item.title;
          const quantity = item.quantity || 1;
          const price = parseFloat(item.price?.toString().replace(/[₩,원]/g, '')) || 0;
          const revenue = price * quantity;

          if (productStats.has(productId)) {
            const existing = productStats.get(productId);
            existing.totalQuantity += quantity;
            existing.totalRevenue += revenue;
            existing.orderCount += 1;
          } else {
            productStats.set(productId, {
              productId,
              productTitle,
              totalQuantity: quantity,
              totalRevenue: revenue,
              orderCount: 1,
              averagePrice: price,
              category: item.category || '미분류'
            });
          }
        });
      }
    });

    // 7. 통계 데이터를 배열로 변환
    let statistics = Array.from(productStats.values());

    // 8. 정렬
    statistics.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'revenue':
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        case 'quantity':
          aValue = a.totalQuantity;
          bValue = b.totalQuantity;
          break;
        case 'orders':
          aValue = a.orderCount;
          bValue = b.orderCount;
          break;
        case 'title':
          aValue = a.productTitle;
          bValue = b.productTitle;
          break;
        default:
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
      }

      if (sortBy === 'title') {
        return sortOrder === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
      }
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    // 9. 전체 요약 통계 계산
    const summary = {
      totalProducts: statistics.length,
      totalRevenue: statistics.reduce((sum, stat) => sum + stat.totalRevenue, 0),
      totalQuantity: statistics.reduce((sum, stat) => sum + stat.totalQuantity, 0),
      totalOrders: orders.length,
      averageOrderValue: orders.length > 0 ? statistics.reduce((sum, stat) => sum + stat.totalRevenue, 0) / orders.length : 0,
      timeRange,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString()
      }
    };

    console.log('✅ 교재별 매출 통계 생성 완료:', statistics.length, '개 상품');

    return Response.json({
      success: true,
      statistics,
      summary
    });

  } catch (error) {
    console.error('❌ 매출 통계 API 오류:', error);
    return Response.json({ 
      error: '서버 오류가 발생했습니다',
      details: error.message 
    }, { status: 500 });
  }
}