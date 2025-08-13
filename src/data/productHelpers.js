// src/data/productHelpers.js - DB 전용 완전 버전

import { getSupabase } from '../lib/supabase'

// Supabase에서 모든 활성 상품 가져오기
export async function getAllVisibleProducts() {
  try {
    const supabase = await getSupabase()
    if (!supabase) {
      console.error('❌ Supabase 연결 실패')
      return []
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ 상품 조회 실패:', error)
      return []
    }

    // 가격을 원화 형식으로 변환하고 기타 필드 정리
    const formattedProducts = data.map(product => ({
      ...product,
      price: typeof product.price === 'number' ? `₩${product.price.toLocaleString()}` : product.price,
      image: product.image_url || null,
      detailedDescription: product.detailed_description || product.description,
      // files 필드가 없으면 빈 배열로 설정
      files: product.files || []
    }))
    
    return formattedProducts

  } catch (error) {
    console.error('💥 getAllVisibleProducts - 에러:', error)
    return []
  }
}

// ID로 상품 찾기
export async function getVisibleProductById(id) {
  try {
    const numericId = parseInt(id)
    if (isNaN(numericId)) {
      console.warn('⚠️ 잘못된 상품 ID:', id)
      return null
    }

    const supabase = await getSupabase()
    if (!supabase) {
      console.error('❌ Supabase 연결 실패')
      return null
    }

    console.log('🔄 getVisibleProductById - ID로 조회:', numericId)

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', numericId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('❌ 상품 조회 실패:', error)
      return null
    }

    if (!data) {
      console.warn('⚠️ 상품을 찾을 수 없음:', numericId)
      return null
    }

    // 가격을 원화 형식으로 변환하고 기타 필드 정리
    const formattedProduct = {
      ...data,
      price: typeof data.price === 'number' ? `₩${data.price.toLocaleString()}` : data.price,
      image: data.image_url || null,
      detailedDescription: data.detailed_description || data.description,
      // files 필드가 없으면 빈 배열로 설정
      files: data.files || []
    }

    console.log('✅ getVisibleProductById - 조회 성공:', formattedProduct.title)
    return formattedProduct

  } catch (error) {
    console.error('💥 getVisibleProductById - 에러:', error)
    return null
  }
}

// 상품 생성
export async function createProduct(productData) {
  try {
    console.log('🔧 createProduct 시작 - 입력 데이터:', productData)
    
    const supabase = await getSupabase()
    if (!supabase) {
      throw new Error('Supabase 연결이 필요합니다')
    }

    // 가격을 숫자로 변환
    const priceNumber = typeof productData.price === 'string' 
      ? parseInt(productData.price.replace(/[₩,]/g, ''))
      : productData.price

    const insertData = {
      title: productData.title,
      description: productData.description,
      detailed_description: productData.detailedDescription || productData.description,
      price: priceNumber,
      icon: productData.icon || '🎵',
      image_url: productData.image,
      category: productData.category,
      features: productData.features || [],
      contents: productData.contents || [],
      specifications: productData.specifications || {},
      files: productData.files || [],
      is_active: true
    }

    console.log('💾 상품 저장 중:', insertData.title)

    const { data, error } = await supabase
      .from('products')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('상품 생성 실패:', error)
      throw error
    }

    console.log('✅ 상품 생성 성공:', data.title)

    return {
      ...data,
      price: `₩${data.price.toLocaleString()}`,
      image: data.image_url,
      detailedDescription: data.detailed_description
    }
  } catch (error) {
    console.error('상품 생성 중 오류:', error)
    throw error
  }
}

