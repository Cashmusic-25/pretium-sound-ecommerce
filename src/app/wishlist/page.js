'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, ShoppingCart, ArrowLeft, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { getAllVisibleProducts } from '../../data/productHelpers' // Supabase 데이터 사용
import Header from '../components/Header'

export default function WishlistPage() {
  const { user, isAuthenticated, toggleWishlist, wishlist, getWishlist } = useAuth()
  const { addToCart, isInCart } = useCart()
  const router = useRouter()
  const [wishlistProducts, setWishlistProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  // 토스트 메시지 표시 함수
  const showToastMessage = (message) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  // Supabase에서 상품 데이터 가져와서 위시리스트와 매칭
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    const fetchWishlistProducts = async () => {
      try {
        console.log('🔍 현재 위시리스트:', wishlist)
        
        // Supabase에서 전체 상품 데이터 가져오기
        const allProducts = await getAllVisibleProducts()
        console.log('🔍 Supabase 상품들:', allProducts.length, '개')
        
        const userWishlistIds = wishlist || []
        // 위시리스트 ID와 매칭되는 상품들 찾기
        const wishlistItems = allProducts.filter(product => 
          userWishlistIds.includes(String(product.id))
        )
        
        console.log('🔍 위시리스트 상품들 (Supabase 데이터):', wishlistItems.length, '개')
        setWishlistProducts(wishlistItems)
        
      } catch (error) {
        console.error('위시리스트 상품 로딩 실패:', error)
        setWishlistProducts([])
        showToastMessage('위시리스트를 불러오는 중 문제가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchWishlistProducts()
  }, [wishlist, isAuthenticated, router])

  const handleRemoveFromWishlist = (productId) => {
    try {
      toggleWishlist(productId)
      setWishlistProducts(prev => 
        prev.filter(product => product.id !== productId)
      )
      
      const product = products.find(p => p.id === productId)
      showToastMessage(`${product?.title || '상품'}이(가) 위시리스트에서 제거되었습니다.`)
    } catch (error) {
      console.error('위시리스트 제거 실패:', error)
      showToastMessage('위시리스트 제거에 실패했습니다.')
    }
  }

  const handleAddToCart = (product) => {
    try {
      if (isInCart(product.id)) {
        showToastMessage(`${product.title}은(는) 이미 장바구니에 있습니다.`)
        return
      }
      
      addToCart(product)
      showToastMessage(`${product.title}이(가) 장바구니에 추가되었습니다.`)
    } catch (error) {
      console.error('장바구니 추가 실패:', error)
      showToastMessage('장바구니 추가에 실패했습니다.')
    }
  }

  const handleAddAllToCart = () => {
    try {
      let addedCount = 0
      let skippedCount = 0
      
      wishlistProducts.forEach(product => {
        if (!isInCart(product.id)) {
          addToCart(product)
          addedCount++
        } else {
          skippedCount++
        }
      })
      
      if (addedCount > 0) {
        showToastMessage(`${addedCount}개 상품이 장바구니에 추가되었습니다.${skippedCount > 0 ? ` (${skippedCount}개는 이미 장바구니에 있음)` : ''}`)
      } else {
        showToastMessage('모든 상품이 이미 장바구니에 있습니다.')
      }
    } catch (error) {
      console.error('전체 장바구니 추가 실패:', error)
      showToastMessage('장바구니 추가에 실패했습니다.')
    }
  }

  const handleGoToProduct = (productId) => {
    router.push(`/product/${productId}`)
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">위시리스트를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Header />
      
      {/* 토스트 메시지 */}
      {showToast && (
        <div className="fixed top-24 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 transform transition-all duration-300">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-800 font-medium">{toastMessage}</p>
          </div>
        </div>
      )}
      
      <div className="pb-16">
        <div className="container mx-auto px-4">
          {/* 뒤로가기 버튼 */}
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>뒤로가기</span>
          </button>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 lg:p-12">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-red-500 to-pink-500 p-4 rounded-2xl">
                    <Heart size={32} className="text-white" fill="currentColor" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-800">
                      위시리스트
                    </h1>
                    <p className="text-gray-600 mt-2">
                      마음에 드는 교재들을 모아보세요
                    </p>
                  </div>
                </div>
                
                {/* 위시리스트 개수 표시 */}
                {wishlistProducts.length > 0 && (
                  <div className="bg-red-100 text-red-600 px-4 py-2 rounded-full font-semibold">
                    {wishlistProducts.length}개 상품
                  </div>
                )}
              </div>

              {/* 위시리스트 상품들 */}
              {wishlistProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {wishlistProducts.map((product) => (
                      <div key={product.id} className="bg-gray-50 rounded-2xl p-6 relative group hover:shadow-lg transition-all duration-300">
                        {/* 삭제 버튼 */}
                        <button
                          onClick={() => handleRemoveFromWishlist(product.id)}
                          className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-300 z-10"
                          title="위시리스트에서 제거"
                        >
                          <Trash2 size={16} />
                        </button>

                        {/* 장바구니 상태 표시 */}
                        {isInCart(product.id) && (
                          <div className="absolute top-4 left-4 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium z-10">
                            장바구니에 있음
                          </div>
                        )}

{/* 상품 이미지 - 교재에 최적화된 비율 */}
                        <div 
                          onClick={() => handleGoToProduct(product.id)}
                          className="aspect-[3/4] mb-4 rounded-xl overflow-hidden bg-gray-100 border cursor-pointer group-hover:scale-105 transition-transform duration-300"
                        >
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.title}
                              className="w-full h-full object-contain p-2 hover:object-cover transition-all duration-300"
                              onError={(e) => {
                                console.log('🖼️ 이미지 로드 실패:', product.image)
                                // 이미지 로드 실패 시 아이콘 표시로 전환
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'flex'
                              }}
                              onLoad={() => {
                                console.log('🖼️ 이미지 로드 성공:', product.image)
                              }}
                            />
                          ) : null}
                          
                          {/* 이미지가 없거나 로드 실패 시 아이콘 표시 */}
                          <div 
                            className="bg-gradient-to-br from-indigo-500 to-purple-600 h-full w-full flex items-center justify-center text-white text-4xl absolute top-0 left-0"
                            style={{ display: product.image ? 'none' : 'flex' }}
                          >
                            {product.icon}
                          </div>
                        </div>

                        {/* 상품 정보 */}
                        <div className="space-y-3">
                          <h3 
                            onClick={() => handleGoToProduct(product.id)}
                            className="text-lg font-bold text-gray-800 cursor-pointer hover:text-indigo-600 transition-colors"
                          >
                            {product.title}
                          </h3>
                          
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {product.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-indigo-600">
                              {product.price}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                              {product.category}
                            </span>
                          </div>

                          {/* 액션 버튼들 */}
                          <div className="flex space-x-2 pt-2">
                            <button
                              onClick={() => handleGoToProduct(product.id)}
                              className="flex-1 border-2 border-indigo-500 text-indigo-500 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-all duration-300 text-sm"
                            >
                              자세히 보기
                            </button>
                            <button
                              onClick={() => handleAddToCart(product)}
                              disabled={isInCart(product.id)}
                              className={`flex-1 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-1 text-sm ${
                                isInCart(product.id)
                                  ? 'bg-gray-400 text-white cursor-not-allowed'
                                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
                              }`}
                            >
                              <ShoppingCart size={14} />
                              <span>{isInCart(product.id) ? '담겨있음' : '담기'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 하단 액션 */}
                  <div className="border-t border-gray-200 pt-8 text-center">
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={handleAddAllToCart}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-2"
                      >
                        <ShoppingCart size={20} />
                        <span>모든 상품 장바구니에 담기</span>
                      </button>
                      
                      <button
                        onClick={() => router.push('/#products')}
                        className="border-2 border-gray-300 text-gray-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all duration-300"
                      >
                        더 많은 교재 보기
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* 빈 위시리스트 */
                <div className="text-center py-16">
                  <div className="text-8xl mb-6">💔</div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">
                    위시리스트가 비어있습니다
                  </h2>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                    마음에 드는 교재를 찾아서 하트 버튼을 눌러보세요. 
                    나중에 쉽게 찾아볼 수 있어요!
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => router.push('/#products')}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300"
                    >
                      교재 둘러보기
                    </button>
                    
                    <button
                      onClick={() => router.push('/')}
                      className="border-2 border-gray-300 text-gray-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all duration-300"
                    >
                      홈으로 가기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}