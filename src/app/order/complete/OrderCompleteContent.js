'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function OrderCompleteContent() {
  const [orderData, setOrderData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingFiles, setDownloadingFiles] = useState(new Set());
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const orderId = searchParams.get('orderId');
  const paymentId = searchParams.get('paymentId');

  useEffect(() => {
    if (orderId) {
      fetchOrderData();
    } else {
      setError('주문 정보가 없습니다.');
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrderData = async () => {
    try {
      // 주문 정보 조회
      const orderResponse = await fetch(`/api/orders/${orderId}`);
      if (orderResponse.ok) {
        const orderResult = await orderResponse.json();
        
        console.log('🔍 전체 주문 데이터:', orderResult);
        console.log('🔍 주문 아이템들:', orderResult.order?.items);
        
        setOrderData(orderResult.order);
      }
  
      // 결제 정보가 있다면 조회
      if (paymentId) {
        const paymentResponse = await fetch(`/api/payments/${paymentId}`);
        if (paymentResponse.ok) {
          const paymentResult = await paymentResponse.json();
          
          console.log('💳 전체 결제 데이터:', paymentResult);
          
          setPaymentData(paymentResult.payment);
        }
      }
    } catch (error) {
      console.error('데이터 조회 오류:', error);
      setError('주문 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 상품 정보 조회 함수 (files 정보 포함)
  const fetchProductWithFiles = async (productId) => {
    try {
      const { getSupabase } = await import('../../../lib/supabase'); // 경로 수정
      const supabase = getSupabase();
      
      const { data: product, error } = await supabase
        .from('products')
        .select('files')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('상품 조회 오류:', error);
        return null;
      }

      return product;
    } catch (error) {
      console.error('상품 조회 중 오류:', error);
      return null;
    }
  };

  // 파일 다운로드 함수
  const handleDownload = async (productId, fileId, filename) => {
    if (!user?.id) {
      alert('로그인이 필요합니다.');
      return;
    }

    const downloadKey = `${productId}-${fileId}`;
    
    // 이미 다운로드 중이면 중복 요청 방지
    if (downloadingFiles.has(downloadKey)) {
      return;
    }

    try {
      setDownloadingFiles(prev => new Set(prev).add(downloadKey));

      console.log('📥 다운로드 시작:', { orderId, fileId, filename });

      const response = await fetch(
        `/api/download/${orderId}/${fileId}?userId=${user.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '다운로드 실패');
      }

      // 다운로드 링크로 리다이렉트
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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
      case 'pdf': return '📄';
      case 'audio': return '🎵';
      case 'archive': return '📦';
      case 'video': return '🎬';
      default: return '📁';
    }
  };

  const getStatusDisplay = (status) => {
    const statusMap = {
      'pending': { text: '결제 대기', color: 'text-yellow-600', bg: 'bg-yellow-100' },
      'processing': { text: '결제 완료', color: 'text-green-600', bg: 'bg-green-100' },
      'shipped': { text: '배송중', color: 'text-blue-600', bg: 'bg-blue-100' },
      'delivered': { text: '배송완료', color: 'text-green-600', bg: 'bg-green-100' },
      'cancelled': { text: '취소됨', color: 'text-red-600', bg: 'bg-red-100' }
    };
    return statusMap[status] || { text: status, color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const getPaymentMethodDisplay = (method) => {
    if (typeof method === 'object' && method !== null) {
      if (method.type === 'PaymentMethodEasyPay' && method.provider === 'KAKAOPAY') {
        return '카카오페이';
      }
      if (method.type === 'PaymentMethodEasyPay' && method.provider) {
        return method.provider;
      }
      if (method.provider === 'KAKAOPAY' || method.provider === 'kakaopay') {
        return '카카오페이';
      }
      if (method.easyPayMethod) {
        return `${method.easyPayMethod} (간편결제)`;
      }
      if (method.type === 'EASY_PAY') {
        return '간편결제';
      }
      if (method.type) {
        return method.type;
      }
      if (method.provider) {
        return method.provider;
      }
      return '간편결제';
    }
    
    const methodMap = {
      'CARD': '신용/체크카드',
      'TRANSFER': '실시간 계좌이체',
      'VIRTUAL_ACCOUNT': '가상계좌',
      'MOBILE': '휴대폰 결제',
      'KAKAOPAY': '카카오페이',
      'NAVERPAY': '네이버페이',
      'PAYCO': '페이코',
      'TOSSPAY': '토스페이',
      'EASY_PAY': '간편결제'
    };
    
    return methodMap[method] || method || '알 수 없음';
  };

  // 가격을 안전하게 숫자로 변환하는 함수
  const parsePrice = (priceValue) => {
    if (typeof priceValue === 'number') {
      return priceValue;
    }
    if (typeof priceValue === 'string') {
      return parseInt(priceValue.replace(/[₩,원]/g, '')) || 0;
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-lg">주문 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">{error || '주문을 찾을 수 없습니다'}</h1>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/orders')}
              className="block w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-2"
            >
              주문 내역 보기
            </button>
            <button
              onClick={() => router.push('/')}
              className="block w-full bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusDisplay(orderData.status);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 text-center">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">주문이 완료되었습니다!</h1>
          <p className="text-blue-100">주문해 주셔서 감사합니다.</p>
        </div>

        {/* 주문 정보 */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-2">주문 정보</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">주문번호:</span>
                  <span className="font-mono">{orderData.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">주문일시:</span>
                  <span>{new Date(orderData.created_at).toLocaleString('ko-KR')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">주문상태:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bg}`}>
                    {statusInfo.text}
                  </span>
                </div>
              </div>
            </div>

            {paymentData && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2">결제 정보</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">결제번호:</span>
                    <span className="font-mono">{paymentData.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">결제방법:</span>
                    <span>{getPaymentMethodDisplay(paymentData.method)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">결제금액:</span>
                    <span className="font-semibold">
                        {typeof paymentData.amount === 'object' 
                        ? (paymentData.amount?.total || paymentData.amount?.value || 0).toLocaleString()
                        : (paymentData.amount || 0).toLocaleString()
                        }원
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 주문 상품 */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">주문 상품</h3>
            <div className="space-y-6">
              {orderData.items.map((item, index) => {
                const daysLeft = getDownloadDaysLeft(orderData.created_at);
                
                return (
                  <ProductWithDownloads
                    key={index}
                    item={item}
                    canDownload={canDownload(orderData.status)}
                    daysLeft={daysLeft}
                    onDownload={handleDownload}
                    downloadingFiles={downloadingFiles}
                    parsePrice={parsePrice}
                    getFileIcon={getFileIcon}
                  />
                );
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t-2 border-gray-300">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>총 결제금액</span>
                <span className="text-blue-600">{orderData.total_amount.toLocaleString()}원</span>
              </div>
            </div>
          </div>

          {/* 배송 정보 */}
          {orderData.shipping_address && (
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4">배송 정보</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">수령인:</span>
                    <span className="ml-2 font-medium">{orderData.shipping_address.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">연락처:</span>
                    <span className="ml-2">{orderData.shipping_address.phone}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-gray-600">주소:</span>
                    <span className="ml-2">
                      {orderData.shipping_address.address}
                      {orderData.shipping_address.detailAddress && `, ${orderData.shipping_address.detailAddress}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push('/orders')}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-semibold transition-colors"
            >
              주문 내역 보기
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-md hover:bg-gray-300 font-semibold transition-colors"
            >
              계속 쇼핑하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 상품별 다운로드 컴포넌트
function ProductWithDownloads({ 
  item, 
  canDownload, 
  daysLeft, 
  onDownload, 
  downloadingFiles, 
  parsePrice, 
  getFileIcon 
}) {
  const [productFiles, setProductFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductFiles = async () => {
      try {
        const { getSupabase } = await import('../../../lib/supabase'); // 경로 수정
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
    <div className="border border-gray-200 rounded-lg p-4">
      {/* 상품 정보 */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h4 className="font-medium text-lg">{item.title}</h4>
          <p className="text-sm text-gray-600">수량: {item.quantity}개</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{(parsePrice(item.price) * item.quantity).toLocaleString()}원</p>
          <p className="text-sm text-gray-600">단가: {parsePrice(item.price).toLocaleString()}원</p>
        </div>
      </div>

      {/* 다운로드 섹션 */}
      {canDownload && productFiles.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium text-blue-800">📁 다운로드 가능한 파일</h5>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
              {daysLeft}일 남음
            </span>
          </div>
          
          <div className="space-y-2">
            {productFiles.map((file) => {
              const downloadKey = `${item.id}-${file.id}`;
              const isDownloading = downloadingFiles.has(downloadKey);
              
              return (
                <div key={file.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {getFileIcon(file.type)}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{file.filename}</p>
                      <p className="text-xs text-gray-500">{file.description} • {file.size}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onDownload(item.id, file.id, file.filename)}
                    disabled={isDownloading}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isDownloading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isDownloading ? '다운로드 중...' : '다운로드'}
                  </button>
                </div>
              );
            })}
          </div>
          
          <div className="mt-3 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
            <p className="text-xs text-yellow-800">
              ⚠️ 다운로드 링크는 보안을 위해 1시간 후 만료됩니다. 
              구매일로부터 2주간 다운로드 가능합니다.
            </p>
          </div>
        </div>
      )}

      {/* 결제 대기 상태일 때 */}
      {!canDownload && (
        <div className="bg-yellow-50 rounded-lg p-4 mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⏳</span>
            <p className="text-sm text-yellow-800">
              결제 완료 후 다운로드가 가능합니다.
            </p>
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && canDownload && (
        <div className="bg-gray-50 rounded-lg p-4 mt-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
            <p className="text-sm text-gray-600">파일 정보를 불러오는 중...</p>
          </div>
        </div>
      )}
    </div>
  );
}