// 상품 헬퍼 함수들 (Supabase 연동 + 정적 데이터 폴백)
import { supabase } from '../lib/supabase'
import { products as staticProducts } from './products'

// 정적 데이터에서 활성 상품 가져오기 (폴백용)
function getStaticVisibleProducts() {
  return staticProducts.filter(product => product.visible !== false)
}

// 정적 데이터에서 ID로 상품 찾기 (폴백용) - 수정된 버전
function getStaticProductById(id) {
  console.log('🔍 Searching for product ID:', id);
  console.log('📚 Available static products:', staticProducts.length);
  
  const numericId = parseInt(id)
  if (isNaN(numericId)) {
    console.log('❌ Invalid ID format:', id);
    return null
  }
  
  console.log('🔢 Looking for numeric ID:', numericId);
  console.log('📋 Available product IDs:', staticProducts.map(p => ({ id: p.id, title: p.title })));
  
  const product = staticProducts.find(p => p.id === numericId && p.visible !== false);
  
  if (!product) {
    console.log('❌ Product not found with ID:', numericId);
    return null;
  }
  
  console.log('✅ Found product:', product.title);
  return product;
}

// ID로 상품 찾기 - 임시로 정적 데이터만 사용
export async function getVisibleProductById(id) {
  console.log('🔍 Fetching product with ID:', id);
  
  // 임시로 Supabase 호출을 건너뛰고 바로 정적 데이터 사용
  try {
    const numericId = parseInt(id)
    if (isNaN(numericId)) {
      console.error('❌ Invalid product ID:', id)
      return null
    }

    console.log('📚 Using static data only (Supabase bypassed)');
    const staticProduct = getStaticProductById(id);
    
    if (staticProduct) {
      console.log('✅ Static product found:', staticProduct.title);
      return staticProduct;
    } else {
      console.log('❌ Static product not found for ID:', numericId);
      return null;
    }
    
  } catch (error) {
    console.error('🚨 Error in getVisibleProductById:', error);
    return null;
  }
}

// 나머지 함수들은 동일하게 유지...
// (모든 활성 상품 가져오기부터 마지막까지 기존 코드와 동일)