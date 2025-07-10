'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'

export default function ProductCard({ product, onLoginRequired }) {
  const [isAdding, setIsAdding] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  
  const { addToCart, isInCart } = useCart()
  const { isAuthenticated, toggleWishlist, isInWishlist } = useAuth()
  const router = useRouter()

  // 토스트 메시지 표시 함수
  const showToastMessage = (message) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  const handleAddToCart = async (e) => {
    e.stopPropagation()
    setIsAdding(true)
    
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
    } finally {
      setTimeout(() => {
        setIsAdding(false)
      }, 1000)
    }
  }

  const handleWishlistToggle = (e) => {
    e.stopPropagation()
    
    if (!isAuthenticated) {
      if (onLoginRequired) {
        onLoginRequired()
      } else {
        showToastMessage('로그인이 필요한 서비스입니다.')
      }
      return
    }
    
    try {
      const wasInWishlist = isInWishlist(product.id)
      toggleWishlist(product.id)
      
      if (wasInWishlist) {
        showToastMessage(`${product.title}이(가) 위시리스트에서 제거되었습니다.`)
      } else {
        showToastMessage(`${product.title}이(가) 위시리스트에 추가되었습니다.`)
      }
    } catch (error) {
      console.error('위시리스트 토글 실패:', error)
      showToastMessage('위시리스트 업데이트에 실패했습니다.')
    }
  }

  const handleCardClick = () => {
    router.push(`/product/${product.id}`)
  }

  const handleImageError = () => {
    setImageError(true)
  }

  const productIsInWishlist = isAuthenticated && isInWishlist(product.id)
  const productIsInCart = isInCart(product.id)

  return (
    <div className="relative">
      {/* 토스트 메시지 */}
      {showToast && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 transition-all duration-300 min-w-max">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-800 text-sm font-medium">{toastMessage}</p>
          </div>
        </div>
      )}

      <div 
        onClick={handleCardClick}
        className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg hover:shadow-xl card-hover border border-gray-100 cursor-pointer group relative"
      >
        {/* 위시리스트 버튼 */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-4 right-4 p-2 rounded-full transition-all duration-300 z-10 ${
            productIsInWishlist 
              ? 'bg-red-500 text-white shadow-lg' 
              : 'bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white'
          }`}
          title={productIsInWishlist ? '위시리스트에서 제거' : '위시리스트에 추가'}
        >
          <Heart 
            size={20} 
            fill={productIsInWishlist ? 'currentColor' : 'none'}
            className="transition-all duration-300"
          />
        </button>

        {/* 장바구니 상태 표시 */}
        {productIsInCart && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium z-10">
            장바구니에 있음
          </div>
        )}

        {/* 상품 이미지 영역 - 교재에 최적화된 비율 */}
        <div className="aspect-[3/4] mb-6 rounded-xl overflow-hidden bg-gray-50 border group-hover:scale-105 transition-transform duration-300">
          {product.image && !imageError ? (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-contain p-2 hover:object-cover transition-all duration-300"
              onError={handleImageError}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-white text-6xl" style={{background: 'linear-gradient(135deg, #262627 0%, #404041 100%)'}}>
              {product.icon}
            </div>
          )}
        </div>
        
        {/* 상품 정보 */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800 transition-colors group-hover:text-blue-600">
            {product.title}
          </h3>
          
          <p className="text-gray-600 leading-relaxed line-clamp-3">
            {product.description}
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold" style={{color: '#262627'}}>
              {product.price}
            </span>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {product.category}
            </span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleCardClick}
              className="flex-1 border-2 py-3 rounded-xl font-semibold transition-all duration-300 hover:bg-gray-50"
              style={{
                borderColor: '#262627',
                color: '#262627'
              }}
            >
              자세히 보기
            </button>
            
            <button
              onClick={handleAddToCart}
              disabled={isAdding || productIsInCart}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg ${
                isAdding
                  ? 'bg-green-500 text-white'
                  : productIsInCart
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'text-white hover:opacity-90'
              }`}
              style={!isAdding && !productIsInCart ? {
                background: 'linear-gradient(to right, #262627, #404041)'
              } : {}}
            >
              {isAdding ? '추가중...' : productIsInCart ? '담겨있음' : '담기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}