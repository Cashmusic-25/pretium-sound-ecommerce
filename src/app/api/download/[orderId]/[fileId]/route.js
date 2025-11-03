// src/app/api/download/[orderId]/[fileId]/route.js - 1년 기간 + 법적 조치 문구 추가
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request, { params }) {
  try {
    const { orderId, fileId } = await params;

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
      const { data: product, error: productError } = await supabaseAdmin
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
        const file = product.files.find(f => String(f.id) === String(fileId));
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

    // 7. 다운로드 이력 기록은 실제 파일명 확정 후 아래에서 수행

    // 8. Supabase Storage에서 signed URL 생성 (Service Role 필요)
    const originalPathCandidate = targetFile.filePath || targetFile.path || '';
    let derivedFromUrl = null;
    if (targetFile.url && typeof targetFile.url === 'string') {
      const m = targetFile.url.match(/\/storage\/v1\/object\/public\/ebooks\/(.+)$/);
      if (m && m[1]) {
        derivedFromUrl = m[1];
      }
    }

    const original = String(originalPathCandidate || derivedFromUrl || '').trim();
    console.log('☁️ Signed URL 생성 중 (원본 경로 후보):', { originalPathCandidate, derivedFromUrl, chosen: original });

    if (!original) {
      return NextResponse.json({ 
        error: '파일 경로가 등록되어 있지 않습니다. 관리자에게 문의해주세요.'
      }, { status: 500 });
    }

    const candidatePaths = new Set([ original ]);
    if (original.startsWith('ebooks/')) {
      candidatePaths.add(original.replace(/^ebooks\//, ''));
    }
    if (original.startsWith('/')) {
      candidatePaths.add(original.replace(/^\//, ''));
    }
    // 이중 접두어 방지: ebooks/ebooks/* 형태일 경우 한 번 제거
    if (original.startsWith('ebooks/ebooks/')) {
      candidatePaths.add(original.replace(/^ebooks\//, ''));
    }

    let signedUrlData = null;
    let lastError = null;
    let pathUsed = null;
    for (const path of candidatePaths) {
      console.log('☁️ Signed URL 시도 경로:', path);
      const { data, error } = await supabaseAdmin.storage
        .from('ebooks')
        .createSignedUrl(path, 3600);
      if (!error && data?.signedUrl) {
        signedUrlData = data;
        pathUsed = path;
        break;
      }
      lastError = error;
    }

    // Signed URL 실패 시 public URL 폴백 (ebooks 버킷이 public=true)
    if (!signedUrlData) {
      console.warn('⚠️ Signed URL 생성 실패, 공개 URL 폴백 시도:', lastError?.message);
      for (const path of candidatePaths) {
        const { data } = await supabaseAdmin.storage
          .from('ebooks')
          .getPublicUrl(path);
        if (data?.publicUrl) {
          signedUrlData = { signedUrl: data.publicUrl };
          break;
        }
      }
      if (!signedUrlData) {
        console.error('❌ 공개 URL 폴백도 실패 (모든 경로 시도):', lastError);
        return NextResponse.json({ 
          error: '다운로드 링크 생성에 실패했습니다: ' + (lastError?.message || 'Object not found') 
        }, { status: 500 });
      }
    }

    console.log('✅ 다운로드 링크 생성 성공');

    // 9. Supabase Storage 객체를 서비스 롤로 직접 프록시(우선)
    let fileResponse = null;
    const safeJoinPath = (p) => p.split('/').map(encodeURIComponent).join('/');
    if (pathUsed) {
      const objectUrl = `${supabaseUrl}/storage/v1/object/ebooks/${safeJoinPath(pathUsed)}`;
      try {
        fileResponse = await fetch(objectUrl, {
          headers: { Authorization: `Bearer ${supabaseServiceKey}` }
        });
      } catch (e) {
        console.warn('⚠️ 서비스 키 직접 다운로드 네트워크 오류, 서명 URL로 폴백:', e?.message);
        fileResponse = null;
      }
    }
    // 직접 프록시 실패 시 서명 URL로 폴백
    if (!fileResponse || !fileResponse.ok) {
      try {
        fileResponse = await fetch(signedUrlData.signedUrl);
      } catch (e2) {
        const msg = `파일 가져오기 실패(폴백 포함): ${e2?.message || 'unknown'}`;
        console.error('❌', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
      }
      if (!fileResponse.ok) {
        const msg = `파일 가져오기 실패: ${fileResponse.status} ${fileResponse.statusText}`;
        console.error('❌', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    const filenameRaw = targetFile.filename || targetFile.name || (pathUsed || original).split('/').pop() || 'download.pdf';
    const contentType = (targetFile.type === 'pdf' || filenameRaw.toLowerCase().endsWith('.pdf'))
      ? 'application/pdf'
      : (fileResponse.headers.get('content-type') || 'application/octet-stream');

    const encodedFilename = encodeURIComponent(filenameRaw).replace(/\(/g, '%28').replace(/\)/g, '%29');
    const extMatch = (filenameRaw.match(/\.[a-zA-Z0-9]+$/) || [])[0] || (contentType === 'application/pdf' ? '.pdf' : '');
    const asciiFallback = `download${extMatch || ''}`;
    const contentDisposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`;

    // 확정된 파일명으로 다운로드 이력 기록 (NULL 방지)
    await recordDownloadHistory(supabaseAdmin, user.id, orderId, fileId, filenameRaw);

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', contentDisposition);
    headers.set('Cache-Control', 'private, max-age=0, no-store');
    headers.set('X-Download-Remaining-Days', String(365 - daysDiff));
    headers.set('Access-Control-Expose-Headers', 'Content-Disposition, X-Download-Remaining-Days');

    return new Response(fileResponse.body, { headers });

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