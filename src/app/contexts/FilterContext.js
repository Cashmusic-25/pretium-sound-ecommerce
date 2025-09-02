'use client'

import { createContext, useContext, useState, useMemo, useEffect } from 'react'

const FilterContext = createContext()

export function FilterProvider({ children }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [priceRange, setPriceRange] = useState([0, 100000])
  const [sortBy, setSortBy] = useState('default')
  const [isClient, setIsClient] = useState(false)
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // 클라이언트 사이드 hydration 완료 체크
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Supabase에서 상품 데이터 로드 (모든 활성 상품)
  useEffect(() => {
    const loadProducts = async () => {
      if (!isClient) return
      
      try {
        setIsLoading(true)
        
        // console.debug('ProductGrid - 상품 데이터 로드 시작')
        
        // 동적 import를 사용하여 productHelpers 로드
        const { getAllVisibleProducts } = await import('../../data/productHelpers')
        const supabaseProducts = await getAllVisibleProducts()
        
        // console.debug('ProductGrid - 로드된 상품:', supabaseProducts.length)
        
        setProducts(supabaseProducts)
      } catch (error) {
        console.error('❌ ProductGrid - 상품 로드 실패:', error)
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [isClient])

  // 카테고리 목록 추출
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map(product => product.category))]
    // console.debug('사용 가능한 카테고리:', uniqueCategories)
    return ['all', ...uniqueCategories]
  }, [products])

  // 필터링된 상품 목록
  const filteredProducts = useMemo(() => {
    if (isLoading || !isClient) {
      return []
    }

    let filtered = [...products]

    // 검색어로 필터링
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 카테고리로 필터링
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    // 가격 범위로 필터링
    filtered = filtered.filter(product => {
      const price = typeof product.price === 'string' 
        ? parseInt(product.price.replace(/[₩,]/g, ''))
        : product.price
      return price >= priceRange[0] && price <= priceRange[1]
    })

    // 정렬
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => {
          const priceA = typeof a.price === 'string' 
            ? parseInt(a.price.replace(/[₩,]/g, ''))
            : a.price
          const priceB = typeof b.price === 'string'
            ? parseInt(b.price.replace(/[₩,]/g, ''))
            : b.price
          return priceA - priceB
        })
        break
      case 'price-high':
        filtered.sort((a, b) => {
          const priceA = typeof a.price === 'string'
            ? parseInt(a.price.replace(/[₩,]/g, ''))
            : a.price
          const priceB = typeof b.price === 'string'
            ? parseInt(b.price.replace(/[₩,]/g, ''))
            : b.price
          return priceB - priceA
        })
        break
      case 'name':
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'popular':
        // ID 역순으로 정렬 (최신순)
        filtered.sort((a, b) => b.id - a.id)
        break
      default:
        // 기본 순서 유지 (최신순)
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        break
    }

    // console.debug('필터링 결과:', filtered.length)

    return filtered
  }, [products, searchTerm, selectedCategory, priceRange, sortBy, isLoading, isClient])

  // 필터 초기화
  const resetFilters = () => {
    setSearchTerm('')
    setSelectedCategory('all')
    setPriceRange([0, 100000])
    setSortBy('default')
  }

  const value = {
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
    totalProducts: products.length,
    filteredCount: filteredProducts.length,
    isClient,
    isLoading,
    products  // 전체 상품 배열 추가
  }

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilter() {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useFilter는 FilterProvider 내부에서 사용되어야 합니다')
  }
  return context
}