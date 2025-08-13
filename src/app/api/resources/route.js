// src/app/api/resources/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    console.log('📋 자료실 목록 요청')

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
      .select('role, status')
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
        { error: '강사 또는 관리자만 자료실에 접근할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 강사인 경우 승인 상태 확인
    if (isTeacher && !isAdmin) {
      if (userProfile.status !== 'approved') {
        console.log('❌ 강사 승인 상태 확인 실패:', userProfile.status)
        return NextResponse.json(
          { error: '승인된 강사만 자료실에 접근할 수 있습니다.' },
          { status: 403 }
        )
      }
    }

    // URL 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    const search = searchParams.get('search') || ''

    // 데이터베이스에서 교재와 파일 정보 조회 (최적화된 쿼리)
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, title, category, files')
      .eq('is_active', true)
      .not('files', 'is', null)
      .neq('files', '[]')
      .order('id')

    if (productsError) {
      console.error('❌ 교재 조회 실패:', productsError)
      return NextResponse.json(
        { error: '자료 목록을 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    console.log('📚 조회된 교재 수:', productsData?.length || 0)

    // 자료 데이터 변환 (files JSONB 컬럼에서 파일 정보 추출)
    const allResources = []
    
    productsData.forEach(product => {
      if (product.files && Array.isArray(product.files)) {
        product.files.forEach((file, index) => {
          // 파일 크기를 MB로 변환
          let fileSize = 'Unknown'
          if (file.size) {
            if (typeof file.size === 'number') {
              fileSize = `${(file.size / (1024 * 1024)).toFixed(1)}MB`
            } else if (typeof file.size === 'string') {
              fileSize = file.size
            }
          }

          allResources.push({
            id: `${product.id}_${file.id || index}`,
            productId: product.id,
            fileId: file.id || `file_${index}`,
            filename: file.name || file.filename || `${product.title}.pdf`,
            description: file.description || `${product.title} PDF 파일`,
            fileType: file.type || 'pdf',
            fileSize: fileSize,
            category: product.category,
            productTitle: product.title,
            downloadUrl: file.url, // Supabase Storage URL 직접 사용
            uploadDate: file.uploadedAt || new Date().toISOString()
          })
        })
      }
    })

    // 필터링 적용
    let filteredResources = allResources

    // 카테고리 필터
    if (category !== 'all') {
      filteredResources = filteredResources.filter(resource => 
        resource.category === category
      )
    }

    // 검색 필터
    if (search) {
      const searchLower = search.toLowerCase()
      filteredResources = filteredResources.filter(resource =>
        resource.filename.toLowerCase().includes(searchLower) ||
        resource.productTitle.toLowerCase().includes(searchLower) ||
        resource.description.toLowerCase().includes(searchLower)
      )
    }

    // 통계 정보 생성
    const stats = {
      total: allResources.length,
      filtered: filteredResources.length,
      byCategory: {},
      byType: {}
    }

    // 카테고리별 및 타입별 통계
    allResources.forEach(resource => {
      stats.byCategory[resource.category] = (stats.byCategory[resource.category] || 0) + 1
      stats.byType[resource.fileType] = (stats.byType[resource.fileType] || 0) + 1
    })

    console.log('✅ 자료실 목록 조회 성공:', {
      total: stats.total,
      filtered: stats.filtered,
      userId: user.id,
      userRole: userProfile.role
    })

    return NextResponse.json({
      success: true,
      resources: filteredResources,
      stats,
      user: {
        id: user.id,
        email: user.email,
        role: userProfile.role
      }
    })

  } catch (error) {
    console.error('💥 자료실 목록 API 오류:', error)
    return NextResponse.json(
      { error: '자료실 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}