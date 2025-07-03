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

// 다운로드 기간 설정 (1년)
export const DOWNLOAD_SETTINGS = {
  DOWNLOAD_PERIOD_DAYS: 365,        // 1년 = 365일
  DOWNLOAD_LINK_EXPIRES_HOURS: 1,   // 다운로드 링크 만료 시간 (1시간)
  MAX_DOWNLOAD_ATTEMPTS: 10         // 최대 다운로드 시도 횟수
}

// 법적 조치 관련 문구
export const LEGAL_NOTICES = {
  COPYRIGHT_WARNING: "⚠️ 저작권 보호 안내: 본 교재는 저작권법에 의해 보호받습니다. 무단 복제, 배포, 공유 시 법적 조치를 받을 수 있습니다.",
  DOWNLOAD_TERMS: "구매하신 교재는 개인 학습 목적으로만 사용해주시기 바랍니다.",
  FULL_LEGAL_NOTICE: "본 교재는 저작권법에 의해 보호받습니다. 무단 복제, 배포, 공유, 재판매 시 법적 조치를 받을 수 있습니다. 구매하신 교재는 개인 학습 목적으로만 사용해주시기 바랍니다."
}

// 주문 생성 템플릿
export const createOrder = (orderData) => {
  return {
    id: Date.now(),
    orderNumber: generateOrderNumber(),
    ...orderData,
    createdAt: new Date().toISOString(),
    status: ORDER_STATUS.PENDING,
    downloadExpiresAt: new Date(Date.now() + DOWNLOAD_SETTINGS.DOWNLOAD_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString()
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

// 다운로드 가능 여부 확인
export const canDownloadOrder = (orderStatus, createdAt) => {
  // 주문 상태 확인
  if (orderStatus !== ORDER_STATUS.PROCESSING && orderStatus !== ORDER_STATUS.DELIVERED) {
    return { canDownload: false, reason: '결제가 완료되지 않은 주문입니다.' }
  }
  
  // 다운로드 기간 확인
  const orderDate = new Date(createdAt)
  const now = new Date()
  const daysDiff = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24))
  
  if (daysDiff > DOWNLOAD_SETTINGS.DOWNLOAD_PERIOD_DAYS) {
    return { 
      canDownload: false, 
      reason: '다운로드 기간이 만료되었습니다. 고객센터에 문의해주세요.',
      expiredDays: daysDiff 
    }
  }
  
  return { 
    canDownload: true, 
    remainingDays: DOWNLOAD_SETTINGS.DOWNLOAD_PERIOD_DAYS - daysDiff 
  }
}

// 다운로드 남은 일수 계산
export const getDownloadDaysLeft = (createdAt) => {
  const orderDate = new Date(createdAt)
  const now = new Date()
  const daysDiff = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24))
  return Math.max(0, DOWNLOAD_SETTINGS.DOWNLOAD_PERIOD_DAYS - daysDiff)
}

// 다운로드 링크 만료 시간 계산
export const getDownloadLinkExpiresAt = () => {
  return new Date(Date.now() + DOWNLOAD_SETTINGS.DOWNLOAD_LINK_EXPIRES_HOURS * 60 * 60 * 1000)
}