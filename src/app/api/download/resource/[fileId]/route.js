// src/app/api/download/resource/[fileId]/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
  try {
    const { fileId } = params
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    console.log('📥 자료 다운로드 요청:', { fileId, productId })

    // 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Supabase 토큰 검증
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ 토큰 검증 실패:', authError)
      return NextResponse.json(
        { error: '유효하지 않은 인증 토큰입니다.' },
        { status: 401 }
      )
    }

    // 사용자 권한 확인 (강사 또는 관리자인지 확인)
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      console.error('❌ 사용자 프로필 조회 실패:', profileError)
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 강사 또는 관리자 권한 확인
    const isTeacher = userProfile.role === 'teacher'
    const isAdmin = userProfile.role === 'admin' || user.email === 'admin@pretiumsound.com'

    if (!isTeacher && !isAdmin) {
      console.log('❌ 권한 없음 - 역할:', userProfile.role)
      return NextResponse.json(
        { error: '강사 또는 관리자만 자료를 다운로드할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 강사인 경우 승인 상태 확인
    if (isTeacher && !isAdmin) {
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('status')
        .eq('user_id', user.id)
        .single()

      if (teacherError || teacherData?.status !== 'approved') {
        console.log('❌ 강사 승인 상태 확인 실패:', teacherData?.status)
        return NextResponse.json(
          { error: '승인된 강사만 자료를 다운로드할 수 있습니다.' },
          { status: 403 }
        )
      }
    }

    // 데이터베이스에서 제품과 파일 정보 조회
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, title, category, files')
      .eq('id', parseInt(productId))
      .eq('is_active', true)
      .single()

    if (productError || !productData) {
      console.error('❌ 제품 정보 조회 실패:', productError)
      return NextResponse.json(
        { error: '요청한 자료를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // files 배열에서 해당 파일 찾기
    let targetFile = null
    if (productData.files && Array.isArray(productData.files)) {
      targetFile = productData.files.find(file => 
        file.id === fileId || 
        file.id === parseInt(fileId) ||
        String(file.id) === String(fileId)
      )
    }

    if (!targetFile) {
      console.error('❌ 파일 정보 없음:', { fileId, productId, availableFiles: productData.files })
      return NextResponse.json(
        { error: '요청한 파일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    console.log('✅ 파일 정보 확인:', {
      filename: targetFile.name || targetFile.filename,
      url: targetFile.url,
      productTitle: productData.title
    })

    // Supabase Storage URL에서 직접 파일 다운로드
    if (!targetFile.url) {
      return NextResponse.json(
        { error: '파일 URL이 없습니다.' },
        { status: 404 }
      )
    }

    try {
      // Supabase Storage에서 파일 가져오기
      const fileResponse = await fetch(targetFile.url)
      
      if (!fileResponse.ok) {
        throw new Error(`파일 다운로드 실패: ${fileResponse.status}`)
      }

      const fileBuffer = await fileResponse.arrayBuffer()
      
      // 파일명 설정
      const filename = targetFile.name || targetFile.filename || `${productData.title}.pdf`
      
      // MIME 타입 설정
      let mimeType = 'application/octet-stream'
      if (targetFile.type === 'pdf' || filename.toLowerCase().endsWith('.pdf')) {
        mimeType = 'application/pdf'
      }

      // 다운로드 로그 기록 (옵션)
      try {
        await supabase
          .from('download_logs')
          .insert({
            user_id: user.id,
            file_id: fileId,
            product_id: parseInt(productId),
            filename: filename,
            file_size: targetFile.size ? String(targetFile.size) : 'Unknown',
            downloaded_at: new Date().toISOString()
          })
      } catch (logError) {
        console.warn('⚠️ 다운로드 로그 기록 실패:', logError)
        // 로그 실패는 다운로드를 막지 않음
      }

      console.log('✅ 파일 다운로드 성공:', filename)

      // 파일 다운로드 응답
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          'Content-Length': fileBuffer.byteLength.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })

    } catch (fetchError) {
      console.error('❌ 파일 다운로드 실패:', fetchError)
      return NextResponse.json(
        { error: '파일 다운로드 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('💥 자료 다운로드 API 오류:', error)
    return NextResponse.json(
      { error: '파일 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}