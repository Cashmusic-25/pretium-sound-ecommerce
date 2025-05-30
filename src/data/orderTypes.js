// 주문 상태 타입
export const ORDER_STATUS = {
    PENDING: 'pending',           // 결제 대기
    PROCESSING: 'processing',     // 처리 중
    SHIPPED: 'shipped',          // 배송 중
    DELIVERED: 'delivered',      // 배송 완료
    CANCELLED: 'cancelled'       // 취소됨
  }
  
  // 결제 방법 타입
  export const PAYMENT_METHODS = {
    CARD: 'card',               // 신용카드
    BANK_TRANSFER: 'bank',      // 계좌이체
    VIRTUAL_ACCOUNT: 'virtual', // 가상계좌
    PHONE: 'phone'              // 휴대폰 결제
  }
  
  // 배송 방법 타입
  export const SHIPPING_METHODS = {
    STANDARD: {
      id: 'standard',
      name: '일반배송',
      price: 0,
      description: '2-3일 소요 (무료배송)'
    },
    EXPRESS: {
      id: 'express',
      name: '익일배송',
      price: 3000,
      description: '다음날 도착 (3,000원)'
    },
    SAME_DAY: {
      id: 'same_day',
      name: '당일배송',
      price: 5000,
      description: '당일 도착 (5,000원)'
    }
  }
  
  // 주문 생성 템플릿
  export const createOrder = (orderData) => {
    return {
      id: Date.now(),
      orderNumber: generateOrderNumber(),
      ...orderData,
      createdAt: new Date().toISOString(),
      status: ORDER_STATUS.PENDING
    }
  }
  
  // 주문번호 생성
  export const generateOrderNumber = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    
    return `PS${year}${month}${day}${random}`
  }
  
  // 주문 상태 한글 변환
  export const getOrderStatusLabel = (status) => {
    const labels = {
      [ORDER_STATUS.PENDING]: '결제 대기',
      [ORDER_STATUS.PROCESSING]: '처리 중',
      [ORDER_STATUS.SHIPPED]: '배송 중',
      [ORDER_STATUS.DELIVERED]: '배송 완료',
      [ORDER_STATUS.CANCELLED]: '취소됨'
    }
    return labels[status] || '알 수 없음'
  }
  
  // 결제 방법 한글 변환
  export const getPaymentMethodLabel = (method) => {
    const labels = {
      [PAYMENT_METHODS.CARD]: '신용카드',
      [PAYMENT_METHODS.BANK_TRANSFER]: '계좌이체',
      [PAYMENT_METHODS.VIRTUAL_ACCOUNT]: '가상계좌',
      [PAYMENT_METHODS.PHONE]: '휴대폰 결제'
    }
    return labels[method] || '알 수 없음'
  }