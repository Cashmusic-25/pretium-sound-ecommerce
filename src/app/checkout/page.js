'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 기본값: 카드
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    address: '',
    detailAddress: ''
  });
  
  const { items: cart = [], getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
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
        phoneNumber: cleanPhone, // 정리된 전화번호 사용
        email: user.email,
      },
      redirectUrl: `${window.location.origin}/order/complete?orderId=${orderId}`,
    };

    switch(method) {
      case 'kakaopay':
        return {
          ...baseConfig,
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
          payMethod: "EASY_PAY", // 카카오페이는 간편결제
        };
      case 'card':
        return {
          ...baseConfig,
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
          payMethod: "CARD", // 신용카드
        };
      case 'transfer':
        return {
          ...baseConfig,
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
          payMethod: "TRANSFER", // 계좌이체
        };
      case 'vbank':
        return {
          ...baseConfig,
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
          payMethod: "VIRTUAL_ACCOUNT", // 가상계좌
        };
      default:
        return {
          ...baseConfig,
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
          payMethod: "EASY_PAY", // 기본값: 간편결제
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
      // 주문 ID 생성 (UUID 형태)
      const orderId = crypto.randomUUID();
      const amount = getTotalPrice();
      
      console.log('V2 결제 시도 - 금액:', amount, '장바구니:', cart, '결제방법:', paymentMethod);

      // 서버에 주문 정보 사전 등록
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          userId: user.id,
          items: cart,
          totalAmount: amount,
          shippingAddress: shippingInfo,
          status: 'pending'
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('주문 생성 실패');
      }

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
      alert('결제 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId, merchantUid) => {
    try {
      console.log('V2 결제 성공 처리 시작:', { paymentId, merchantUid });
      
      // 결제 완료 후 검증
      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      <h1 className="text-3xl font-bold mb-8">주문/결제</h1>
      
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
            <div className="space-y-2">
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="payMethod" 
                  value="kakaopay"
                  checked={paymentMethod === 'kakaopay'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-2" 
                />
                <span className="flex items-center">
                  카카오페이
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">추천</span>
                </span>
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="payMethod" 
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-2" 
                />
                신용/체크카드
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="payMethod" 
                  value="transfer"
                  checked={paymentMethod === 'transfer'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-2" 
                />
                실시간 계좌이체
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="payMethod" 
                  value="vbank"
                  checked={paymentMethod === 'vbank'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-2" 
                />
                가상계좌
              </label>
            </div>
          </div>
          {/* 결제 버튼 바로 위에 추가 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4 mb-4">
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

          <button
            onClick={handlePayment}
            disabled={isLoading || !shippingInfo.name || !shippingInfo.phone || !shippingInfo.address}
            className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {isLoading ? '처리 중...' : 
             paymentMethod === 'kakaopay' ? `카카오페이로 ${getTotalPrice().toLocaleString()}원 결제` :
             `${getTotalPrice().toLocaleString()}원 결제하기`}
          </button>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            결제 시 개인정보 처리방침 및 이용약관에 동의한 것으로 간주합니다.
          </p>
        </div>
      </div>
    </div>
  );
}