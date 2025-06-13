// src/app/api/download/[orderId]/[fileId]/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  try {
    const { orderId, fileId } = params;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    console.log('📥 다운로드 요청:', { orderId, fileId, userId });

    // 1. 사용자 인증 확인
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 2. 주문 정보 조회 및 소유권 확인
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)  // 본인 주문만 조회 가능
      .single();

    if (orderError || !order) {
      console.error('❌ 주문 조회 실패:', orderError);
      return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 });
    }

    console.log('✅ 주문 조회 성공:', order.id);

    // 3. 주문 상태 확인 (결제 완료된 주문만)
    if (order.status !== 'processing' && order.status !== 'delivered') {
      return NextResponse.json({ 
        error: '결제가 완료되지 않은 주문입니다' 
      }, { status: 403 });
    }

    // 4. 다운로드 기간 확인 (2주 제한)
    const orderDate = new Date(order.created_at);
    const now = new Date();
    const daysDiff = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 14) {
      return NextResponse.json({ 
        error: '다운로드 기간이 만료되었습니다. 고객센터에 문의해주세요.',
        expiredDays: daysDiff 
      }, { status: 403 });
    }

    console.log(`📅 다운로드 기간 확인: ${daysDiff}일 경과, ${14 - daysDiff}일 남음`);

    // 5. 주문한 상품에서 해당 파일이 포함되어 있는지 확인
    let targetFile = null;
    let productFound = false;

    for (const item of order.items) {
      console.log(`🔍 상품 ${item.id} 파일 조회 중...`);
      
      // 상품 정보를 데이터베이스에서 조회
      const { data: product, error: productError } = await supabase
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

    // 6. 다운로드 이력 기록
    await recordDownloadHistory(userId, orderId, fileId, targetFile.filename);

    // 7. Supabase Storage에서 signed URL 생성 (1시간 유효)
    console.log('☁️ Signed URL 생성 중:', targetFile.filePath);
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('ebooks')
      .createSignedUrl(targetFile.filePath, 3600); // 1시간 = 3600초

    if (signedUrlError) {
      console.error('❌ Signed URL 생성 실패:', signedUrlError);
      return NextResponse.json({ 
        error: '다운로드 링크 생성에 실패했습니다: ' + signedUrlError.message 
      }, { status: 500 });
    }

    console.log('✅ 다운로드 링크 생성 성공');

    // 8. 다운로드 정보 반환
    return NextResponse.json({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      filename: targetFile.filename,
      fileSize: targetFile.size,
      expiresIn: 3600, // 1시간
      remainingDays: 14 - daysDiff
    });

  } catch (error) {
    console.error('❌ 다운로드 API 오류:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다',
      details: error.message 
    }, { status: 500 });
  }
}

// 다운로드 이력 기록 함수
async function recordDownloadHistory(userId, orderId, fileId, filename) {
  try {
    console.log('📝 다운로드 이력 기록 중...');
    
    const { error } = await supabase
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