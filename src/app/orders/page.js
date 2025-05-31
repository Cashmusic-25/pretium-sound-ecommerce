'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, ArrowLeft, Eye, Download, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getOrderStatusLabel, getPaymentMethodLabel, ORDER_STATUS } from '../../data/orderTypes'
import Header from '../components/Header'

export default function OrdersPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    // 사용자의 주문 내역 불러오기
    const userOrders = user?.orders || []
    // 최신 주문부터 표시
    const sortedOrders = userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    setOrders(sortedOrders)
    setIsLoading(false)
  }, [isAuthenticated, user, router])

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  const getStatusColor = (status) => {
    const colors = {
      [ORDER_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
      [ORDER_STATUS.PROCESSING]: 'bg-blue-100 text-blue-800',
      [ORDER_STATUS.SHIPPED]: 'bg-purple-100 text-purple-800',
      [ORDER_STATUS.DELIVERED]: 'bg-green-100 text-green-800',
      [ORDER_STATUS.CANCELLED]: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const filteredOrders = orders.filter(order => 
    selectedStatus === 'all' || order.status === selectedStatus
  )

  const handleViewOrder = (orderNumber) => {
    router.push(`/order/complete?orderNumber=${orderNumber}`)
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">주문 내역을 불러오는 중...</p>
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

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 lg:p-12">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-2xl">
                    <Package size={32} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-800">
                      주문 내역
                    </h1>
                    <p className="text-gray-600 mt-2">
                      {user?.name}님의 주문 내역입니다
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-3xl font-bold text-indigo-600">{orders.length}</p>
                  <p className="text-sm text-gray-500">총 주문</p>
                </div>
              </div>

              {/* 상태 필터 */}
              <div className="mb-8">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedStatus('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedStatus === 'all'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    전체 ({orders.length})
                  </button>
                  
                  {Object.values(ORDER_STATUS).map(status => {
                    const count = orders.filter(order => order.status === status).length
                    if (count === 0) return null
                    
                    return (
                      <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedStatus === status
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {getOrderStatusLabel(status)} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 주문 목록 */}
              {filteredOrders.length > 0 ? (
                <div className="space-y-6">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                      {/* 주문 헤더 */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-col">
                            <h3 className="text-lg font-bold text-gray-800">
                              주문번호: {order.orderNumber}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {new Date(order.createdAt).toLocaleString('ko-KR')}
                            </p>
                          </div>
                          
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
                          <span className="text-lg font-bold text-indigo-600">
                            {formatPrice(order.totalAmount)}
                          </span>
                          
                          <button
                            onClick={() => handleViewOrder(order.orderNumber)}
                            className="flex items-center space-x-2 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors text-sm"
                          >
                            <Eye size={16} />
                            <span>상세보기</span>
                          </button>
                        </div>
                      </div>

                      {/* 주문 상품들 */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {order.items.slice(0, 2).map((item) => (
                          <div key={item.id} className="flex items-center space-x-3 bg-white p-4 rounded-xl">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg w-12 h-12 flex items-center justify-center text-white text-xl">
                              {item.icon}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-800 truncate">{item.title}</h4>
                              <p className="text-sm text-gray-500">수량: {item.quantity}개</p>
                            </div>
                            
                            <div className="text-right">
                              <p className="font-bold text-gray-800">
                                {formatPrice(item.price * item.quantity)}
                              </p>
                              
                              {order.status === ORDER_STATUS.DELIVERED && (
                                <button className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 mt-1">
                                  <Download size={12} />
                                  <span>다운로드</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {order.items.length > 2 && (
                          <div className="lg:col-span-2 text-center">
                            <p className="text-sm text-gray-500">
                              외 {order.items.length - 2}개 상품
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 주문 액션 */}
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                        <span className="text-sm text-gray-600">
                          {getPaymentMethodLabel(order.payment.method)} 결제
                        </span>
                        
                        {order.status === ORDER_STATUS.PROCESSING && (
                          <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1">
                            <RefreshCw size={12} />
                            <span>배송조회</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* 주문 내역이 없을 때 */
                <div className="text-center py-16">
                  <div className="text-8xl mb-6">📦</div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">
                    {selectedStatus === 'all' ? '주문 내역이 없습니다' : '해당 상태의 주문이 없습니다'}
                  </h2>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                    {selectedStatus === 'all' 
                      ? '아직 주문한 상품이 없습니다. 마음에 드는 교재를 찾아보세요!' 
                      : '다른 주문 상태를 확인해보세요.'
                    }
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => router.push('/#products')}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300"
                    >
                      교재 둘러보기
                    </button>
                    
                    {selectedStatus !== 'all' && (
                      <button
                        onClick={() => setSelectedStatus('all')}
                        className="border-2 border-gray-300 text-gray-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all duration-300"
                      >
                        전체 주문 보기
                      </button>
                    )}
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