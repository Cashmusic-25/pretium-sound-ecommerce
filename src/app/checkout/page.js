'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, Truck, CheckCircle, AlertCircle } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { PAYMENT_METHODS, SHIPPING_METHODS, createOrder } from '../../data/orderTypes'
import Header from '../components/Header'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, getTotalPrice, clearCart } = useCart()
  const { user, isAuthenticated, addOrder } = useAuth()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [completedOrder, setCompletedOrder] = useState(null)
  
  const [orderForm, setOrderForm] = useState({
    // 배송 정보
    shipping: {
      name: user?.name || '',
      phone: '',
      email: user?.email || '',
      address: '',
      detailAddress: '',
      zipCode: '',
      memo: ''
    },
    // 결제 정보
    payment: {
      method: PAYMENT_METHODS.CARD,
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardHolderName: ''
    },
    // 배송 방법
    shippingMethod: SHIPPING_METHODS.STANDARD.id
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }
    
    if (items.length === 0) {
      router.push('/')
      return
    }
  }, [isAuthenticated, items, router])

  const handleInputChange = (section, field, value) => {
    setOrderForm(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
    
    if (error) setError('')
  }

  const validateForm = () => {
    const { shipping, payment } = orderForm
    
    if (!shipping.name || !shipping.phone || !shipping.address) {
      setError('필수 배송 정보를 모두 입력해주세요.')
      return false
    }
    
    if (!shipping.phone.match(/^[0-9-+().\s]+$/)) {
      setError('올바른 전화번호를 입력해주세요.')
      return false
    }
    
    if (payment.method === PAYMENT_METHODS.CARD) {
      if (!payment.cardNumber || !payment.expiryDate || !payment.cvv || !payment.cardHolderName) {
        setError('카드 정보를 모두 입력해주세요.')
        return false
      }
    }
    
    return true
  }

  const calculateTotalPrice = () => {
    const itemsTotal = getTotalPrice()
    const shippingFee = SHIPPING_METHODS[orderForm.shippingMethod]?.price || 0
    return itemsTotal + shippingFee
  }

  const handleSubmitOrder = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    setError('')
    
    try {
      // 실제로는 서버 API 호출
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 주문 데이터 생성
      const orderData = createOrder({
        userId: user.id,
        items: items.map(item => ({
          ...item,
          price: parseInt(item.price.replace(/[₩,]/g, ''))
        })),
        shipping: orderForm.shipping,
        payment: {
          method: orderForm.payment.method,
          // 실제로는 카드 정보를 서버에서만 처리
        },
        shippingMethod: orderForm.shippingMethod,
        itemsTotal: getTotalPrice(),
        shippingFee: SHIPPING_METHODS[orderForm.shippingMethod]?.price || 0,
        totalAmount: calculateTotalPrice()
      })
      
      console.log('주문 데이터:', orderData) // 디버깅용
      
      // 사용자의 주문 내역에 추가
      addOrder(orderData)
      
      // 장바구니 비우기
      clearCart()
      
      console.log('주문 완료, 리다이렉트 시작:', orderData.orderNumber)
      
      // 주문 완료 페이지로 바로 이동
      window.location.replace(`/order/complete?orderNumber=${orderData.orderNumber}`)
      
    } catch (err) {
      console.error('주문 처리 오류:', err) // 디버깅용
      setError('주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  // 주문 완료 상태일 때 완료 화면 표시
  if (completedOrder) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
                  <CheckCircle size={48} className="text-green-500" />
                </div>
                
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                  주문이 완료되었습니다!
                </h1>
                
                <p className="text-xl text-gray-600 mb-6">
                  주문번호: <span className="font-mono font-bold text-indigo-600">{completedOrder.orderNumber}</span>
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/orders')}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300"
                  >
                    주문 내역 보기
                  </button>
                  
                  <button
                    onClick={() => router.push('/')}
                    className="w-full border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300"
                  >
                    쇼핑 계속하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* 뒤로가기 */}
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>뒤로가기</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 왼쪽: 주문 폼 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">주문하기</h1>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitOrder} className="space-y-8">
                  {/* 배송 정보 */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
                      <Truck size={24} className="text-indigo-600" />
                      <span>배송 정보</span>
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          받는 분 이름 *
                        </label>
                        <input
                          type="text"
                          value={orderForm.shipping.name}
                          onChange={(e) => handleInputChange('shipping', 'name', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          휴대폰 번호 *
                        </label>
                        <input
                          type="tel"
                          value={orderForm.shipping.phone}
                          onChange={(e) => handleInputChange('shipping', 'phone', e.target.value)}
                          placeholder="010-1234-5678"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          required
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          이메일
                        </label>
                        <input
                          type="email"
                          value={orderForm.shipping.email}
                          onChange={(e) => handleInputChange('shipping', 'email', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          우편번호
                        </label>
                        <input
                          type="text"
                          value={orderForm.shipping.zipCode}
                          onChange={(e) => handleInputChange('shipping', 'zipCode', e.target.value)}
                          placeholder="12345"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          주소 *
                        </label>
                        <input
                          type="text"
                          value={orderForm.shipping.address}
                          onChange={(e) => handleInputChange('shipping', 'address', e.target.value)}
                          placeholder="서울시 강남구 테헤란로 123"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          required
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          상세주소
                        </label>
                        <input
                          type="text"
                          value={orderForm.shipping.detailAddress}
                          onChange={(e) => handleInputChange('shipping', 'detailAddress', e.target.value)}
                          placeholder="아파트, 호수 등"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          배송 메모
                        </label>
                        <textarea
                          value={orderForm.shipping.memo}
                          onChange={(e) => handleInputChange('shipping', 'memo', e.target.value)}
                          placeholder="배송 요청사항을 입력해주세요"
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 배송 방법 */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">배송 방법</h3>
                    <div className="space-y-3">
                      {Object.values(SHIPPING_METHODS).map((method) => (
                        <label key={method.id} className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="shippingMethod"
                            value={method.id}
                            checked={orderForm.shippingMethod === method.id}
                            onChange={(e) => handleInputChange('', 'shippingMethod', e.target.value)}
                            className="mr-3 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-800">{method.name}</span>
                              <span className="font-bold text-indigo-600">
                                {method.price === 0 ? '무료' : `₩${method.price.toLocaleString()}`}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 결제 정보 */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
                      <CreditCard size={24} className="text-indigo-600" />
                      <span>결제 정보</span>
                    </h2>
                    
                    {/* 결제 방법 선택 */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        결제 방법
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(PAYMENT_METHODS).map(([key, value]) => {
                          const labels = {
                            [PAYMENT_METHODS.CARD]: '신용카드',
                            [PAYMENT_METHODS.BANK_TRANSFER]: '계좌이체',
                            [PAYMENT_METHODS.VIRTUAL_ACCOUNT]: '가상계좌',
                            [PAYMENT_METHODS.PHONE]: '휴대폰'
                          }
                          
                          return (
                            <label key={value} className="flex items-center justify-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value={value}
                                checked={orderForm.payment.method === value}
                                onChange={(e) => handleInputChange('payment', 'method', e.target.value)}
                                className="sr-only"
                              />
                              <span className={`text-sm font-medium ${
                                orderForm.payment.method === value 
                                  ? 'text-indigo-600' 
                                  : 'text-gray-600'
                              }`}>
                                {labels[value]}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    {/* 카드 정보 (신용카드 선택시만) */}
                    {orderForm.payment.method === PAYMENT_METHODS.CARD && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            카드 번호 *
                          </label>
                          <input
                            type="text"
                            value={orderForm.payment.cardNumber}
                            onChange={(e) => handleInputChange('payment', 'cardNumber', e.target.value)}
                            placeholder="1234 5678 9012 3456"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            유효기간 *
                          </label>
                          <input
                            type="text"
                            value={orderForm.payment.expiryDate}
                            onChange={(e) => handleInputChange('payment', 'expiryDate', e.target.value)}
                            placeholder="MM/YY"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CVV *
                          </label>
                          <input
                            type="text"
                            value={orderForm.payment.cvv}
                            onChange={(e) => handleInputChange('payment', 'cvv', e.target.value)}
                            placeholder="123"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            required
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            카드 소유자 이름 *
                          </label>
                          <input
                            type="text"
                            value={orderForm.payment.cardHolderName}
                            onChange={(e) => handleInputChange('payment', 'cardHolderName', e.target.value)}
                            placeholder="홍길동"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 주문 버튼 */}
                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>주문 처리 중...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} />
                          <span>₩{calculateTotalPrice().toLocaleString()} 결제하기</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* 오른쪽: 주문 요약 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
                <h3 className="text-xl font-bold text-gray-800 mb-6">주문 요약</h3>
                
                {/* 주문 상품들 */}
                <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg w-12 h-12 flex items-center justify-center text-white text-xl">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                        <p className="text-xs text-gray-500">수량: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-800">
                        ₩{(parseInt(item.price.replace(/[₩,]/g, '')) * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* 가격 요약 */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>상품 금액</span>
                    <span>₩{getTotalPrice().toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>배송비</span>
                    <span>
                      {SHIPPING_METHODS[orderForm.shippingMethod]?.price === 0 
                        ? '무료' 
                        : `₩${SHIPPING_METHODS[orderForm.shippingMethod]?.price.toLocaleString()}`
                      }
                    </span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-lg font-bold text-gray-800">
                      <span>총 결제 금액</span>
                      <span>₩{calculateTotalPrice().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}