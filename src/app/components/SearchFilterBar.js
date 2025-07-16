'use client'

import { useState, useEffect } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { useFilter } from '../contexts/FilterContext'

export default function SearchFilterBar() {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [allProducts, setAllProducts] = useState([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  
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
    isClient
  } = useFilter()

  // Supabase에서 모든 상품 데이터 로드
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { getSupabase } = await import('../../lib/supabase')
        const supabase = getSupabase()
        
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('id', { ascending: true })
        
        if (error) throw error
        
        setAllProducts(data || [])
      } catch (error) {
        console.error('상품 로딩 실패:', error)
        // 에러 시 빈 배열로 설정
        setAllProducts([])
      } finally {
        setIsLoadingProducts(false)
      }
    }

    if (isClient) {
      loadProducts()
    }
  }, [isClient])

  // 동적 카테고리 라벨 생성 함수
  const getCategoryLabel = (category) => {
    const defaultLabels = {
      'all': '전체',
      '피아노': '피아노',
      '기타': '기타', 
      '보컬': '보컬',
      '드럼': '드럼',
      '바이올린': '바이올린',
      '음악이론': '음악이론'
    }
    
    // 기본 라벨이 있으면 사용, 없으면 카테고리명 그대로 사용
    return defaultLabels[category] || category
  }

  // 카테고리별 상품 개수 계산 함수
  const getCategoryCount = (category) => {
    if (!isClient || isLoadingProducts || !allProducts.length) {
      return 0
    }
    
    if (category === 'all') {
      return allProducts.length
    }
    
    return allProducts.filter(product => product.category === category).length
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
    newRange[index] = parseInt(value) || 0
    setPriceRange(newRange)
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  // 필터가 활성화되어 있는지 확인
  const hasActiveFilters = selectedCategory !== 'all' || 
                          priceRange[0] > 0 || 
                          priceRange[1] < 100000 || 
                          searchTerm.trim() !== '' || 
                          sortBy !== 'default'

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
            isFilterOpen || hasActiveFilters
              ? 'bg-indigo-500 text-white'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal size={20} />
          <span>필터</span>
          {hasActiveFilters && !isFilterOpen && (
            <span className="ml-1 w-2 h-2 bg-white rounded-full"></span>
          )}
        </button>
      </div>

      {/* 결과 개수 표시 */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <span>
          {isClient && !isLoadingProducts ? (
            `총 ${totalProducts}개 중 ${filteredCount}개 교재`
          ) : (
            '교재 로딩 중...'
          )}
        </span>
        
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1"
          >
            <X size={16} />
            <span>필터 초기화</span>
          </button>
        )}
      </div>

      {/* 활성 필터 표시 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200">
          {searchTerm && (
            <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
              검색: "{searchTerm}"
              <button
                onClick={() => setSearchTerm('')}
                className="ml-2 text-indigo-600 hover:text-indigo-800"
              >
                <X size={14} />
              </button>
            </span>
          )}
          
          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
              카테고리: {getCategoryLabel(selectedCategory)}
              <button
                onClick={() => setSelectedCategory('all')}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                <X size={14} />
              </button>
            </span>
          )}
          
          {(priceRange[0] > 0 || priceRange[1] < 100000) && (
            <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
              가격: ₩{formatPrice(priceRange[0])} ~ ₩{formatPrice(priceRange[1])}
              <button
                onClick={() => setPriceRange([0, 100000])}
                className="ml-2 text-orange-600 hover:text-orange-800"
              >
                <X size={14} />
              </button>
            </span>
          )}
          
          {sortBy !== 'default' && (
            <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
              정렬: {sortOptions.find(opt => opt.value === sortBy)?.label}
              <button
                onClick={() => setSortBy('default')}
                className="ml-2 text-purple-600 hover:text-purple-800"
              >
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* 고급 필터 패널 */}
      {isFilterOpen && (
        <div className="border-t border-gray-200 pt-6 space-y-6">
          {/* 카테고리 필터 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">카테고리</h3>
            {isLoadingProducts ? (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                <span>카테고리 로딩 중...</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map(category => {
                  const categoryCount = getCategoryCount(category)
                  const categoryLabel = getCategoryLabel(category)
                  
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedCategory === category
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {categoryLabel}
                      {isClient && categoryCount > 0 && (
                        <span className="ml-2 text-xs opacity-75">
                          ({categoryCount})
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
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
                    placeholder="0"
                  />
                </div>
                <div className="text-gray-400 pt-6">~</div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">최대 가격</label>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => handlePriceChange(1, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    min="0"
                    step="1000"
                    placeholder="100000"
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

          {/* 필터 안내 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">💡 필터 사용 팁</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• 여러 필터를 조합해서 원하는 교재를 찾아보세요</li>
              <li>• 가격 범위는 직접 입력하거나 빠른 선택 버튼을 이용하세요</li>
              <li>• 검색어와 카테고리를 함께 사용하면 더 정확한 결과를 얻을 수 있어요</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}