'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import Header from '../../components/Header'

function OrderCompleteContent() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('orderNumber')

  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
              <CheckCircle size={48} className="text-green-500" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              🎉 주문이 완료되었습니다!
            </h1>
            
            <p className="text-xl text-gray-600 mb-8">
              주문번호: <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded">
                {orderNumber || 'N/A'}
              </span>
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="font-bold text-blue-800 mb-2">📧 주문 확인</h3>
              <p className="text-blue-700 text-sm">
                주문 확인 메일이 발송되었습니다. 주문 내역은 마이페이지에서도 확인하실 수 있습니다.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/orders'}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <span>📦 주문 내역 보기</span>
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full border-2 border-gray-300 text-gray-600 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all duration-300"
              >
                🛒 쇼핑 계속하기
              </button>
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">📞 고객센터</h4>
              <p className="text-sm text-gray-600">
                주문 관련 문의: <span className="font-mono text-indigo-600">1588-1234</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">주문 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderCompletePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Suspense fallback={<LoadingFallback />}>
        <OrderCompleteContent />
      </Suspense>
    </div>
  )
}