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

// 다른 결제 수단 아이콘 제거

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod] = useState('kakaopay'); // 카카오페이 고정
  
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

  const getPaymentConfig = (orderId, amount, customer) => {
    // V2 설정 - 정리된 전화번호 사용
    const baseConfig = {
      storeId: "store-cbb15c93-473c-4064-ab10-f36d17fd0895",
      paymentId: `payment-${orderId}`,
      orderName: cart.length > 1 
        ? `${cart[0].title} 외 ${cart.length - 1}건`
        : cart[0].title,
      totalAmount: amount,
      currency: "KRW",
      customer,
      // iOS Safari 리디렉트 모드 대비: paymentId를 포함해 주문완료 페이지에서 검증 폴백 가능
      redirectUrl: `${window.location.origin}/order/complete?orderId=${orderId}&paymentId=payment-${orderId}&uid=${encodeURIComponent(user?.id || '')}&v=2`,
    };
    return {
      ...baseConfig,
      channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
      payMethod: "EASY_PAY",
    };
  };

  const handlePayment = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 배송 정보 제거: 고객 정보는 사용자 메타데이터로 대체
    const customer = {
      fullName: user.user_metadata?.name || user.email?.split('@')[0] || '고객',
      email: user.email,
      // phoneNumber 생략 (undefined는 JSON에서 제거됨)
    };
    
    setIsLoading(true);
    
    try {
      // 주문 ID 생성 (text 타입에 맞게 수정)
      const orderId = `PS${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const amount = getTotalPrice();
      
      console.log('V2 결제 시도 - 금액:', amount, '장바구니:', cart, '결제방법:', paymentMethod);

      // 포트원 V2 스크립트 로드 대기
      await waitForPortOne();

      // V2 방식 결제 요청
      if (typeof window !== 'undefined' && window.PortOne) {
        const paymentConfig = getPaymentConfig(orderId, amount, customer);
        
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
          handlePaymentSuccess(response.paymentId, orderId, amount, cart, user.id);
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

  const handlePaymentSuccess = async (paymentId, merchantUid, amountValue, itemsValue, userIdValue) => {
    try {
      console.log('V2 결제 성공 처리 시작:', { paymentId, merchantUid });
      
      // ✅ 결제 완료 후 검증 - 인증된 요청으로 변경
      const verifyResponse = await makeAuthenticatedRequest('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: paymentId,
          orderId: merchantUid,
          items: itemsValue,
          totalAmount: amountValue,
          userId: userIdValue,
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
          <h2 className="text-xl font-semibold mb-4">결제 방법</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
              <div className="flex items-center">
                <KakaoPayLogo size={24} />
                <span className="ml-2 font-medium">카카오페이</span>
              </div>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                기본 결제수단
              </span>
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
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-md font-semibold transition-colors bg-yellow-400 hover:bg-yellow-500 text-black disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                <KakaoPayLogo size={20} />
                <span className="ml-2">{`카카오페이로 ${getTotalPrice().toLocaleString()}원 결제`}</span>
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