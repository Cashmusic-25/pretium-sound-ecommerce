'use client'

import { useRouter } from 'next/navigation'
import { X, Plus, Minus, Trash2 } from 'lucide-react'
import { useCart } from '../contexts/CartContext'

export default function CartSidebar({ isOpen, onClose }) {
  const router = useRouter()
  const { items, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart()

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
    } else {
      updateQuantity(productId, newQuantity)
    }
  }

  const handleCheckout = () => {
    // 결제 페이지로 이동하고 사이드바 닫기
    onClose()
    router.push('/checkout')
  }

  return (
    <>
      {/* 배경 오버레이 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={onClose}
        />
      )}
      
      {/* 사이드바 */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">장바구니</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* 장바구니 내용 */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-500 text-lg">장바구니가 비어있습니다</p>
              <p className="text-gray-400 mt-2">마음에 드는 교재를 담아보세요!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start space-x-4">
                    {/* 상품 아이콘 */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg w-16 h-16 flex items-center justify-center text-white text-2xl flex-shrink-0">
                      {item.icon}
                    </div>
                    
                    {/* 상품 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {item.category}
                      </p>
                      <p className="text-lg font-bold text-indigo-600">
                        {item.price}
                      </p>
                    </div>
                    
                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {/* 수량 조절 */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Minus size={16} className="text-gray-600" />
                      </button>
                      
                      <span className="w-12 text-center font-semibold text-gray-800">
                        {item.quantity}
                      </span>
                      
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Plus size={16} className="text-gray-600" />
                      </button>
                    </div>
                    
                    {/* 개별 총 가격 */}
                    <div className="text-right">
                      <p className="text-sm text-gray-500">소계</p>
                      <p className="font-bold text-gray-800">
                        {formatPrice(parseInt(item.price.replace(/[₩,]/g, '')) * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 장바구니 전체 삭제 */}
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="w-full py-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  장바구니 비우기
                </button>
              )}
            </div>
          )}
        </div>

        {/* 하단 - 총 금액 및 결제 버튼 */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-6 space-y-4">
            {/* 총 금액 */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-800">총 금액</span>
              <span className="text-2xl font-bold text-indigo-600">
                {formatPrice(getTotalPrice())}
              </span>
            </div>
            
            {/* 결제 버튼 */}
            <button
              onClick={handleCheckout}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              결제하기
            </button>
            
            {/* 쇼핑 계속하기 */}
            <button
              onClick={onClose}
              className="w-full border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              쇼핑 계속하기
            </button>
          </div>
        )}
      </div>
    </>
  )
}