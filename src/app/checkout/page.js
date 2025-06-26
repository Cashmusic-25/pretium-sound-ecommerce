'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

// 카카오페이 로고 컴포넌트 (실제 파일명 사용)
const KakaoPayLogo = ({ size = 20 }) => (
  <img 
    src="/images/payment_icon_yellow_large.png" 
    alt="카카오페이" 
    style={{ height: size, width: 'auto' }}
    className="inline-block"
  />
);

// 신용카드 아이콘
const CreditCardIcon = ({ size = 20 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block"
  >
    <rect x="2" y="6" width="20" height="12" rx="2" stroke="#666" strokeWidth="1.5" fill="none"/>
    <path d="M2 10h20" stroke="#666" strokeWidth="1.5"/>
    <rect x="5" y="13" width="4" height="2" rx="1" fill="#666"/>
  </svg>
);

// 계좌이체 아이콘
const BankIcon = ({ size = 20 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block"
  >
    <path d="M2 20h20v2H2v-2zM3.5 18h17l-2-8H5.5l-2 8zM12 2L2 8h20L12 2z" fill="#666"/>
    <rect x="6" y="11" width="2" height="5" fill="white"/>
    <rect x="11" y="11" width="2" height="5" fill="white"/>
    <rect x="16" y="11" width="2" height="5" fill="white"/>
  </svg>
);

// 가상계좌 아이콘
const VirtualAccountIcon = ({ size = 20 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block"
  >
    <rect x="3" y="6" width="18" height="12" rx="2" stroke="#666" strokeWidth="1.5" fill="none"/>
    <path d="M7 10h10M7 14h6" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="16" cy="14" r="1" fill="#666"/>
  </svg>
);

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('kakaopay'); // 기본값: 카카오페이
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    address: '',
    detailAddress: ''
  });
  
  const { items: cart = [], getTotalPrice, clearCart } = useCart();
  const { user, makeAuthenticatedRequest } = useAuth();
  const router = useRouter();

  // 디버깅용 코드
  useEffect(() => {
    console.log('Checkout 페이지 - cart:', cart);
    console.log('Checkout 페이지 - cart length:', cart.length);
    console.log('Checkout 페이지 - localStorage cart:', localStorage.getItem('cart'));
    console.log('Checkout 페이지 - getTotalPrice():', getTotalPrice());
  }, [cart]);

  // 포트원 V2 스크립트 로드 대기
  const waitForPortOne = () => {
    return new Promise((resolve) => {
      const checkPortOne = () => {
        if (typeof window !== 'undefined' && window.PortOne) {
          resolve(true);
        } else {
          setTimeout(checkPortOne, 100);
        }
      };
      checkPortOne();
    });
  };

  const getPaymentConfig = (method, orderId, amount, cleanPhone) => {
    // V2 설정 - 정리된 전화번호 사용
    const baseConfig = {
      storeId: "store-cbb15c93-473c-4064-ab10-f36d17fd0895",
      paymentId: `payment-${orderId}`,
      orderName: cart.length > 1 
        ? `${cart[0].title} 외 ${cart.length - 1}건`
        : cart[0].title,
      totalAmount: amount,
      currency: "KRW",
      customer: {
        fullName: shippingInfo.name.trim(),
        phoneNumber: cleanPhone,
        email: user.email,
      },
      redirectUrl: `${window.location.origin}/order/complete?orderId=${orderId}`,
    };

    switch(method) {
      case 'kakaopay':
        return {
          ...baseConfig,
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
          payMethod: "EASY_PAY",
        };
      case 'card':
        return {
          ...baseConfig,
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
          payMethod: "CARD",
        };
      case 'transfer':
        return {
          ...baseConfig,
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
          payMethod: "TRANSFER",
        };
      case 'vbank':
        return {
          ...baseConfig,
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
          payMethod: "VIRTUAL_ACCOUNT",
        };
      default:
        return {
          ...baseConfig,
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
          payMethod: "EASY_PAY",
        };
    }
  };

  const handlePayment = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 필수 입력값 검증
    if (!shippingInfo.name.trim()) {
      alert('수령인을 입력해주세요.');
      return;
    }

    if (!shippingInfo.phone.trim()) {
      alert('연락처를 입력해주세요.');
      return;
    }

    // 전화번호 형식 검증 및 정리
    const cleanPhone = shippingInfo.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      alert('올바른 전화번호 형식을 입력해주세요. (예: 010-1234-5678)');
      return;
    }

    if (!shippingInfo.address.trim()) {
      alert('주소를 입력해주세요.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 주문 ID 생성 (text 타입에 맞게 수정)
      const orderId = `PS${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const amount = getTotalPrice();
      
      console.log('V2 결제 시도 - 금액:', amount, '장바구니:', cart, '결제방법:', paymentMethod);

      // ✅ 서버에 주문 정보 사전 등록 - 인증된 요청으로 변경
      console.log('📦 주문 생성 요청 데이터:', {
        orderId,
        userId: user.id,
        items: cart,
        totalAmount: amount,
        shippingAddress: shippingInfo,
        status: 'pending'
      });

      const orderResponse = await makeAuthenticatedRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          userId: user.id,
          items: cart,
          totalAmount: amount,
          shippingAddress: shippingInfo,
          status: 'pending'
        }),
      });

      console.log('📦 주문 응답 상태:', orderResponse.status);
      console.log('📦 주문 응답 헤더:', Object.fromEntries(orderResponse.headers.entries()));

      let orderResult;
      try {
        orderResult = await orderResponse.json();
        console.log('📦 주문 응답 데이터:', orderResult);
      } catch (jsonError) {
        console.error('❌ JSON 파싱 실패:', jsonError);
        const responseText = await orderResponse.text();
        console.error('❌ 실제 응답 내용:', responseText);
        throw new Error(`서버 응답을 해석할 수 없습니다: ${responseText.slice(0, 200)}`);
      }

      if (!orderResponse.ok) {
        console.error('❌ 주문 생성 실패 상세:', {
          status: orderResponse.status,
          statusText: orderResponse.statusText,
          result: orderResult
        });
        throw new Error(orderResult?.error || orderResult?.message || `주문 생성 실패 (${orderResponse.status})`);
      }

      console.log('✅ 주문 생성 성공:', orderResult);

      // 포트원 V2 스크립트 로드 대기
      await waitForPortOne();

      // V2 방식 결제 요청
      if (typeof window !== 'undefined' && window.PortOne) {
        const paymentConfig = getPaymentConfig(paymentMethod, orderId, amount, cleanPhone);
        
        console.log('V2 결제 설정:', paymentConfig);
        
        // V2 결제 요청
        const response = await window.PortOne.requestPayment(paymentConfig);
        
        console.log('V2 결제 응답:', response);
        
        if (response.code != null) {
          // 결제 실패
          alert(`결제 실패: ${response.message}`);
          setIsLoading(false);
        } else {
          // 결제 성공
          handlePaymentSuccess(response.paymentId, orderId);
        }
      } else {
        alert('결제 모듈을 로드할 수 없습니다.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('결제 오류:', error);
      
      // 인증 관련 에러 처리
      if (error.message.includes('인증') || error.message.includes('토큰')) {
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        router.push('/');
      } else {
        alert(`결제 중 오류가 발생했습니다: ${error.message}`);
      }
      
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId, merchantUid) => {
    try {
      console.log('V2 결제 성공 처리 시작:', { paymentId, merchantUid });
      
      // ✅ 결제 완료 후 검증 - 인증된 요청으로 변경
      const verifyResponse = await makeAuthenticatedRequest('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: paymentId,
          orderId: merchantUid,
        }),
      });

      console.log('검증 응답 상태:', verifyResponse.status);
      
      if (verifyResponse.ok) {
        const result = await verifyResponse.json();
        console.log('검증 성공:', result);
        
        // 장바구니 비우기
        clearCart();
        // 완료 페이지로 이동
        router.push(`/order/complete?orderId=${merchantUid}&paymentId=${paymentId}`);
      } else {
        const errorData = await verifyResponse.json();
        console.error('검증 실패 응답:', errorData);
        throw new Error(`결제 검증 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
      
    } catch (error) {
      console.error('결제 검증 오류 상세:', error);
      alert(`결제는 완료되었지만 검증 중 오류가 발생했습니다: ${error.message}\n주문 내역을 확인해주세요.`);
      
      // 검증 실패해도 완료 페이지로 이동 (실제 결제는 성공했으므로)
      router.push(`/order/complete?orderId=${merchantUid}&paymentId=${paymentId}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-lg mb-4">로그인이 필요합니다.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-lg mb-4">장바구니가 비어있습니다.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            쇼핑 계속하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 헤더 영역 - 뒤로가기 버튼 포함 */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => router.push('/')}
          className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          title="홈으로 돌아가기"
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="text-gray-600"
          >
            <path 
              d="M19 12H5M12 19L5 12L12 5" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-3xl font-bold">주문/결제</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 주문 상품 정보 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">주문 상품</h2>
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between items-center py-3 border-b">
              <div>
                <h3 className="font-medium">{item.title}</h3>
                <p className="text-sm text-gray-600">수량: {item.quantity}</p>
              </div>
              <p className="font-semibold">{(parseInt(item.price.replace(/[₩,]/g, '')) * item.quantity).toLocaleString()}원</p>
            </div>
          ))}
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-lg font-bold">
              <span>총 결제금액</span>
              <span>{getTotalPrice().toLocaleString()}원</span>
            </div>
          </div>
        </div>

        {/* 배송 정보 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">배송 정보</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수령인 *
              </label>
              <input
                type="text"
                value={shippingInfo.name}
                onChange={(e) => setShippingInfo({...shippingInfo, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="이름을 입력하세요"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                연락처 *
              </label>
              <input
                type="tel"
                value={shippingInfo.phone}
                onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="010-0000-0000"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                주소 *
              </label>
              <input
                type="text"
                value={shippingInfo.address}
                onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="기본 주소"
                required
              />
              <input
                type="text"
                value={shippingInfo.detailAddress}
                onChange={(e) => setShippingInfo({...shippingInfo, detailAddress: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                placeholder="상세 주소"
              />
            </div>
          </div>

          {/* 결제 방법 선택 */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">결제 방법</h3>
            <div className="space-y-3">
              {/* 카카오페이 옵션 */}
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input 
                  type="radio" 
                  name="payMethod" 
                  value="kakaopay"
                  checked={paymentMethod === 'kakaopay'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-3" 
                />
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <KakaoPayLogo size={24} />
                    <span className="ml-2 font-medium">카카오페이</span>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                    추천
                  </span>
                </div>
              </label>

              {/* 신용카드 옵션 */}
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input 
                  type="radio" 
                  name="payMethod" 
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-3" 
                />
                <div className="flex items-center">
                  <CreditCardIcon size={24} />
                  <span className="ml-2">신용/체크카드</span>
                </div>
              </label>

              {/* 계좌이체 옵션 */}
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input 
                  type="radio" 
                  name="payMethod" 
                  value="transfer"
                  checked={paymentMethod === 'transfer'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-3" 
                />
                <div className="flex items-center">
                  <BankIcon size={24} />
                  <span className="ml-2">실시간 계좌이체</span>
                </div>
              </label>

              {/* 가상계좌 옵션 */}
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input 
                  type="radio" 
                  name="payMethod" 
                  value="vbank"
                  checked={paymentMethod === 'vbank'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-3" 
                />
                <div className="flex items-center">
                  <VirtualAccountIcon size={24} />
                  <span className="ml-2">가상계좌</span>
                </div>
              </label>
            </div>
          </div>

          {/* 서비스 제공 기간 안내 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6 mb-4">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center">
              <span className="mr-2">⏰</span>
              서비스 제공 기간 안내
            </h4>
            <div className="text-sm text-green-800 space-y-1">
              <p>• <strong>즉시 이용:</strong> 결제 완료 후 바로 다운로드 가능</p>
              <p>• <strong>이용 기간:</strong> 구매일로부터 2주간 다운로드 이용 가능</p>
              <p className="text-xs text-green-600 mt-2">
                ※ 한 번 다운로드한 파일은 영구적으로 이용하실 수 있습니다
              </p>
            </div>
          </div>

          {/* 결제 버튼 */}
          <button
            onClick={handlePayment}
            disabled={isLoading || !shippingInfo.name || !shippingInfo.phone || !shippingInfo.address}
            className={`w-full py-3 px-4 rounded-md font-semibold transition-colors ${
              paymentMethod === 'kakaopay' 
                ? 'bg-yellow-400 hover:bg-yellow-500 text-black' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:bg-gray-400 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                처리 중...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                {paymentMethod === 'kakaopay' && <KakaoPayLogo size={20} />}
                <span className={paymentMethod === 'kakaopay' ? 'ml-2' : ''}>
                  {paymentMethod === 'kakaopay' ? 
                    `카카오페이로 ${getTotalPrice().toLocaleString()}원 결제` :
                    `${getTotalPrice().toLocaleString()}원 결제하기`
                  }
                </span>
              </span>
            )}
          </button>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            결제 시 개인정보 처리방침 및 이용약관에 동의한 것으로 간주합니다.
          </p>
        </div>
      </div>
    </div>
  );
}