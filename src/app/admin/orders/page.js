'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter,
  Download,
  RefreshCw,
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  X,
  Eye,
  Edit
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/Header'

const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
}

const STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: '결제 대기',
  [ORDER_STATUS.PROCESSING]: '처리 중',
  [ORDER_STATUS.SHIPPED]: '배송 중', 
  [ORDER_STATUS.DELIVERED]: '배송 완료',
  [ORDER_STATUS.CANCELLED]: '취소됨'
}

const STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
  [ORDER_STATUS.PROCESSING]: 'bg-blue-100 text-blue-800',
  [ORDER_STATUS.SHIPPED]: 'bg-purple-100 text-purple-800',
  [ORDER_STATUS.DELIVERED]: 'bg-green-100 text-green-800',
  [ORDER_STATUS.CANCELLED]: 'bg-red-100 text-red-800'
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const { isAdmin, getAllOrders, updateOrderStatus } = useAuth()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    if (!isAdmin) {
      router.push('/')
      return
    }

    loadOrders()
  }, [isAdmin, router])

  const loadOrders = () => {
    const allOrders = getAllOrders()
    setOrders(allOrders)
    setFilteredOrders(allOrders)
    setIsLoading(false)
  }

  // 검색 및 필터링
  useEffect(() => {
    let filtered = orders

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 상태 필터링
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus)
    }

    setFilteredOrders(filtered)
  }, [searchTerm, selectedStatus, orders])

  const handleStatusChange = async (order, status) => {
    setSelectedOrder(order)
    setNewStatus(status)
    setShowStatusModal(true)
  }

  const confirmStatusChange = async () => {
    if (selectedOrder && newStatus) {
      const success = updateOrderStatus(selectedOrder.id, newStatus)
      if (success) {
        loadOrders() // 주문 목록 새로고침
        setShowStatusModal(false)
        setSelectedOrder(null)
        setNewStatus('')
      } else {
        alert('주문 상태 변경에 실패했습니다.')
      }
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  const getStatusIcon = (status) => {
    const icons = {
      [ORDER_STATUS.PENDING]: <Clock size={16} />,
      [ORDER_STATUS.PROCESSING]: <Package size={16} />,
      [ORDER_STATUS.SHIPPED]: <Truck size={16} />,
      [ORDER_STATUS.DELIVERED]: <CheckCircle size={16} />,
      [ORDER_STATUS.CANCELLED]: <X size={16} />
    }
    return icons[status] || <Package size={16} />
  }

  const getOrderStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === ORDER_STATUS.PENDING).length,
      processing: orders.filter(o => o.status === ORDER_STATUS.PROCESSING).length,
      shipped: orders.filter(o => o.status === ORDER_STATUS.SHIPPED).length,
      delivered: orders.filter(o => o.status === ORDER_STATUS.DELIVERED).length,
      cancelled: orders.filter(o => o.status === ORDER_STATUS.CANCELLED).length
    }
    return stats
  }

  if (!isAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">주문 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const stats = getOrderStats()

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
                <h1 className="text-3xl font-bold text-gray-800">주문 관리</h1>
                <p className="text-gray-600 mt-2">고객 주문을 관리하고 배송 상태를 업데이트하세요</p>
              </div>
              
              <button
                onClick={loadOrders}
                className="mt-4 md:mt-0 bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-600 transition-colors flex items-center space-x-2"
              >
                <RefreshCw size={20} />
                <span>새로고침</span>
              </button>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-sm text-gray-600">전체</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-gray-600">결제 대기</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
              <p className="text-sm text-gray-600">처리 중</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.shipped}</p>
              <p className="text-sm text-gray-600">배송 중</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              <p className="text-sm text-gray-600">배송 완료</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              <p className="text-sm text-gray-600">취소</p>
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
                  placeholder="주문번호, 고객명, 이메일로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              {/* 상태 필터 */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white min-w-[150px]"
              >
                <option value="all">전체 상태</option>
                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                  <option key={status} value={status}>{label}</option>
                ))}
              </select>
            </div>

            {/* 결과 개수 */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>총 {filteredOrders.length}개의 주문</span>
              {(searchTerm || selectedStatus !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedStatus('all')
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  필터 초기화
                </button>
              )}
            </div>
          </div>

          {/* 주문 목록 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        주문 정보
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        고객
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        금액
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        주문일
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.orderNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.items?.length || 0}개 상품
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.customerName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.customerEmail}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatPrice(order.totalAmount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(order.status)}
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[order.status]}`}>
                              {STATUS_LABELS[order.status]}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleTimeString('ko-KR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setSelectedOrder(order)
                                setShowDetailModal(true)
                              }}
                              className="text-gray-600 hover:text-indigo-600 transition-colors p-2"
                              title="상세 보기"
                            >
                              <Eye size={16} />
                            </button>
                            <div className="relative group">
                              <button
                                className="text-gray-600 hover:text-indigo-600 transition-colors p-2"
                                title="상태 변경"
                              >
                                <Edit size={16} />
                              </button>
                              {/* 상태 변경 드롭다운 */}
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                                  <button
                                    key={status}
                                    onClick={() => handleStatusChange(order, status)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center space-x-2 ${
                                      order.status === status ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                                    }`}
                                  >
                                    {getStatusIcon(status)}
                                    <span>{label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* 주문이 없을 때 */
              <div className="text-center py-16">
                <Package size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {searchTerm || selectedStatus !== 'all' ? '검색 결과가 없습니다' : '주문이 없습니다'}
                </h3>
                <p className="text-gray-600">
                  {searchTerm || selectedStatus !== 'all' 
                    ? '다른 검색어나 필터를 시도해보세요.' 
                    : '아직 고객 주문이 없습니다.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 주문 상세 모달 */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">주문 상세 정보</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 주문 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">주문번호</p>
                  <p className="font-mono font-bold text-indigo-600">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">주문일시</p>
                  <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString('ko-KR')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">주문 상태</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(selectedOrder.status)}
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[selectedOrder.status]}`}>
                      {STATUS_LABELS[selectedOrder.status]}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">총 금액</p>
                  <p className="text-lg font-bold text-gray-800">{formatPrice(selectedOrder.totalAmount)}</p>
                </div>
              </div>

              {/* 고객 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">고객 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-600">이름</p>
                    <p className="font-medium">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">이메일</p>
                    <p className="font-medium">{selectedOrder.customerEmail}</p>
                  </div>
                </div>
              </div>

              {/* 배송 정보 */}
              {selectedOrder.shipping && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">배송 정보</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">받는 분</p>
                      <p className="font-medium">{selectedOrder.shipping.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">연락처</p>
                      <p className="font-medium">{selectedOrder.shipping.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">주소</p>
                      <p className="font-medium">
                        {selectedOrder.shipping.address} {selectedOrder.shipping.detailAddress}
                      </p>
                    </div>
                    {selectedOrder.shipping.memo && (
                      <div>
                        <p className="text-sm text-gray-600">배송 메모</p>
                        <p className="font-medium">{selectedOrder.shipping.memo}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 주문 상품 */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">주문 상품</h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg w-12 h-12 flex items-center justify-center text-white text-xl">
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-800">{item.title}</h5>
                        <p className="text-sm text-gray-600">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">수량: {item.quantity}</p>
                        <p className="font-bold text-indigo-600">{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 금액 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">결제 정보</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>상품 금액</span>
                    <span>{formatPrice(selectedOrder.itemsTotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>배송비</span>
                    <span>{formatPrice(selectedOrder.shippingFee || 0)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-lg">
                    <span>총 결제 금액</span>
                    <span className="text-indigo-600">{formatPrice(selectedOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 상태 변경 확인 모달 */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">주문 상태 변경</h3>
            <p className="text-gray-600 mb-6">
              주문번호 &quot;<strong>{selectedOrder.orderNumber}</strong>&quot;의 상태를
              "<strong className="text-indigo-600">{STATUS_LABELS[newStatus]}</strong>"로 변경하시겠습니까?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowStatusModal(false)
                  setSelectedOrder(null)
                  setNewStatus('')
                }}
                className="flex-1 border-2 border-gray-300 text-gray-600 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmStatusChange}
                className="flex-1 bg-indigo-500 text-white py-3 rounded-lg font-semibold hover:bg-indigo-600 transition-colors"
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}