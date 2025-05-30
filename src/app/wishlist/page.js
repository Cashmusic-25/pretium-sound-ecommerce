'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, ShoppingCart, ArrowLeft, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { products } from '../../data/products'
import Header from '../components/Header'

export default function WishlistPage() {
  const { user, isAuthenticated, toggleWishlist } = useAuth()
  const { addToCart } = useCart()
  const router = useRouter()
  const [wishlistProducts, setWishlistProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    // 위시리스트 상품들 가져오기
    const userWishlist = user?.wishlist || []
    const wishlistItems = products.filter(product => 
      userWishlist.includes(product.id)
    )
    setWishlistProducts(wishlistItems)
    setIsLoading(false)
  }, [user, isAuthenticated, router])

  const handleRemoveFromWishlist = (productId) => {
    toggleWishlist(productId)
    setWishlistProducts(prev => 
      prev.filter(product => product.id !== productId)
    )
  }

  const handleAddToCart = (product) => {
    addToCart(product)
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pt-24 pb-16">
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
              <div className="flex items-center space-x-4 mb-8">
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
                        >
                          <Trash2 size={16} />
                        </button>

                        {/* 상품 이미지 */}
                        <div 
                          onClick={() => handleGoToProduct(product.id)}
                          className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl h-40 flex items-center justify-center mb-4 text-white text-4xl cursor-pointer group-hover:scale-105 transition-transform duration-300"
                        >
                          {product.icon}
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
                              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-1 text-sm"
                            >
                              <ShoppingCart size={14} />
                              <span>담기</span>
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
                        onClick={() => {
                          wishlistProducts.forEach(product => addToCart(product))
                        }}
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