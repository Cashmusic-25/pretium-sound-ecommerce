'use client'

import ProductCard from './ProductCard'
import SearchFilterBar from './SearchFilterBar'
import { useFilter } from '../contexts/FilterContext'

export default function ProductGrid() {
  const { filteredProducts } = useFilter()

  return (
    <section id="products" className="mb-16">
      <h2 className="text-4xl font-bold text-center mb-8 gradient-text">
        인기 음악 교재
      </h2>
      
      {/* 검색/필터 바 */}
      <SearchFilterBar />
      
      {/* 상품 그리드 */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">검색 결과가 없습니다</h3>
          <p className="text-gray-600 mb-6">다른 검색어나 필터를 시도해보세요.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-600 transition-all"
          >
            전체 교재 보기
          </button>
        </div>
      )}
    </section>
  )
}