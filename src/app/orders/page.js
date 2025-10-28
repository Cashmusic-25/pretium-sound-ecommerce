'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, ArrowLeft, Eye, Download, RefreshCw, FileText, Music } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getOrderStatusLabel, getPaymentMethodLabel, ORDER_STATUS } from '../../data/orderTypes'
import Header from '../components/Header'

export default function OrdersPage() {
  const router = useRouter()
  const { user, isAuthenticated, makeAuthenticatedRequest } = useAuth()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [downloadingFiles, setDownloadingFiles] = useState(new Set())
  

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }
  
    // ✅ 인증된 API 요청으로 주문 내역 불러오기
    const loadUserOrders = async () => {
      try {
        setIsLoading(true)
        
        console.log('📦 사용자 주문 조회 시작:', user.id)
  
        // ✅ makeAuthenticatedRequest를 사용한 API 호출
        const response = await makeAuthenticatedRequest('/api/orders')
        
        if (!response.ok) {
          const errorResult = await response.json()
          throw new Error(errorResult.error || '주문 조회 실패')
        }

        const result = await response.json()
        console.log('✅ 주문 조회 성공:', result.orders.length, '개')
  
        // API 응답 데이터를 기존 형식으로 변환 (취소 포함 전체 노출)
        const formattedOrders = result.orders
          .map(order => ({
          id: order.id,
          orderNumber: `PS${order.id}`, // 주문번호 형식
          userId: order.user_id,
          items: order.items || [],
          totalAmount: order.total_amount,
          status: order.status,
          createdAt: order.created_at,
          shipping: order.shipping_address,
          payment: {
            method: 'card' // 기본값
          }
        }))
  
        setOrders(formattedOrders)
        
      } catch (error) {
        console.error('주문 로드 중 오류:', error)
        
        // 인증 관련 에러 처리
        if (error.message.includes('인증') || error.message.includes('토큰')) {
          alert('로그인이 만료되었습니다. 다시 로그인해주세요.')
          router.push('/')
        } else {
          alert(`주문 내역을 불러오는데 실패했습니다: ${error.message}`)
        }
        
        setOrders([])
      } finally {
        setIsLoading(false)
      }
    }
  
    loadUserOrders()
  }, [isAuthenticated, user, router, makeAuthenticatedRequest]) // makeAuthenticatedRequest 의존성 추가

  // ✅ 파일 다운로드 함수 (이미 수정되어 있음)
  const handleDownload = async (orderId, productId, fileId, filename) => {
    if (!user?.id) {
      alert('로그인이 필요합니다.');
      return;
    }

    const downloadKey = `${orderId}-${productId}-${fileId}`;
    
    // 이미 다운로드 중이면 중복 요청 방지
    if (downloadingFiles.has(downloadKey)) {
      return;
    }

    try {
      setDownloadingFiles(prev => new Set(prev).add(downloadKey));

      console.log('📥 다운로드 시작:', { orderId, fileId, filename });

      // ✅ 인증된 요청 사용
      const response = await makeAuthenticatedRequest(
        `/api/download/${orderId}/${fileId}`,
        {
          method: 'GET'
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '다운로드 실패');
      }

      // 교차 출처 download 경고 제거: Blob 다운로드 시도 → 실패 시 새 탭 열기 폴백
      try {
        const fileResp = await fetch(result.downloadUrl, { credentials: 'omit' });
        const blob = await fileResp.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      } catch (_) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      console.log('✅ 다운로드 성공');
      
      // 성공 알림
      alert(`${filename} 다운로드가 시작되었습니다.\n남은 다운로드 기간: ${result.remainingDays}일`);

    } catch (error) {
      console.error('❌ 다운로드 오류:', error);
      
      // 사용자 친화적 오류 메시지
      if (error.message.includes('만료')) {
        alert('다운로드 기간이 만료되었습니다.\n고객센터(jasonincompany@gmail.com)로 문의해주세요.');
      } else if (error.message.includes('권한')) {
        alert('해당 파일에 대한 다운로드 권한이 없습니다.');
      } else if (error.message.includes('인증') || error.message.includes('토큰')) {
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        router.push('/');
      } else {
        alert(`다운로드 중 오류가 발생했습니다: ${error.message}`);
      }
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(downloadKey);
        return newSet;
      });
    }
  };

  // 다운로드 가능 여부 확인
  const canDownload = (status) => {
    return status === 'processing' || status === 'delivered';
  };

  // 다운로드 기간 계산
  const getDownloadDaysLeft = (createdAt) => {
    const orderDate = new Date(createdAt);
    const now = new Date();
    const daysDiff = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
    return Math.max(0, 14 - daysDiff);
  };

  // 파일 아이콘 결정
  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="text-red-500" size={16} />
      case 'audio': return <Music className="text-purple-500" size={16} />
      case 'archive': return <Package className="text-orange-500" size={16} />
      default: return <FileText className="text-gray-500" size={16} />
    }
  };

  // 가격을 안전하게 숫자로 변환하는 함수
  const parsePrice = (priceValue) => {
    if (typeof priceValue === 'number') {
      return priceValue;
    }
    if (typeof priceValue === 'string') {
      // ₩, 원, 쉼표 제거 후 숫자로 변환
      return parseInt(priceValue.replace(/[₩,원]/g, '')) || 0;
    }
    return 0;
  };

  const formatPrice = (price) => {
    const numericPrice = parsePrice(price);
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(numericPrice)
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

  // 수정된 상세보기 함수
  const handleViewOrder = (orderId) => {
    router.push(`/order/complete?orderId=${orderId}`)
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
      
      <div className="pb-16">
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
                  {filteredOrders.map((order) => {
                    const daysLeft = getDownloadDaysLeft(order.createdAt);
                    
                    return (
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
                              onClick={() => handleViewOrder(order.id)}
                              className="flex items-center space-x-2 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors text-sm"
                            >
                              <Eye size={16} />
                              <span>상세보기</span>
                            </button>
                          </div>
                        </div>

                        {/* 주문 상품들 */}
                        <div className="space-y-4">
                          {order.items.map((item) => (
                            <OrderItemWithDownloads
                              key={item.id}
                              item={item}
                              orderId={order.id}
                              canDownload={canDownload(order.status)}
                              daysLeft={daysLeft}
                              onDownload={handleDownload}
                              downloadingFiles={downloadingFiles}
                              formatPrice={formatPrice}
                              parsePrice={parsePrice} // parsePrice 함수 전달
                              getFileIcon={getFileIcon}
                            />
                          ))}
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
                    );
                  })}
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

// ✅ OrderItemWithDownloads 컴포넌트에서도 직접 Supabase 호출 제거
function OrderItemWithDownloads({ 
  item, 
  orderId, 
  canDownload, 
  daysLeft, 
  onDownload, 
  downloadingFiles, 
  formatPrice,
  parsePrice, // parsePrice 함수 받기
  getFileIcon 
}) {
  const [productFiles, setProductFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductFiles = async () => {
      try {
        // ✅ products 테이블은 RLS가 비활성화되어 있으므로 직접 조회 가능
        const { getSupabase } = await import('@/lib/supabase');
        const supabase = getSupabase();
        
        const { data: product, error } = await supabase
          .from('products')
          .select('files')
          .eq('id', item.id)
          .single();

        if (error) {
          console.error('상품 조회 오류:', error);
          setProductFiles([]);
        } else {
          setProductFiles(product.files || []);
        }
      } catch (error) {
        console.error('상품 조회 중 오류:', error);
        setProductFiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProductFiles();
  }, [item.id]);

  return (
    <div className="bg-white p-4 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg w-12 h-12 flex items-center justify-center text-white text-xl">
            {item.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-800 truncate">{item.title}</h4>
            <p className="text-sm text-gray-500">수량: {item.quantity}개</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="font-bold text-gray-800">
            {formatPrice(parsePrice(item.price) * item.quantity)}
          </p>
        </div>
      </div>

      {/* 다운로드 섹션 */}
      {canDownload && productFiles.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">📁 다운로드</span>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
              {daysLeft}일 남음
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {productFiles.map((file) => {
              const downloadKey = `${orderId}-${item.id}-${file.id}`;
              const isDownloading = downloadingFiles.has(downloadKey);
              
              return (
                <button
                  key={file.id}
                  onClick={() => onDownload(orderId, item.id, file.id, file.filename)}
                  disabled={isDownloading}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isDownloading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
                  }`}
                  title={`${file.description} (${file.size})`}
                >
                  {getFileIcon(file.type)}
                  <span>{isDownloading ? '다운로드 중...' : file.filename}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 결제 대기 상태일 때 */}
      {!canDownload && (
        <div className="bg-yellow-50 rounded-lg p-3 mt-3">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⏳</span>
            <p className="text-xs text-yellow-800">
              결제 완료 후 다운로드가 가능합니다. 취소된 주문은 다운로드할 수 없습니다.
            </p>
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && canDownload && (
        <div className="bg-gray-50 rounded-lg p-3 mt-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
            <p className="text-xs text-gray-600">파일 정보를 불러오는 중...</p>
          </div>
        </div>
      )}
    </div>
  );
}