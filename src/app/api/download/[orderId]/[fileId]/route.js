// src/app/api/download/[orderId]/[fileId]/route.js - 1년 기간 + 법적 조치 문구 추가
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request, { params }) {
  try {
    const { orderId, fileId } = params;

    console.log('📥 다운로드 요청:', { orderId, fileId });

    // 1. Authorization 헤더 확인
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Authorization 헤더 없음');
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 토큰 추출 완료');

    // 2. 일반 클라이언트로 토큰 검증
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ 인증 실패:', authError);
      return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 });
    }

    console.log('✅ 사용자 인증 성공:', user.email, user.id);

    // 3. Service Role로 주문 정보 조회
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id) // 본인 주문만 조회
      .single();

    if (orderError || !order) {
      console.error('❌ 주문 조회 실패:', orderError);
      return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 });
    }

    console.log('✅ 주문 조회 성공:', order.id);

    // 4. 주문 상태 확인 (결제 완료된 주문만)
    if (order.status !== 'processing' && order.status !== 'delivered') {
      return NextResponse.json({ 
        error: '결제가 완료되지 않은 주문입니다' 
      }, { status: 403 });
    }

    // 5. 다운로드 기간 확인 (1년 = 365일 제한)
    const orderDate = new Date(order.created_at);
    const now = new Date();
    const daysDiff = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 365) {
      return NextResponse.json({ 
        error: '다운로드 기간이 만료되었습니다. 고객센터에 문의해주세요.',
        expiredDays: daysDiff 
      }, { status: 403 });
    }

    console.log(`📅 다운로드 기간 확인: ${daysDiff}일 경과, ${365 - daysDiff}일 남음`);

    // 6. 주문한 상품에서 해당 파일이 포함되어 있는지 확인
    let targetFile = null;
    let productFound = false;

    for (const item of order.items) {
      console.log(`🔍 상품 ${item.id} 파일 조회 중...`);
      
      // 상품 정보를 데이터베이스에서 조회 (products 테이블은 RLS 비활성화됨)
      const { data: product, error: productError } = await supabaseClient
        .from('products')
        .select('files')
        .eq('id', item.id)
        .single();

      if (productError) {
        console.error(`❌ 상품 ${item.id} 조회 실패:`, productError);
        continue;
      }

      if (product && product.files && Array.isArray(product.files)) {
        console.log(`📁 상품 ${item.id} 파일 목록:`, product.files.map(f => f.id));
        
        // 파일 배열에서 해당 파일 찾기
        const file = product.files.find(f => f.id === fileId);
        if (file) {
          targetFile = file;
          productFound = true;
          console.log(`✅ 파일 찾음:`, file.filename);
          break;
        }
      }
    }

    if (!productFound || !targetFile) {
      console.error('❌ 파일을 찾을 수 없음:', { fileId, productFound, targetFile });
      return NextResponse.json({ 
        error: '해당 파일에 대한 다운로드 권한이 없습니다' 
      }, { status: 403 });
    }

    // 7. 다운로드 이력 기록 (Service Role 사용)
    await recordDownloadHistory(supabaseAdmin, user.id, orderId, fileId, targetFile.filename);

    // 8. Supabase Storage에서 signed URL 생성 (Service Role 필요)
    console.log('☁️ Signed URL 생성 중:', targetFile.filePath);
    
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('ebooks')
      .createSignedUrl(targetFile.filePath, 3600); // 1시간 = 3600초

    if (signedUrlError) {
      console.error('❌ Signed URL 생성 실패:', signedUrlError);
      return NextResponse.json({ 
        error: '다운로드 링크 생성에 실패했습니다: ' + signedUrlError.message 
      }, { status: 500 });
    }

    console.log('✅ 다운로드 링크 생성 성공');

    // 9. 다운로드 정보 반환 (법적 조치 문구 포함)
    return NextResponse.json({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      filename: targetFile.filename,
      fileSize: targetFile.size,
      expiresIn: 3600, // 1시간
      remainingDays: 365 - daysDiff,
      legalNotice: "⚠️ 저작권 보호 안내: 본 교재는 저작권법에 의해 보호받습니다. 무단 복제, 배포, 공유 시 법적 조치를 받을 수 있습니다."
    });

  } catch (error) {
    console.error('❌ 다운로드 API 오류:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다',
      details: error.message 
    }, { status: 500 });
  }
}

// 다운로드 이력 기록 함수 (Service Role 사용)
async function recordDownloadHistory(supabaseAdmin, userId, orderId, fileId, filename) {
  try {
    console.log('📝 다운로드 이력 기록 중...');
    
    const { error } = await supabaseAdmin
      .from('download_history')
      .insert([
        {
          user_id: userId,
          order_id: orderId,
          file_id: fileId,
          filename: filename,
          downloaded_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('⚠️ 다운로드 이력 기록 실패:', error);
      // 이력 기록 실패는 다운로드를 막지 않음
    } else {
      console.log('✅ 다운로드 이력 기록 완료');
    }
  } catch (error) {
    console.error('⚠️ 다운로드 이력 기록 중 오류:', error);
    // 이력 기록 실패는 다운로드를 막지 않음
  }
}