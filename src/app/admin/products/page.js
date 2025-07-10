'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  MoreVertical,
  Eye,
  ArrowLeft,
  Package,
  DollarSign,
  Star
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/Header'

export default function AdminProductsPage() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [productList, setProductList] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      router.push('/')
      return
    }
  
    loadProducts()
  }, [isAdmin, router])

  // Supabase에서 상품 목록 로드
  const loadProducts = async () => {
    try {
      setIsLoading(true)
      
      const { getSupabase } = await import('../../../lib/supabase')
      const supabase = getSupabase()
      
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      console.log('📦 관리자 페이지 - 로드된 상품:', products?.length || 0, '개')
      
      setProductList(products || [])
      setFilteredProducts(products || [])
    } catch (error) {
      console.error('상품 로드 실패:', error)
      setProductList([])
      setFilteredProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  // 검색 및 필터링
  useEffect(() => {
    let filtered = productList

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 카테고리 필터링
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    setFilteredProducts(filtered)
  }, [searchTerm, selectedCategory, productList])

  const categories = ['all', ...new Set(productList.map(p => p.category))]

  const handleDeleteProduct = (product) => {
    setProductToDelete(product)
    setShowDeleteModal(true)
  }

  // Supabase에서 상품 삭제
  const confirmDelete = async () => {
    if (!productToDelete) return
    
    try {
      setIsDeleting(true)
      
      const { getSupabase } = await import('../../../lib/supabase')
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)
      
      if (error) {
        throw error
      }
      
      console.log('✅ 상품 삭제 완료:', productToDelete.title)
      
      // 로컬 상태에서도 제거
      const updatedProducts = productList.filter(p => p.id !== productToDelete.id)
      setProductList(updatedProducts)
      setFilteredProducts(updatedProducts.filter(product => {
        const matchesSearch = !searchTerm || 
          product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.category.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
        return matchesSearch && matchesCategory
      }))
      
      setShowDeleteModal(false)
      setProductToDelete(null)
      
    } catch (error) {
      console.error('상품 삭제 실패:', error)
      alert('상품 삭제 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatPrice = (price) => {
    if (typeof price === 'string') {
      return price
    }
    return `₩${price.toLocaleString()}`
  }

  const getCategoryColor = (category) => {
    const colors = {
      '피아노': 'bg-blue-100 text-blue-800',
      '기타': 'bg-green-100 text-green-800',
      '보컬': 'bg-purple-100 text-purple-800',
      '드럼': 'bg-red-100 text-red-800',
      '바이올린': 'bg-yellow-100 text-yellow-800',
      '음악이론': 'bg-indigo-100 text-indigo-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  if (!isAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">상품 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>대시보드로 돌아가기</span>
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">상품 관리</h1>
                <p className="text-gray-600 mt-2">음악 교재 상품을 관리하고 편집하세요</p>
              </div>
              
              <button
                onClick={() => router.push('/admin/products/add')}
                className="mt-4 md:mt-0 bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-600 transition-colors flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>새 상품 추가</span>
              </button>
            </div>
          </div>

          {/* 검색 및 필터 */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              {/* 검색 */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="상품명이나 카테고리로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              {/* 카테고리 필터 */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white min-w-[150px]"
              >
                <option value="all">전체 카테고리</option>
                {categories.filter(cat => cat !== 'all').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* 결과 개수 */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>총 {filteredProducts.length}개의 상품</span>
              {(searchTerm || selectedCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory('all')
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  필터 초기화
                </button>
              )}
            </div>
          </div>

          {/* 상품 목록 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {filteredProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상품
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        카테고리
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        가격
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        히어로
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-4">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.title}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg w-12 h-12 flex items-center justify-center text-white text-2xl">
                                {product.icon}
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {product.title}
                              </div>
                              <div className="text-sm text-gray-500 line-clamp-1">
                                {product.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(product.category)}`}>
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatPrice(product.price)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.show_in_hero ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              <Star size={12} className="mr-1" />
                              표시중
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              미표시
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            판매중
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => router.push(`/product/${product.id}`)}
                              className="text-gray-600 hover:text-indigo-600 transition-colors p-2"
                              title="상품 보기"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => router.push(`/admin/products/edit/${product.id}`)}
                              className="text-gray-600 hover:text-indigo-600 transition-colors p-2"
                              title="수정"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product)}
                              className="text-gray-600 hover:text-red-600 transition-colors p-2"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* 상품이 없을 때 */
              <div className="text-center py-16">
                <Package size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {searchTerm || selectedCategory !== 'all' ? '검색 결과가 없습니다' : '상품이 없습니다'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || selectedCategory !== 'all' 
                    ? '다른 검색어나 필터를 시도해보세요.' 
                    : '새로운 상품을 추가해보세요.'
                  }
                </p>
                {(!searchTerm && selectedCategory === 'all') && (
                  <button
                    onClick={() => router.push('/admin/products/add')}
                    className="bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-600 transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <Plus size={20} />
                    <span>첫 상품 추가하기</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">상품 삭제 확인</h3>
            <p className="text-gray-600 mb-6">
              &ldquo;<strong>{productToDelete?.title}</strong>&rdquo; 상품을 정말 삭제하시겠습니까?
              <br />
              <span className="text-red-600 text-sm">이 작업은 되돌릴 수 없습니다.</span>
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setProductToDelete(null)
                }}
                disabled={isDeleting}
                className="flex-1 border-2 border-gray-300 text-gray-600 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isDeleting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <span>{isDeleting ? '삭제 중...' : '삭제'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}