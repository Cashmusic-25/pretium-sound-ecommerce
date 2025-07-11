'use client'

import { useEffect, useState } from 'react'
import { useRoom } from '@/app/contexts/RoomContext'
import { format, addDays, startOfWeek } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function SchedulePage() {
  const { classes, rooms, loading } = useRoom()
  const [selectedDate, setSelectedDate] = useState(new Date())

  // 선택된 날짜의 수업 목록
  const todayClasses = classes.filter(cls => 
    cls.date === format(selectedDate, 'yyyy-MM-dd')
  )

  // 방 이름 매핑
  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId)
    return room?.name || '알 수 없는 방'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">일정을 불러오는 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">일정 관리</h1>
          <p className="text-gray-600">수업 일정을 확인하고 관리하세요.</p>
        </div>

        {/* 날짜 선택 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">날짜 선택</h2>
          <div className="flex space-x-2 overflow-x-auto">
            {Array.from({ length: 7 }, (_, i) => {
              const date = addDays(new Date(), i)
              const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
              
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-center min-w-[100px] ${
                    isSelected 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-sm">
                    {format(date, 'EEE', { locale: ko })}
                  </div>
                  <div className="font-semibold">
                    {format(date, 'M/d')}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 선택된 날짜의 일정 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {format(selectedDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })} 일정
            <span className="ml-2 text-sm text-gray-500">
              총 {todayClasses.length}개 수업
            </span>
          </h2>

          {todayClasses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">📅</div>
              <p className="text-gray-500">선택한 날짜에 예정된 수업이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayClasses
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((cls) => (
                <div 
                  key={cls.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        {cls.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {cls.description || '설명 없음'}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="flex items-center text-gray-700">
                          🕐 {cls.start_time} - {cls.end_time}
                        </span>
                        <span className="flex items-center text-gray-700">
                          🏢 {getRoomName(cls.room_id)}
                        </span>
                        {cls.teacher && (
                          <span className="flex items-center text-gray-700">
                            👨‍🏫 {cls.teacher}
                          </span>
                        )}
                        {cls.students && cls.students.length > 0 && (
                          <span className="flex items-center text-gray-700">
                            👥 {cls.students.length}명
                            {cls.max_students && ` / 최대 ${cls.max_students}명`}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      {cls.is_recurring && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          🔄 반복 수업
                        </span>
                      )}
                      {cls.isVirtual && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          📅 가상 일정
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 학생 목록 (있는 경우) */}
                  {cls.students && cls.students.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600 mb-1">참가 학생:</p>
                      <div className="flex flex-wrap gap-1">
                        {cls.students.map((student, idx) => (
                          <span 
                            key={idx}
                            className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {student}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 전체 통계 */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">이번 주 통계</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{classes.length}</div>
              <div className="text-sm text-blue-800">총 수업 수</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{rooms.length}</div>
              <div className="text-sm text-green-800">사용 가능한 방</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {classes.filter(cls => cls.is_recurring).length}
              </div>
              <div className="text-sm text-purple-800">반복 수업</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}