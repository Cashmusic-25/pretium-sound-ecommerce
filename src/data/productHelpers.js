// 상품 헬퍼 함수들 (숨겨진 상품 처리)

import { products } from '../../data/products'

// 모든 보이는 상품 가져오기 (숨겨진 상품 제외 + 오버라이드 적용)
export function getVisibleProducts() {
  if (typeof window === 'undefined') return products

  const savedProducts = JSON.parse(localStorage.getItem('adminProducts') || '[]')
  const productOverrides = JSON.parse(localStorage.getItem('productOverrides') || '{}')
  const hiddenProducts = JSON.parse(localStorage.getItem('hiddenProducts') || '[]')
  
  // 기본 상품에 오버라이드 적용하고 숨겨진 상품 제외
  const updatedBaseProducts = products
    .filter(product => !hiddenProducts.includes(product.id))
    .map(product => ({
      ...product,
      ...productOverrides[product.id]
    }))
  
  return [...updatedBaseProducts, ...savedProducts]
}

// ID로 보이는 상품 찾기 (숨겨진 상품은 null 반환)
export function getVisibleProductById(id) {
  const visibleProducts = getVisibleProducts()
  return visibleProducts.find(product => product.id === parseInt(id)) || null
}

// 관리자용: 숨겨진 상품도 포함한 모든 상품 가져오기
export function getAllProductsForAdmin() {
  if (typeof window === 'undefined') return products

  const savedProducts = JSON.parse(localStorage.getItem('adminProducts') || '[]')
  const productOverrides = JSON.parse(localStorage.getItem('productOverrides') || '{}')
  
  // 기본 상품에 오버라이드 적용 (숨겨진 상품도 포함)
  const updatedBaseProducts = products.map(product => ({
    ...product,
    ...productOverrides[product.id]
  }))
  
  return [...updatedBaseProducts, ...savedProducts]
}

// 관리자용: ID로 상품 찾기 (숨겨진 상품도 포함)
export function getProductByIdForAdmin(id) {
  const allProducts = getAllProductsForAdmin()
  return allProducts.find(product => product.id === parseInt(id)) || null
}