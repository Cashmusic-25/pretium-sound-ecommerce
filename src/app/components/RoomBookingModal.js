import { useState, useEffect } from 'react'
import { X, Calendar, Clock, Users, MapPin } from 'lucide-react'
import { getAvailableRooms, subjectNames, facilityNames } from '../../data/roomHelpers'

export default function RoomBookingModal({ 
  isOpen, 
  onClose, 
  onSelectRoom, 
  dayOfWeek, 
  selectedTime, 
  duration = 60,
  selectedRoom = null,
  subject = null,
  existingBookings = []
}) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRoomState, setSelectedRoomState] = useState(selectedRoom)

  useEffect(() => {
    if (isOpen) {
      loadRooms()
    }
  }, [isOpen, subject, selectedTime, dayOfWeek])

  useEffect(() => {
    setSelectedRoomState(selectedRoom)
  }, [selectedRoom])

  const loadRooms = async () => {
    setLoading(true)
    try {
      const { getSupabase } = await import('../../lib/supabase')
      const supabase = getSupabase()

      const { data: roomsData, error } = await supabase
        .from('rooms')
        .select('*')
        .order('name')

      if (error) {
        console.error('방 정보 로드 오류:', error)
        return
      }

      // 과목과 시간에 맞는 방 필터링
      let filteredRooms = roomsData || []
      
      if (subject && selectedTime && dayOfWeek !== null && dayOfWeek !== undefined) {
        console.log('🏠 방 필터링 시작:', { 
          subject, 
          dayOfWeek, 
          selectedTime, 
          totalRooms: roomsData?.length 
        })
        filteredRooms = getAvailableRooms(
          roomsData || [], 
          subject, 
          dayOfWeek, 
          selectedTime, 
          existingBookings,
          duration
        )
        console.log('✅ 필터링된 방:', filteredRooms.length, '개')
      }

      setRooms(filteredRooms)
    } catch (error) {
      console.error('방 정보 로드 중 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoomSelect = (room) => {
    setSelectedRoomState(room.id)
  }

  const handleConfirm = () => {
    if (selectedRoomState) {
      const room = rooms.find(r => r.id === selectedRoomState)
      onSelectRoom(room)
      onClose()
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    const [hours, minutes] = timeString.split(':')
    return `${hours}:${minutes}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const calculateEndTime = (startTime, durationMinutes) => {
    if (!startTime) return ''
    const [hours, minutes] = startTime.split(':').map(Number)
    const endDate = new Date()
    endDate.setHours(hours, minutes + durationMinutes, 0, 0)
    return `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* 배경 오버레이 */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* 모달 컨테이너 */}
        <div className="inline-block w-full max-w-4xl px-6 py-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl sm:my-8">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">수업방 선택</h3>
              <p className="text-gray-600 mt-1">원하는 수업방을 선택해주세요</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 수업 정보 요약 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              예약 정보
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{dayOfWeek !== null && dayOfWeek !== undefined ? formatDate(new Date(dayOfWeek)) : '날짜 미선택'}</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span>
                  {selectedTime ? `${formatTime(selectedTime)} - ${calculateEndTime(selectedTime, duration)}` : '시간 미선택'}
                </span>
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                <span>{duration}분 수업</span>
              </div>
            </div>
          </div>

          {/* 방 목록 */}
          <div className="mb-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">방 정보를 불러오는 중...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedRoomState === room.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleRoomSelect(room)}
                  >
                    {/* 선택된 방 표시 */}
                    {selectedRoomState === room.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}

                    <div className="mb-3">
                      <h5 className="font-semibold text-gray-900 flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                        {room.name}
                      </h5>
                      <p className="text-sm text-gray-500 mt-1">{room.type}</p>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>수용 인원</span>
                        <span className="font-medium">{room.capacity || '정보 없음'}명</span>
                      </div>
                      
                      {/* 시설 정보 */}
                      {room.facilities && (
                        <div>
                          <span className="text-gray-500">보유 시설</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(() => {
                              try {
                                const facilities = typeof room.facilities === 'string' 
                                  ? JSON.parse(room.facilities) 
                                  : room.facilities || {}
                                
                                const activeFacilities = Object.entries(facilities)
                                  .filter(([key, value]) => value)
                                  .map(([key]) => facilityNames[key])
                                  .filter(Boolean)
                                  .slice(0, 3)
                                
                                return activeFacilities.length > 0 
                                  ? activeFacilities.map(facility => (
                                      <span key={facility} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        {facility}
                                      </span>
                                    ))
                                  : <span className="text-gray-400 text-xs">시설 정보 없음</span>
                              } catch {
                                return <span className="text-gray-400 text-xs">시설 정보 오류</span>
                              }
                            })()}
                          </div>
                        </div>
                      )}
                      
                      {room.description && (
                        <div>
                          <span className="text-gray-500">설명</span>
                          <p className="text-gray-700 mt-1">{room.description}</p>
                        </div>
                      )}
                    </div>

                    {/* 사용 가능 상태 표시 */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">상태</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          사용 가능
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && rooms.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                {subject ? (
                  <div>
                    <p className="text-gray-500 mb-2">
                      {subjectNames[subject] || subject} 수업이 가능한 방이 없습니다.
                    </p>
                    <p className="text-sm text-gray-400">
                      다른 시간을 선택하거나 관리자에게 문의해주세요.
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">등록된 방이 없습니다.</p>
                )}
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedRoomState}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedRoomState
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              선택 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 