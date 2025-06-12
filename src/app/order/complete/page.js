'use client';

import { Suspense } from 'react';
import OrderCompleteContent from './OrderCompleteContent';

// 로딩 컴포넌트
function OrderCompleteLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-lg">주문 정보를 불러오는 중...</p>
      </div>
    </div>
  );
}

export default function OrderCompletePage() {
  return (
    <Suspense fallback={<OrderCompleteLoading />}>
      <OrderCompleteContent />
    </Suspense>
  );
}