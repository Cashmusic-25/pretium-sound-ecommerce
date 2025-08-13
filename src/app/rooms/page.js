'use client'

import { useEffect, useState } from 'react'
import { useRoom } from '@/app/contexts/RoomContext'
import RoomLayout from '@/components/room/RoomLayout'
import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function RoomsPage() {
  const { rooms, loading } = useRoom()
  const { userProfile } = useAuth()
  const router = useRouter()

  // 학생 접근 차단
  if (userProfile && userProfile.role === 'student') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <div className="text-xl font-semibold text-gray-800 mb-2">접근 권한이 없습니다</div>
          <div className="text-gray-600 mb-4">이 페이지는 강사와 관리자만 이용할 수 있습니다.</div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">방 정보를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">방 예약</h1>
          <p className="text-gray-600">
            실시간 방 사용 현황을 확인하고 예약하세요. 
            <span className="inline-block ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              총 {rooms.length}개 방 운영 중
            </span>
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <RoomLayout />
        </div>
      </div>
    </div>
  )
}