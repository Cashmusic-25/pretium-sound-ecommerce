'use client'

import { useState } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { useFilter } from '../contexts/FilterContext'

export default function CategoryTabs() {
  const [showSearch, setShowSearch] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
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
    filteredProducts,
    resetFilters,
    filteredCount,
    totalProducts,
    isClient,
    isLoading,
    products  // 전체 상품 배열 추가
  } = useFilter()

  // 카테고리별 아이콘 매핑 (실제 DB에 있는 카테고리만 표시)
  const categoryConfig = {
    'all': { icon: '🎵', label: '전체', color: 'bg-indigo-500' },
    '피아노': { icon: '🎹', label: '피아노', color: 'bg-blue-500' },
    '기타': { icon: '🎸', label: '기타', color: 'bg-green-500' },
    '드럼': { icon: '🥁', label: '드럼', color: 'bg-red-500' },
    '바이올린': { icon: '🎻', label: '바이올린', color: 'bg-purple-500' },
    '보컬': { icon: '🎤', label: '보컬', color: 'bg-pink-500' },
    '음악이론': { icon: '📚', label: '음악이론', color: 'bg-orange-500' },
    '작곡': { icon: '🎼', label: '작곡', color: 'bg-teal-500' },
    '편곡': { icon: '🎶', label: '편곡', color: 'bg-emerald-500' },
    '베이스': { icon: '🎸', label: '베이스', color: 'bg-gray-500' },
    '관악기': { icon: '🎺', label: '관악기', color: 'bg-yellow-500' },
    '현악기': { icon: '🎻', label: '현악기', color: 'bg-cyan-500' },
    '타악기': { icon: '🥁', label: '타악기', color: 'bg-stone-500' },
    '화성학': { icon: '🎼', label: '화성학', color: 'bg-violet-500' },
    '청음': { icon: '👂', label: '청음', color: 'bg-rose-500' }
  }

  // 기본 카테고리 설정 (아이콘이 없는 경우)
  const getDefaultCategoryConfig = (categoryName) => ({
    icon: '🎵',
    label: categoryName,
    color: 'bg-gray-500'
  })

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

  const hasActiveFilters = searchTerm || selectedCategory !== 'all' || priceRange[0] > 0 || priceRange[1] < 100000 || sortBy !== 'default'

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 w-28 bg-gray-200 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      {/* 메인 카테고리 탭들 */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {categories.map((category) => {
            const config = categoryConfig[category] || getDefaultCategoryConfig(category)
            const isActive = selectedCategory === category
            
            // 각 카테고리별 상품 개수 계산 (filteredProducts 기준)
            const categoryCount = category === 'all' 
              ? totalProducts 
              : filteredProducts.filter(product => product.category === category).length
            
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  flex items-center space-x-2 px-6 py-3 rounded-2xl font-semibold text-sm
                  transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg
                  ${isActive 
                    ? `${config.color} text-white shadow-lg` 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <span className="text-lg">{config.icon}</span>
                <span>{config.label}</span>
                {isClient && (
                  <span className={`
                    text-xs px-2 py-1 rounded-full font-medium
                    ${isActive ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-600'}
                  `}>
                    {category === 'all' ? totalProducts : 
                     products.filter(p => p.category === category).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 하단 컨트롤 바 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
          {/* 왼쪽: 결과 개수 */}
          <div className="text-sm text-gray-600">
            {isClient ? (
              <span className="font-medium">
                총 <span className="text-indigo-600 font-bold">{totalProducts}</span>개 중{' '}
                <span className="text-blue-600 font-bold">{filteredCount}</span>개 교재
              </span>
            ) : (
              <span>교재를 불러오는 중...</span>
            )}
          </div>

          {/* 오른쪽: 컨트롤 버튼들 */}
          <div className="flex items-center gap-3">
            {/* 검색 토글 */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${showSearch || searchTerm
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <Search size={16} />
              <span>검색</span>
            </button>

            {/* 정렬 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* 고급 필터 토글 */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${showAdvancedFilters || (priceRange[0] > 0 || priceRange[1] < 100000)
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <SlidersHorizontal size={16} />
              <span>필터</span>
            </button>

            {/* 초기화 버튼 */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all"
              >
                초기화
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 검색 바 (토글) */}
      {showSearch && (
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="교재 이름, 설명, 카테고리로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 고급 필터 패널 (토글) */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <SlidersHorizontal className="mr-2" size={20} />
            고급 필터
          </h3>
          
          {/* 가격 범위 필터 */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">가격 범위</h4>
            
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">최소 가격</label>
                <input
                  type="number"
                  value={priceRange[0]}
                  onChange={(e) => handlePriceChange(0, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  min="0"
                  step="1000"
                />
              </div>
              <div className="text-gray-400 pt-6">~</div>
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">최대 가격</label>
                <input
                  type="number"
                  value={priceRange[1]}
                  onChange={(e) => handlePriceChange(1, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
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
                  className={`
                    px-3 py-1 rounded-full text-xs font-medium transition-all
                    ${priceRange[0] === preset.range[0] && priceRange[1] === preset.range[1]
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}