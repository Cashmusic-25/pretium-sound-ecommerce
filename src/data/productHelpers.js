// src/data/productHelpers.js - 순수 함수만 포함

import { supabase } from '../lib/supabase'
import { products as staticProducts } from './products'

// 정적 데이터에서 활성 상품 가져오기 (폴백용)
function getStaticVisibleProducts() {
  return staticProducts.filter(product => product.visible !== false)
}

// 정적 데이터에서 ID로 상품 찾기 (폴백용)
function getStaticProductById(id) {
  const numericId = parseInt(id)
  if (isNaN(numericId)) return null
  
  return staticProducts.find(p => p.id === numericId && p.visible !== false) || null
}

// 이미지를 Supabase Storage에 업로드
export async function uploadProductImage(file) {
  console.log('🔄 이미지 업로드 시작:', file.name, file.size);
  
  try {
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

// 상품 생성
export async function createProduct(productData) {
  try {
    const priceNumber = typeof productData.price === 'string' 
      ? parseInt(productData.price.replace(/[₩,]/g, ''))
      : productData.price

    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          ...productData,
          price: priceNumber,
          is_active: true,
          created_at: new Date().toISOString(),
          image: productData.image
        }
      ])
      .select()
      .single()

    if (error) throw error

    return {
      ...data,
      price: data.price ? `₩${data.price.toLocaleString()}` : '₩0'
    }
  } catch (error) {
    console.error('Error creating product:', error)
    throw error
  }
}

// 매출 통계
export async function getSalesStats() {
  try {
    const totalSales = 15420000
    const monthlySales = 2340000
    const totalOrders = 234
    const monthlyOrders = 45

    return {
      totalSales,
      monthlySales,
      totalOrders,
      monthlyOrders,
      salesGrowth: 12.5,
      orderGrowth: 8.3
    }
  } catch (error) {
    console.error('매출 통계 조회 실패:', error)
    return {
      totalSales: 0,
      monthlySales: 0,
      totalOrders: 0,
      monthlyOrders: 0,
      salesGrowth: 0,
      orderGrowth: 0
    }
  }
}

// 사용자 통계
export async function getUserStats() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, created_at')

    if (error) {
      console.warn('사용자 통계 조회 실패, 더미 데이터 사용:', error)
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

    const lastMonth = new Date(thisMonth)
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    const lastMonthUsers = data?.filter(user => {
      const createdDate = new Date(user.created_at)
      return createdDate >= lastMonth && createdDate < thisMonth
    }).length || 0

    const userGrowth = lastMonthUsers > 0 
      ? ((monthlyUsers - lastMonthUsers) / lastMonthUsers) * 100 
      : 0

    return {
      totalUsers,
      monthlyUsers,
      userGrowth: Math.round(userGrowth * 10) / 10
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
    const { data, error } = await supabase
      .from('products')
      .select('id, is_active, price, created_at')

    if (error) {
      console.warn('상품 통계 조회 실패, 정적 데이터 사용:', error)
      const staticProducts = getStaticVisibleProducts()
      return {
        totalProducts: staticProducts.length,
        activeProducts: staticProducts.length,
        inactiveProducts: 0,
        averagePrice: 45000,
        totalValue: staticProducts.length * 45000
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
    const staticProducts = getStaticVisibleProducts()
    return {
      totalProducts: staticProducts.length,
      activeProducts: staticProducts.length,
      inactiveProducts: 0,
      averagePrice: 45000,
      totalValue: staticProducts.length * 45000
    }
  }
}

// 리뷰 통계
export async function getReviewStats() {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, created_at')

    if (error) {
      console.warn('리뷰 통계 조회 실패, 더미 데이터 사용:', error)
      return {
        totalReviews: 89,
        monthlyReviews: 12,
        averageRating: 4.3,
        reviewGrowth: 25.5
      }
    }

    const totalReviews = data?.length || 0
    const thisMonth = new Date()
    thisMonth.setDate(1)
    
    const monthlyReviews = data?.filter(review => 
      new Date(review.created_at) >= thisMonth
    ).length || 0

    const averageRating = totalReviews > 0 
      ? data.reduce((sum, review) => sum + (review.rating || 0), 0) / totalReviews 
      : 0

    const lastMonth = new Date(thisMonth)
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    const lastMonthReviews = data?.filter(review => {
      const createdDate = new Date(review.created_at)
      return createdDate >= lastMonth && createdDate < thisMonth
    }).length || 0

    const reviewGrowth = lastMonthReviews > 0 
      ? ((monthlyReviews - lastMonthReviews) / lastMonthReviews) * 100 
      : 0

    return {
      totalReviews,
      monthlyReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewGrowth: Math.round(reviewGrowth * 10) / 10
    }
  } catch (error) {
    console.error('리뷰 통계 조회 실패:', error)
    return {
      totalReviews: 89,
      monthlyReviews: 12,
      averageRating: 4.3,
      reviewGrowth: 25.5
    }
  }
}

// 최근 주문 목록
export async function getRecentOrders(limit = 5) {
  try {
    return [
      {
        id: 1,
        customer: '김음악',
        product: '재즈 피아노 완전정복',
        amount: 45000,
        status: '완료',
        date: new Date().toISOString()
      },
      {
        id: 2,
        customer: '이기타',
        product: '어쿠스틱 기타 바이블',
        amount: 38000,
        status: '배송중',
        date: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 3,
        customer: '박보컬',
        product: '보컬 테크닉 마스터',
        amount: 42000,
        status: '완료',
        date: new Date(Date.now() - 172800000).toISOString()
      }
    ]
  } catch (error) {
    console.error('최근 주문 조회 실패:', error)
    return []
  }
}

// 인기 상품 목록
export async function getPopularProducts(limit = 5) {
  try {
    const products = getStaticVisibleProducts()
    return products.slice(0, limit).map(product => ({
      ...product,
      soldCount: Math.floor(Math.random() * 100) + 20
    }))
  } catch (error) {
    console.error('인기 상품 조회 실패:', error)
    return []
  }
}