'use client'

import { useState } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { useFilter } from '../contexts/FilterContext'
import { products } from '../../data/products'

export default function SearchFilterBar() {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange,
    sortBy,
    setSortBy,
    categories,
    resetFilters,
    filteredCount,
    totalProducts,
    isClient // 클라이언트 상태 추가
  } = useFilter()

  const categoryLabels = {
    'all': '전체',
    '피아노': '피아노',
    '기타': '기타', 
    '보컬': '보컬',
    '드럼': '드럼',
    '바이올린': '바이올린',
    '음악이론': '음악이론'
  }

  const sortOptions = [
    { value: 'default', label: '기본순' },
    { value: 'popular', label: '인기순' },
    { value: 'price-low', label: '낮은 가격순' },
    { value: 'price-high', label: '높은 가격순' },
    { value: 'name', label: '이름순' }
  ]

  const handlePriceChange = (index, value) => {
    const newRange = [...priceRange]
    newRange[index] = parseInt(value)
    setPriceRange(newRange)
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      {/* 검색바와 기본 컨트롤 */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        {/* 검색 입력 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="교재 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* 정렬 */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white min-w-[140px]"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* 필터 토글 버튼 */}
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all min-w-[100px] justify-center ${
            isFilterOpen || selectedCategory !== 'all' || priceRange[0] > 0 || priceRange[1] < 100000
              ? 'bg-indigo-500 text-white'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal size={20} />
          <span>필터</span>
        </button>
      </div>

      {/* 결과 개수 표시 - 클라이언트에서만 렌더링 */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        {isClient ? (
          <span>
            총 {totalProducts}개 중 {filteredCount}개 교재
          </span>
        ) : (
          <span>
            총 {products.length}개 중 {products.length}개 교재
          </span>
        )}
        {(searchTerm || selectedCategory !== 'all' || priceRange[0] > 0 || priceRange[1] < 100000 || sortBy !== 'default') && (
          <button
            onClick={resetFilters}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* 고급 필터 패널 */}
      {isFilterOpen && (
        <div className="border-t border-gray-200 pt-6 space-y-6">
          {/* 카테고리 필터 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">카테고리</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {categoryLabels[category]}
                  {category !== 'all' && isClient && (
                    <span className="ml-2 text-xs opacity-75">
                      ({products.filter(p => p.category === category).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 가격 범위 필터 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">가격 범위</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">최소 가격</label>
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => handlePriceChange(0, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    min="0"
                    step="1000"
                  />
                </div>
                <div className="text-gray-400">~</div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">최대 가격</label>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => handlePriceChange(1, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>
              
              <div className="flex justify-between text-sm text-gray-600">
                <span>₩{formatPrice(priceRange[0])}</span>
                <span>₩{formatPrice(priceRange[1])}</span>
              </div>

              {/* 빠른 가격 선택 버튼 */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '전체', range: [0, 100000] },
                  { label: '3만원 이하', range: [0, 30000] },
                  { label: '3-4만원', range: [30000, 40000] },
                  { label: '4-5만원', range: [40000, 50000] },
                  { label: '5만원 이상', range: [50000, 100000] }
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setPriceRange(preset.range)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      priceRange[0] === preset.range[0] && priceRange[1] === preset.range[1]
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}