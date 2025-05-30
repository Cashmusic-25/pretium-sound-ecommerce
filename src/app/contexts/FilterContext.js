'use client'

import { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { products } from '../../data/products'

const FilterContext = createContext()

export function FilterProvider({ children }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [priceRange, setPriceRange] = useState([0, 100000])
  const [sortBy, setSortBy] = useState('default')
  const [isClient, setIsClient] = useState(false)

  // 클라이언트 사이드 hydration 완료 체크
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 실제 보이는 상품 목록 가져오기 (숨겨진 상품 제외 + 오버라이드 적용)
  const getVisibleProducts = useMemo(() => {
    // 서버 사이드에서는 기본 상품만 반환
    if (!isClient) {
      return products
    }

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
  }, [isClient])

  // 카테고리 목록 추출 (보이는 상품들로만)
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(getVisibleProducts.map(product => product.category))]
    return ['all', ...uniqueCategories]
  }, [getVisibleProducts])

  // 필터링된 상품 목록
  const filteredProducts = useMemo(() => {
    let filtered = [...getVisibleProducts]

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
      const price = parseInt(product.price.replace(/[₩,]/g, ''))
      return price >= priceRange[0] && price <= priceRange[1]
    })

    // 정렬
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => {
          const priceA = parseInt(a.price.replace(/[₩,]/g, ''))
          const priceB = parseInt(b.price.replace(/[₩,]/g, ''))
          return priceA - priceB
        })
        break
      case 'price-high':
        filtered.sort((a, b) => {
          const priceA = parseInt(a.price.replace(/[₩,]/g, ''))
          const priceB = parseInt(b.price.replace(/[₩,]/g, ''))
          return priceB - priceA
        })
        break
      case 'name':
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'popular':
        // 임시로 ID 역순으로 정렬 (인기순 가정)
        filtered.sort((a, b) => b.id - a.id)
        break
      default:
        // 기본 순서 유지
        break
    }

    return filtered
  }, [getVisibleProducts, searchTerm, selectedCategory, priceRange, sortBy])

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
    totalProducts: getVisibleProducts.length,
    filteredCount: filteredProducts.length,
    isClient // 클라이언트 상태 추가
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