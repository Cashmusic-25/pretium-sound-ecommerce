// 상품 헬퍼 함수들 (숨겨진 상품 처리)
import { products } from './products'

// localStorage 안전 접근 함수
function safeGetFromLocalStorage(key, defaultValue = '[]') {
  if (typeof window === 'undefined') return JSON.parse(defaultValue)
  
  try {
    return JSON.parse(localStorage.getItem(key) || defaultValue)
  } catch (error) {
    console.warn(`Failed to parse localStorage item "${key}":`, error)
    return JSON.parse(defaultValue)
  }
}

// 모든 보이는 상품 가져오기 (숨겨진 상품 제외 + 오버라이드 적용)
export function getVisibleProducts() {
  if (typeof window === 'undefined') return products
  
  const savedProducts = safeGetFromLocalStorage('adminProducts', '[]')
  const productOverrides = safeGetFromLocalStorage('productOverrides', '{}')
  const hiddenProducts = safeGetFromLocalStorage('hiddenProducts', '[]')
  
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
  // 서버사이드에서는 기본 products에서만 찾기
  if (typeof window === 'undefined') {
    return products.find(product => product.id === parseInt(id)) || null
  }
  
  const visibleProducts = getVisibleProducts()
  return visibleProducts.find(product => product.id === parseInt(id)) || null
}

// 관리자용: 숨겨진 상품도 포함한 모든 상품 가져오기
export function getAllProductsForAdmin() {
  if (typeof window === 'undefined') return products
  
  const savedProducts = safeGetFromLocalStorage('adminProducts', '[]')
  const productOverrides = safeGetFromLocalStorage('productOverrides', '{}')
  
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

// 카테고리별 보이는 상품 가져오기
export function getVisibleProductsByCategory(category) {
  const visibleProducts = getVisibleProducts()
  return visibleProducts.filter(product => 
    product.category?.toLowerCase().includes(category.toLowerCase())
  )
}

// 검색으로 보이는 상품 찾기
export function searchVisibleProducts(query) {
  const visibleProducts = getVisibleProducts()
  const searchTerm = query.toLowerCase()
  return visibleProducts.filter(product =>
    product.title?.toLowerCase().includes(searchTerm) ||
    product.description?.toLowerCase().includes(searchTerm) ||
    product.category?.toLowerCase().includes(searchTerm)
  )
}