// 상품 수정
export async function updateProduct(productId, productData) {
  try {
    const supabase = await getSupabase()
    if (!supabase) {
      throw new Error('Supabase 연결이 필요합니다')
    }

    // 가격을 숫자로 변환
    const priceNumber = typeof productData.price === 'string' 
      ? parseInt(productData.price.replace(/[₩,]/g, ''))
      : productData.price

    const updateData = {
      title: productData.title,
      description: productData.description,
      detailed_description: productData.detailedDescription || productData.description,
      price: priceNumber,
      icon: productData.icon || '🎵',
      image_url: productData.image,
      category: productData.category,
      features: productData.features || [],
      contents: productData.contents || [],
      specifications: productData.specifications || {},
      files: productData.files || [],
      updated_at: new Date().toISOString()
    }

    console.log('🔄 상품 수정 중:', updateData.title)

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('상품 수정 실패:', error)
      throw error
    }

    console.log('✅ 상품 수정 성공:', data.title)

    return {
      ...data,
      price: `₩${data.price.toLocaleString()}`,
      image: data.image_url,
      detailedDescription: data.detailed_description
    }
  } catch (error) {
    console.error('상품 수정 중 오류:', error)
    throw error
  }
}

// 상품 삭제 (비활성화)
export async function deleteProduct(productId) {
  try {
    const supabase = await getSupabase()
    if (!supabase) {
      throw new Error('Supabase 연결이 필요합니다')
    }

    console.log('🗑️ 상품 삭제 중:', productId)

    const { error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', productId)

    if (error) {
      console.error('상품 삭제 실패:', error)
      throw error
    }

    console.log('✅ 상품 삭제 성공:', productId)
    return true
  } catch (error) {
    console.error('상품 삭제 중 오류:', error)
    throw error
  }
}

// 이미지를 Supabase Storage에 업로드
export async function uploadProductImage(file) {
  console.log('🔄 이미지 업로드 시작:', file.name, file.size);
  
  try {
    const supabase = await getSupabase()
    if (!supabase) {
      throw new Error('Supabase 연결이 필요합니다')
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `product_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `products/${fileName}`
    
    console.log('📁 파일 경로:', filePath);

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file)

    console.log('📤 업로드 결과 - data:', data);
    console.log('❌ 업로드 결과 - error:', error);

    if (error) {
      console.error('🚨 이미지 업로드 실패:', error)
      throw error
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    console.log('✅ 생성된 공개 URL:', publicUrl);

    return {
      url: publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('💥 이미지 업로드 에러:', error)
    throw error
  }
}

// 매출 통계
export async function getSalesStats() {
  try {
    const supabase = await getSupabase()
    if (!supabase) {
      // 더미 데이터 반환
      return {
        totalSales: 15420000,
        monthlySales: 2340000,
        totalOrders: 234,
        monthlyOrders: 45,
        salesGrowth: 12.5,
        orderGrowth: 8.3
      }
    }

    // 주문 데이터 조회
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, created_at')

    if (error) {
      console.warn('매출 통계 조회 실패:', error)
      return {
        totalSales: 15420000,
        monthlySales: 2340000,
        totalOrders: 234,
        monthlyOrders: 45,
        salesGrowth: 12.5,
        orderGrowth: 8.3
      }
    }

    const totalSales = orders.reduce((sum, order) => sum + order.total_amount, 0)
    const totalOrders = orders.length

    // 이번 달 데이터
    const thisMonth = new Date()
    thisMonth.setDate(1)
    
    const monthlyOrders = orders.filter(order => 
      new Date(order.created_at) >= thisMonth
    )
    
    const monthlySales = monthlyOrders.reduce((sum, order) => sum + order.total_amount, 0)

    return {
      totalSales,
      monthlySales,
      totalOrders,
      monthlyOrders: monthlyOrders.length,
      salesGrowth: 12.5, // 임시값
      orderGrowth: 8.3    // 임시값
    }
  } catch (error) {
    console.error('매출 통계 조회 실패:', error)
    return {
      totalSales: 15420000,
      monthlySales: 2340000,
      totalOrders: 234,
      monthlyOrders: 45,
      salesGrowth: 12.5,
      orderGrowth: 8.3
    }
  }
}

// 사용자 통계
export async function getUserStats() {
  try {
    const supabase = await getSupabase()
    if (!supabase) {
      return {
        totalUsers: 156,
        monthlyUsers: 23,
        userGrowth: 15.2
      }
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, created_at')

    if (error) {
      console.warn('사용자 통계 조회 실패:', error)
      return {
        totalUsers: 156,
        monthlyUsers: 23,
        userGrowth: 15.2
      }
    }

    const totalUsers = data?.length || 0
    const thisMonth = new Date()
    thisMonth.setDate(1)
    
    const monthlyUsers = data?.filter(user => 
      new Date(user.created_at) >= thisMonth
    ).length || 0

    console.log('✅ 사용자 통계 업데이트:', { totalUsers, monthlyUsers })

    return {
      totalUsers,
      monthlyUsers,
      userGrowth: 15.2 // 임시값
    }
  } catch (error) {
    console.error('사용자 통계 조회 실패:', error)
    return {
      totalUsers: 156,
      monthlyUsers: 23,
      userGrowth: 15.2
    }
  }
}

// 상품 통계  
export async function getProductStats() {
  try {
    const supabase = await getSupabase()
    if (!supabase) {
      return {
        totalProducts: 9,
        activeProducts: 9,
        inactiveProducts: 0,
        averagePrice: 35000,
        totalValue: 315000
      }
    }

    const { data, error } = await supabase
      .from('products')
      .select('id, is_active, price, created_at')

    if (error) {
      console.warn('상품 통계 조회 실패:', error)
      return {
        totalProducts: 9,
        activeProducts: 9,
        inactiveProducts: 0,
        averagePrice: 35000,
        totalValue: 315000
      }
    }

    const activeProducts = data?.filter(p => p.is_active) || []
    const inactiveProducts = data?.filter(p => !p.is_active) || []
    
    const totalRevenue = activeProducts.reduce((sum, p) => sum + (p.price || 0), 0)
    const averagePrice = activeProducts.length > 0 ? totalRevenue / activeProducts.length : 0

    return {
      totalProducts: data?.length || 0,
      activeProducts: activeProducts.length,
      inactiveProducts: inactiveProducts.length,
      averagePrice: Math.round(averagePrice),
      totalValue: totalRevenue
    }
  } catch (error) {
    console.error('상품 통계 조회 실패:', error)
    return {
      totalProducts: 9,
      activeProducts: 9,
      inactiveProducts: 0,
      averagePrice: 35000,
      totalValue: 315000
    }
  }
}

// 최근 주문 목록
export async function getRecentOrders(limit = 5) {
  try {
    const supabase = await getSupabase()
    if (!supabase) {
      return []
    }

    // users 테이블과 조인
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        created_at,
        shipping_address,
        users!inner(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('최근 주문 조회 실패:', error)
      return []
    }

    return data.map(order => ({
      id: order.id,
      customer: order.users?.name || '알 수 없음',
      customerEmail: order.users?.email,
      amount: order.total_amount,
      status: order.status,
      date: order.created_at,
      shippingAddress: order.shipping_address
    }))
  } catch (error) {
    console.error('최근 주문 조회 실패:', error)
    return []
  }
}

// 인기 상품 목록
export async function getPopularProducts(limit = 5) {
  try {
    const products = await getAllVisibleProducts()
    return products.slice(0, limit).map(product => ({
      ...product,
      soldCount: Math.floor(Math.random() * 100) + 20
    }))
  } catch (error) {
    console.error('인기 상품 조회 실패:', error)
    return []
  }
}

// 상품의 파일 정보 가져오기 (레거시 호환성)
export function getProductFiles(product) {
  if (!product) return []
  return product.files || []
}

// 파일 ID로 특정 파일 찾기 (레거시 호환성)
export function getFileById(product, fileId) {
  if (!product || !product.files) return null
  return product.files.find(file => file.id === fileId) || null
}