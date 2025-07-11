'use client'

import { useEffect, useState } from 'react'
import { useRoom } from '@/app/contexts/RoomContext'
import RoomLayout from '@/components/room/RoomLayout'

export default function RoomsPage() {
  const { rooms, loading } = useRoom()

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