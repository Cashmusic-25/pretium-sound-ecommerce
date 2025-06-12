'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false);
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

  // 포트원 스크립트 로드 대기
  const waitForIMP = () => {
    return new Promise((resolve) => {
      const checkIMP = () => {
        if (typeof window !== 'undefined' && window.IMP) {
          resolve(true);
        } else {
          setTimeout(checkIMP, 100);
        }
      };
      checkIMP();
    });
  };

  const handlePayment = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 주문 ID 생성 (UUID 형태)
      const orderId = crypto.randomUUID();
      const amount = getTotalPrice();
      
      console.log('결제 시도 - 금액:', amount, '장바구니:', cart);

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

      // 포트원 스크립트 로드 대기
      await waitForIMP();

      // V1 방식 결제 요청
      if (typeof window !== 'undefined' && window.IMP) {
        // 포트원 V1 초기화
        window.IMP.init(process.env.NEXT_PUBLIC_PORTONE_STORE_ID);
        
        // V1 결제 요청 - KG이니시스 (MID 포함)
        window.IMP.request_pay({
          pg: 'inicis_unified.MIliasTest', // MID 추가
          pay_method: 'card',
          merchant_uid: orderId,
          name: cart.length > 1 
            ? `${cart[0].title} 외 ${cart.length - 1}건`
            : cart[0].title,
          amount: amount,
          buyer_name: shippingInfo.name,
          buyer_tel: shippingInfo.phone,
          buyer_email: user.email,
          buyer_addr: shippingInfo.address,
          buyer_postcode: '12345',
        }, (response) => {
          if (response.success) {
            // 결제 성공
            handlePaymentSuccess(response.imp_uid, response.merchant_uid);
          } else {
            // 결제 실패
            alert(`결제 실패: ${response.error_msg}`);
            setIsLoading(false);
          }
        });
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

  const handlePaymentSuccess = async (impUid, merchantUid) => {
    try {
      // 결제 완료 후 검증
      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: impUid,
          orderId: merchantUid,
        }),
      });

      if (verifyResponse.ok) {
        // 장바구니 비우기
        clearCart();
        // 완료 페이지로 이동
        router.push(`/order/complete?orderId=${merchantUid}&paymentId=${impUid}`);
      } else {
        throw new Error('결제 검증 실패');
      }
      
    } catch (error) {
      console.error('결제 검증 오류:', error);
      alert('결제 검증 중 오류가 발생했습니다.');
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
                <input type="radio" name="payMethod" defaultChecked className="mr-2" />
                신용/체크카드
              </label>
              <label className="flex items-center">
                <input type="radio" name="payMethod" className="mr-2" />
                실시간 계좌이체
              </label>
              <label className="flex items-center">
                <input type="radio" name="payMethod" className="mr-2" />
                가상계좌
              </label>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={isLoading || !shippingInfo.name || !shippingInfo.phone || !shippingInfo.address}
            className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {isLoading ? '처리 중...' : `${getTotalPrice().toLocaleString()}원 결제하기`}
          </button>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            결제 시 개인정보 처리방침 및 이용약관에 동의한 것으로 간주합니다.
          </p>
        </div>
      </div>
    </div>
  );
}