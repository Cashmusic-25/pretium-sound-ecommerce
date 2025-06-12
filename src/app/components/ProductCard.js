'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'

export default function ProductCard({ product }) {
  const [isAdding, setIsAdding] = useState(false)
  const [imageError, setImageError] = useState(false)
  const { addToCart } = useCart()
  const { user, isAuthenticated, toggleWishlist } = useAuth()
  const router = useRouter()

  // 위시리스트에 있는지 확인
  const isInWishlist = user?.wishlist?.includes(product.id) || false

  const handleAddToCart = async (e) => {
    e.stopPropagation()
    setIsAdding(true)
    
    addToCart(product)
    
    setTimeout(() => {
      setIsAdding(false)
    }, 1000)
  }

  const handleWishlistToggle = (e) => {
    e.stopPropagation()
    
    if (!isAuthenticated) {
      // 로그인하지 않은 경우 로그인 모달 열기 (부모 컴포넌트에서 처리)
      alert('로그인이 필요한 서비스입니다.')
      return
    }
    
    toggleWishlist(product.id)
  }

  const handleCardClick = () => {
    router.push(`/product/${product.id}`)
  }

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <div 
      onClick={handleCardClick}
      className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg hover:shadow-xl card-hover border border-gray-100 cursor-pointer group relative"
    >
      {/* 위시리스트 버튼 */}
      <button
        onClick={handleWishlistToggle}
        className={`absolute top-4 right-4 p-2 rounded-full transition-all duration-300 z-10 ${
          isInWishlist 
            ? 'bg-red-500 text-white shadow-lg' 
            : 'bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white'
        }`}
      >
        <Heart 
          size={20} 
          fill={isInWishlist ? 'currentColor' : 'none'}
          className="transition-all duration-300"
        />
      </button>

      {/* 상품 이미지 영역 */}
      <div className="h-48 mb-6 rounded-xl overflow-hidden group-hover:scale-105 transition-transform duration-300">
        {product.image && !imageError ? (
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
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
        <h3 className="text-xl font-bold text-gray-800 transition-colors" style={{'&:hover': {color: '#262627'}}}>
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
            className="flex-1 border-2 py-3 rounded-xl font-semibold transition-all duration-300"
            style={{
              borderColor: '#262627',
              color: '#262627',
              '&:hover': {
                backgroundColor: '#f8f9fa'
              }
            }}
          >
            자세히 보기
          </button>
          
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg ${
              isAdding
                ? 'bg-green-500 text-white'
                : 'text-white hover:opacity-90'
            }`}
            style={!isAdding ? {
              background: 'linear-gradient(to right, #262627, #404041)'
            } : {}}
          >
            {isAdding ? '추가됨!' : '담기'}
          </button>
        </div>
      </div>
    </div>
  )
}