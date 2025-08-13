'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Header from '../../components/Header'
import { Calendar, Clock, User, MapPin, Edit, Send, ArrowLeft, AlertCircle } from 'lucide-react'
import { getAvailableRooms, subjectNames, facilityNames } from '../../../data/roomHelpers'

export default function ScheduleChangePage() {
  const { user, isStudent, loading, makeAuthenticatedRequest } = useAuth()
  const router = useRouter()
  const [enrollments, setEnrollments] = useState([])
  const [teachers, setTeachers] = useState([])
  const [rooms, setRooms] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [selectedEnrollment, setSelectedEnrollment] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [myRequests, setMyRequests] = useState([])
  const [activeTab, setActiveTab] = useState('enrollments') // enrollments, requests
  const [availableRooms, setAvailableRooms] = useState([]) // 과목에 맞는 사용 가능한 방들

  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

  const [requestData, setRequestData] = useState({
    requested_day_of_week: '',
    requested_lesson_time: '',
    requested_room_id: '',
    reason: ''
  })

  // 다음 수업까지의 시간 계산
  const getNextClassTime = (enrollment) => {
    const now = new Date()
    const currentDay = now.getDay() // 0 = 일요일
    const currentTime = now.getHours() * 100 + now.getMinutes() // HHMM 형식
    
    // 수업 요일과 시간
    const classDay = enrollment.day_of_week
    const classTime = parseInt(enrollment.lesson_time.replace(':', '')) // "14:30" -> 1430
    
    let targetDate = new Date(now)
    
    // 이번 주 수업일 찾기
    const daysUntilClass = (classDay - currentDay + 7) % 7
    
    if (daysUntilClass === 0) {
      // 같은 요일인 경우 시간 비교
      if (classTime <= currentTime) {
        // 이미 지났으면 다음 주
        targetDate.setDate(targetDate.getDate() + 7)
      }
    } else {
      // 다른 요일인 경우
      targetDate.setDate(targetDate.getDate() + daysUntilClass)
    }
    
    // 수업 시간 설정
    const [hours, minutes] = enrollment.lesson_time.split(':')
    targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    return targetDate
  }

  // 24시간 이내 확인
  const isWithin24Hours = (enrollment) => {
    const nextClassTime = getNextClassTime(enrollment)
    const now = new Date()
    const timeDiff = nextClassTime.getTime() - now.getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)
    
    return hoursDiff <= 24 && hoursDiff > 0
  }

  // 학생의 수업 등록 정보 로드
  const loadEnrollments = useCallback(async () => {
    if (!user || !isStudent()) return

    setLoadingData(true)
    try {
      const response = await makeAuthenticatedRequest('/api/student/enrollments')
      
      if (!response.ok) {
        throw new Error('수업 정보 로드 실패')
      }

      const data = await response.json()
      setEnrollments(data.enrollments || [])
      setTeachers(data.teachers || [])
      setRooms(data.rooms || [])
    } catch (error) {
      console.error('수업 정보 로드 오류:', error)
      alert('수업 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoadingData(false)
    }
  }, [user, isStudent, makeAuthenticatedRequest])

  // 내 일정변경 요청 목록 로드
  const loadMyRequests = useCallback(async () => {
    if (!user || !isStudent()) return

    try {
      console.log('🔍 loadMyRequests 시작')
      const response = await makeAuthenticatedRequest('/api/schedule-change-requests')
      
      console.log('📡 API 응답 상태:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API 오류 응답:', errorText)
        throw new Error(`요청 목록 로드 실패: ${response.status}`)
      }

      const data = await response.json()
      console.log('📦 API 응답 데이터:', data)
      
      // 응답 데이터 구조 확인 및 안전한 처리
      if (data && Array.isArray(data.requests)) {
        console.log('✅ 요청 목록 설정:', data.requests.length, '개')
        setMyRequests(data.requests)
      } else if (data && Array.isArray(data)) {
        console.log('✅ 배열 형태 응답, 요청 목록 설정:', data.length, '개')
        setMyRequests(data)
      } else {
        console.warn('⚠️ 예상치 못한 응답 구조:', data)
        setMyRequests([])
      }
    } catch (error) {
      console.error('❌ 요청 목록 로드 오류:', error)
      setMyRequests([])
    }
  }, [user, isStudent, makeAuthenticatedRequest])

  // 선택된 강사의 가능 시간 로드 (기존 수업 제외)
  const loadAvailableSlots = async (teacherId) => {
    try {
      // 1. 강사의 수업 가능 시간 조회
      const availabilityResponse = await fetch(`/api/teacher/availability/public?teacherId=${teacherId}`)
      
      if (!availabilityResponse.ok) {
        throw new Error('가능 시간 로드 실패')
      }

      const availabilityData = await availabilityResponse.json()
      
      if (!availabilityData.success) {
        throw new Error(availabilityData.error || '가능 시간 로드 실패')
      }
      
      // 2. 강사의 기존 수업 조회
      const { getSupabase } = await import('../../../lib/supabase')
      const supabase = getSupabase()
      
      const { data: existingClasses, error: classesError } = await supabase
        .from('classes')
        .select('day_of_week, start_time, duration')
        .eq('teacher_id', teacherId)
        .eq('status', 'active')
      
      if (classesError) {
        console.error('기존 수업 조회 오류:', classesError)
        setAvailableSlots(availabilityData.availability || [])
        return
      }
      
      // 3. 수업 가능 시간에서 기존 수업과 충돌하는 시간 제외
      const availableSlots = availabilityData.availability.filter(slot => {
        const conflictingClass = existingClasses.find(cls => 
          cls.day_of_week === slot.day_of_week &&
          cls.start_time === slot.start_time.substring(0, 5)
        )
        
        const isAvailable = !conflictingClass
        console.log(`⏰ ${slot.day_of_week}요일 ${slot.start_time}: ${isAvailable ? '가능' : '불가능'} (기존수업: ${conflictingClass ? '있음' : '없음'})`)
        
        return isAvailable
      })
      
      console.log('✅ 필터링된 수업 가능 시간:', availableSlots.length, '개')
      setAvailableSlots(availableSlots)
    } catch (error) {
      console.error('가능 시간 로드 오류:', error)
      setAvailableSlots([])
    }
  }

  useEffect(() => {
    if (!loading && !isStudent()) {
      router.push('/')
      return
    }

    if (!loading && isStudent() && user) {
      loadEnrollments()
      loadMyRequests()
    }
  }, [loading, isStudent, router, user, loadEnrollments, loadMyRequests])

  // 과목과 시간에 맞는 사용 가능한 방들 업데이트
  const updateAvailableRooms = useCallback(async (enrollment, dayOfWeek, lessonTime) => {
    console.log('🔍 updateAvailableRooms 시작:', { enrollment, dayOfWeek, lessonTime })
    
    if (!enrollment || dayOfWeek === '' || !lessonTime) {
      console.log('❌ 필수 파라미터 누락')
      setAvailableRooms([])
      return
    }

    console.log('📋 전체 방 목록:', rooms.length, '개')

    try {
      // 모든 등록 정보를 가져와서 기존 예약으로 사용
      const response = await makeAuthenticatedRequest('/api/student/enrollments')
      if (response.ok) {
        const data = await response.json()
        const existingBookings = data.enrollments || []
        
        // 과목 정보 (enrollment에 subject 필드가 있다고 가정, 없으면 'general' 사용)
        const subject = enrollment.subject || 'general'
        
        console.log('🎯 [getAvailableRooms] 호출 인자')
        console.log('rooms:', rooms)
        console.log('subject:', subject)
        console.log('dayOfWeek:', dayOfWeek)
        console.log('lessonTime:', lessonTime)
        console.log('existingBookings:', existingBookings)
        
        // 과목과 시간에 맞는 사용 가능한 방들 계산
        const available = getAvailableRooms(
          rooms, 
          subject, 
          parseInt(dayOfWeek), 
          lessonTime, 
          existingBookings
        )
        
        console.log('✅ [getAvailableRooms] 필터링 후 사용 가능한 방:', available.length, '개')
        console.log('📍 사용 가능한 방 목록:', available)
        
        setAvailableRooms(available)
      }
    } catch (error) {
      console.error('❌ 사용 가능한 방 계산 실패:', error)
      console.log('🔄 모든 방 표시로 대체')
      setAvailableRooms(rooms) // 실패 시 모든 방 표시
    }
  }, [rooms, makeAuthenticatedRequest])

  // 변경 요청 폼 열기
  const openRequestForm = async (enrollment) => {
    // 24시간 이내 확인
    if (isWithin24Hours(enrollment)) {
      const nextClassTime = getNextClassTime(enrollment)
      const hoursUntilClass = Math.round((nextClassTime.getTime() - new Date().getTime()) / (1000 * 60 * 60))
      
      alert(`수업 ${hoursUntilClass}시간 전입니다.\n수업 24시간 이내에는 일정변경을 신청할 수 없습니다.\n\n다음 수업 시간: ${nextClassTime.toLocaleString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit'
      })}`)
      return
    }

    setSelectedEnrollment(enrollment)
    setRequestData({
      requested_day_of_week: '',
      requested_lesson_time: '',
      requested_room_id: enrollment.room_id || '',
      reason: ''
    })
    setAvailableRooms([]) // 초기화
    setShowRequestForm(true)
    
    // 해당 강사의 가능 시간 로드
    await loadAvailableSlots(enrollment.teacher_id)
  }

  // 변경 요청 제출
  const submitChangeRequest = async () => {
    if (!selectedEnrollment || !requestData.requested_day_of_week || !requestData.requested_lesson_time || !requestData.reason.trim()) {
      alert('모든 필드를 입력해주세요.')
      return
    }

    setSubmitting(true)
    try {
      const response = await makeAuthenticatedRequest('/api/schedule-change-requests', {
        method: 'POST',
        body: JSON.stringify({
          class_id: selectedEnrollment.class_id,
          current_day_of_week: selectedEnrollment.day_of_week,
          current_lesson_time: selectedEnrollment.lesson_time,
          current_room_id: selectedEnrollment.room_id,
          requested_day_of_week: parseInt(requestData.requested_day_of_week),
          requested_lesson_time: requestData.requested_lesson_time,
          requested_room_id: requestData.requested_room_id || null,
          reason: requestData.reason
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '변경 요청 실패')
      }

      alert('수업 일정 변경 요청이 제출되었습니다. 강사 승인을 기다려주세요.')
      setShowRequestForm(false)
      setSelectedEnrollment(null)
      loadEnrollments() // 목록 새로고침
      loadMyRequests() // 요청 목록 새로고침
    } catch (error) {
      console.error('변경 요청 오류:', error)
      alert(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.user_id === teacherId)
    return teacher?.user_profiles?.name || '알 수 없음'
  }

  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId)
    return room?.name || '지정 안됨'
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isStudent()) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>뒤로가기</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">수업 일정 변경 요청</h1>
                <p className="text-gray-600 mt-2">
                  등록한 수업의 요일이나 시간을 변경하고 싶을 때 요청해주세요.
                </p>
              </div>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('enrollments')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'enrollments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  내 수업 ({enrollments.length})
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'requests'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  변경 요청 내역 ({myRequests.length})
                  {myRequests.some(req => req.status === 'pending') && (
                    <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                      대기중
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>

          {/* 현재 등록된 수업 목록 */}
          {activeTab === 'enrollments' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Calendar className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  현재 등록된 수업 ({enrollments.length}개)
                </h2>
              </div>
            </div>

            {enrollments.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">등록된 수업이 없습니다</h3>
                <p className="text-gray-600 mb-4">먼저 수업을 등록해주세요.</p>
                <button
                  onClick={() => router.push('/')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  홈으로 가기
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex items-center space-x-2">
                            <User className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-gray-900">
                              {enrollment.teacher_profile?.name || '알 수 없음'}
                            </span>
                          </div>
                          {enrollment.teacher_profile?.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span>📞</span>
                              <span>{enrollment.teacher_profile.phone}</span>
                            </div>
                          )}
                          {enrollment.teacher_profile?.email && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span>✉️</span>
                              <span>{enrollment.teacher_profile.email}</span>
                            </div>
                          )}
                          {enrollment.subject && (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {subjectNames[enrollment.subject] || enrollment.subject}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <Clock className="w-5 h-5 text-green-600" />
                            <span className="text-gray-700">
                              {enrollment.lesson_duration}분 수업
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {dayNames[enrollment.day_of_week]} {enrollment.lesson_time}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>{getRoomName(enrollment.room_id)}</span>
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              enrollment.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {enrollment.status === 'active' ? '활성' : '비활성'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {(() => {
                        const within24Hours = isWithin24Hours(enrollment)
                        const isDisabled = enrollment.status !== 'active' || within24Hours
                        
                        return (
                          <div className="flex flex-col items-end space-y-2">
                            <button
                              onClick={() => openRequestForm(enrollment)}
                              disabled={isDisabled}
                              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                isDisabled 
                                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              <Edit className="w-4 h-4" />
                              <span>변경 요청</span>
                            </button>
                            
                            {within24Hours && (
                              <div className="text-xs text-red-600 text-right">
                                ⏰ 수업 24시간 이내<br/>
                                변경 불가
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* 변경 요청 내역 */}
          {activeTab === 'requests' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">변경 요청 내역</h2>
                <p className="text-sm text-gray-600 mt-1">
                  제출한 일정변경 요청의 처리 상태를 확인할 수 있습니다.
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {myRequests.length > 0 ? (
                  myRequests.map((request) => (
                    <div key={request.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">
                                {request.classes?.title || '수업 정보 없음'}
                              </h3>
                              <div className="flex items-center space-x-2 mt-1">
                                {request.classes?.subject && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {subjectNames[request.classes.subject] || request.classes.subject}
                                  </span>
                                )}
                                <span className="text-xs text-gray-400">
                                  요청 #{request.id.slice(0, 8)}
                                </span>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              request.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : request.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {request.status === 'pending' && '⏳ 대기 중'}
                              {request.status === 'approved' && '✅ 승인됨'}
                              {request.status === 'rejected' && '❌ 거부됨'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              <p className="font-medium text-gray-700">현재 일정</p>
                              <p>{dayNames[request.current_day_of_week]} {request.current_lesson_time}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">희망 일정</p>
                              <p>{dayNames[request.requested_day_of_week]} {request.requested_lesson_time}</p>
                            </div>
                          </div>
                          
                          <div className="text-sm mb-3">
                            <p className="font-medium text-gray-700 mb-1">요청 사유:</p>
                            <p className="text-gray-600 bg-gray-50 p-2 rounded">{request.reason}</p>
                          </div>

                          {request.status === 'rejected' && request.rejection_reason && (
                            <div className="text-sm mb-3">
                              <p className="font-medium text-red-700 mb-1">거절 사유:</p>
                              <p className="text-red-600 bg-red-50 p-3 rounded border border-red-200">
                                💬 <strong>강사님 메시지:</strong><br/>
                                {request.rejection_reason}
                              </p>
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500">
                            요청일: {new Date(request.created_at).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">아직 제출한 변경 요청이 없습니다.</p>
                    <p className="text-sm text-gray-400 mt-2">
                      '내 수업' 탭에서 변경하고 싶은 수업의 "변경 요청" 버튼을 클릭하세요.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 변경 요청 폼 모달 */}
          {showRequestForm && selectedEnrollment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">수업 일정 변경 요청</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedEnrollment.teacher_profile?.name || '알 수 없음'} 강사님 수업
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* 현재 수업 정보 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">현재 수업 정보</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• 요일: {dayNames[selectedEnrollment.day_of_week]}</p>
                      <p>• 시간: {selectedEnrollment.lesson_time}</p>
                      <p>• 수업방: {getRoomName(selectedEnrollment.room_id)}</p>
                    </div>
                  </div>

                  {/* 변경 희망 정보 */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">변경 희망 정보</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 요일 선택 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          변경 희망 요일
                        </label>
                        <select
                          value={requestData.requested_day_of_week}
                          onChange={(e) => {
                            const newDayOfWeek = e.target.value
                            setRequestData({ 
                              ...requestData, 
                              requested_day_of_week: newDayOfWeek, 
                              requested_lesson_time: '',
                              requested_room_id: '' // 방 선택도 초기화
                            })
                            setAvailableRooms([]) // 방 목록 초기화
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">요일 선택</option>
                          {Array.from(new Set(availableSlots.map(slot => slot.day_of_week))).map(dayOfWeek => (
                            <option key={dayOfWeek} value={dayOfWeek}>
                              {dayNames[dayOfWeek]}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 수업방 선택 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          변경 희망 수업방
                          {selectedEnrollment?.subject && (
                            <span className="text-sm text-gray-500 ml-2">
                              ({subjectNames[selectedEnrollment.subject] || selectedEnrollment.subject} 수업 가능한 방만 표시)
                            </span>
                          )}
                        </label>
                        <select
                          value={requestData.requested_room_id}
                          onChange={(e) => setRequestData({ ...requestData, requested_room_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={!requestData.requested_lesson_time}
                        >
                          <option value="">
                            {!requestData.requested_lesson_time 
                              ? '먼저 시간을 선택해주세요' 
                              : availableRooms.length > 0 
                                ? '방 선택' 
                                : '사용 가능한 방이 없습니다'
                            }
                          </option>
                          {availableRooms.map(room => (
                            <option key={room.id} value={room.id}>
                              {room.name} (정원: {room.capacity}명) 
                              {(() => {
                                try {
                                  const facilities = typeof room.facilities === 'string' 
                                    ? JSON.parse(room.facilities) 
                                    : room.facilities || {}
                                  const activeFacilities = Object.entries(facilities)
                                    .filter(([key, value]) => value)
                                    .map(([key]) => facilityNames[key] || key)
                                    .slice(0, 2)
                                  return activeFacilities.length > 0 ? ` - ${activeFacilities.join(', ')}` : ''
                                } catch {
                                  return ''
                                }
                              })()}
                            </option>
                          ))}
                        </select>
                        {requestData.requested_lesson_time && availableRooms.length === 0 && (
                          <p className="text-sm text-red-600 mt-1">
                            ⚠️ 선택한 시간에 {selectedEnrollment?.subject ? `${subjectNames[selectedEnrollment.subject]} 수업이 가능한` : ''} 방이 없습니다. 다른 시간을 선택해주세요.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 시간 선택 */}
                    {requestData.requested_day_of_week && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          변경 희망 시간
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {availableSlots
                            .filter(slot => slot.day_of_week === parseInt(requestData.requested_day_of_week))
                            .map(slot => (
                              <label key={`${slot.day_of_week}-${slot.start_time}`} className="cursor-pointer">
                                <input
                                  type="radio"
                                  name="requested_lesson_time"
                                  value={slot.start_time}
                                  checked={requestData.requested_lesson_time === slot.start_time}
                                  onChange={async (e) => {
                                    const newTime = e.target.value
                                    setRequestData({ 
                                      ...requestData, 
                                      requested_lesson_time: newTime,
                                      requested_room_id: '' // 방 선택 초기화 
                                    })
                                    
                                    // 사용 가능한 방 업데이트
                                    if (selectedEnrollment && requestData.requested_day_of_week && newTime) {
                                      await updateAvailableRooms(selectedEnrollment, requestData.requested_day_of_week, newTime)
                                    }
                                  }}
                                  className="sr-only"
                                />
                                <div className={`p-3 border rounded-lg text-center transition-all ${
                                  requestData.requested_lesson_time === slot.start_time
                                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                                    : 'bg-white border-gray-300 hover:bg-gray-50'
                                }`}>
                                  <div className="text-sm font-medium">
                                    {slot.start_time} ~ {slot.end_time}
                                  </div>
                                </div>
                              </label>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* 변경 사유 */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        변경 사유 *
                      </label>
                      <textarea
                        value={requestData.reason}
                        onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="수업 일정을 변경하려는 이유를 입력해주세요"
                        required
                      />
                    </div>
                  </div>

                  {/* 안내 메시지 */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">변경 요청 안내</p>
                        <ul className="space-y-1">
                          <li>• 강사님의 승인 후 일정이 변경됩니다.</li>
                          <li>• 요청이 승인되기 전까지는 기존 일정으로 수업이 진행됩니다.</li>
                          <li>• 변경 요청은 취소할 수 있지만, 승인 후에는 취소가 어려울 수 있습니다.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowRequestForm(false)}
                    disabled={submitting}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={submitChangeRequest}
                    disabled={submitting || !requestData.requested_day_of_week || !requestData.requested_lesson_time || !requestData.reason.trim()}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? '요청 중...' : '변경 요청'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 