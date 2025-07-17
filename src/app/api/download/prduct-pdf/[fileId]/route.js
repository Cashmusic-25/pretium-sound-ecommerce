// src/app/api/download/product-pdf/[fileId]/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(request, { params }) {
  try {
    const { fileId } = params
    console.log('🔽 관리자 PDF 다운로드 요청:', fileId)

    // 1. Authorization 헤더 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Authorization 헤더 없음')
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('🔑 토큰 추출 완료')

    // 2. 일반 클라이언트로 토큰 검증
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ 인증 실패:', authError)
      return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 })
    }

    console.log('✅ 사용자 인증 성공:', user.email, user.id)

    // 3. Service Role로 관리자 권한 확인
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('❌ 관리자 권한 없음:', profileError || '권한 부족')
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    console.log('✅ 관리자 권한 확인 완료')

    // 4. 모든 상품에서 fileId에 해당하는 파일 찾기
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, title, files')
      .not('files', 'is', null)

    if (productsError) {
      console.error('❌ 상품 조회 실패:', productsError)
      return NextResponse.json({ error: '파일 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 5. 모든 상품에서 해당 fileId 찾기
    let targetFile = null
    let productTitle = ''

    for (const product of products) {
      if (product.files && Array.isArray(product.files)) {
        // 다양한 방식으로 파일 ID 매칭 시도
        const file = product.files.find(f => {
          return (
            (f.id && f.id.toString() === fileId) ||
            (f.path && f.path.includes(fileId)) ||
            (f.filePath && f.filePath.includes(fileId))
          )
        })
        
        if (file) {
          targetFile = file
          productTitle = product.title
          console.log(`✅ 파일 찾음 - 상품: ${productTitle}, 파일: ${file.filename || file.name}`)
          break
        }
      }
    }

    if (!targetFile) {
      console.error('❌ 파일을 찾을 수 없음:', fileId)
      return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })
    }

    // 6. 파일 경로 확인
    const filePath = targetFile.filePath || targetFile.path
    if (!filePath) {
      console.error('❌ 파일 경로 없음:', targetFile)
      return NextResponse.json({ error: '파일 경로 정보가 없습니다' }, { status: 404 })
    }

    console.log('📁 파일 경로:', filePath)

    // 7. Supabase Storage에서 signed URL 생성 (Service Role 사용)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('ebooks')
      .createSignedUrl(filePath, 3600) // 1시간 유효

    if (signedUrlError) {
      console.error('❌ Signed URL 생성 실패:', signedUrlError)
      return NextResponse.json({ 
        error: '다운로드 링크 생성에 실패했습니다: ' + signedUrlError.message 
      }, { status: 500 })
    }

    console.log('✅ 관리자 다운로드 링크 생성 성공')

    // 8. 다운로드 정보 반환
    return NextResponse.json({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      filename: targetFile.filename || targetFile.name || `${productTitle}.pdf`,
      fileSize: targetFile.size,
      expiresIn: 3600, // 1시간
      productTitle: productTitle
    })

  } catch (error) {
    console.error('💥 관리자 PDF 다운로드 API 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다',
      details: error.message 
    }, { status: 500 })
  }
}