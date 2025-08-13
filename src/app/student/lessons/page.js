'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Header from '../../components/Header'
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Edit, 
  BookOpen, 
  ArrowLeft, 
  Music,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

export default function StudentLessonsPage() {
  const { user, isStudent, loading, makeAuthenticatedRequest } = useAuth()
  const router = useRouter()
  const [enrollments, setEnrollments] = useState([])
  const [teachers, setTeachers] = useState([])
  const [rooms, setRooms] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState('')

  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

  // 권한 체크
  useEffect(() => {
    if (!loading && (!user || !isStudent())) {
      router.push('/')
      return
    }
  }, [user, isStudent, loading, router])

  // 학생의 수업 등록 정보 로드
  const loadEnrollments = useCallback(async () => {
    if (!user || !isStudent()) {
      console.log('사용자 인증 실패 - user:', !!user, 'isStudent:', isStudent())
      return
    }

    setLoadingData(true)
    setError('')
    try {
      console.log('🔍 수업 정보 로드 시작 - 사용자:', user.id)
      
      const response = await makeAuthenticatedRequest('/api/student/enrollments')
      
      console.log('📡 API 응답 상태:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API 에러 응답:', errorText)
        throw new Error(`수업 정보 로드 실패 (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      console.log('✅ 수업 데이터 로드 성공:', data)
      
      setEnrollments(data.enrollments || [])
      setTeachers(data.teachers || [])
      setRooms(data.rooms || [])
    } catch (error) {
      console.error('수업 정보 로드 오류:', error)
      console.error('에러 세부사항:', {
        message: error.message,
        stack: error.stack
      })
      setError(`수업 정보를 불러오는데 실패했습니다: ${error.message}`)
    } finally {
      setLoadingData(false)
    }
  }, [user, isStudent, makeAuthenticatedRequest])

  useEffect(() => {
    loadEnrollments()
  }, [loadEnrollments])

  // 헬퍼 함수들
  // API 구조 변경: teacher_profile, room_name이 enrollment에 직접 포함됨
  // getTeacherInfo, getRoomName 불필요

  const getStatusDisplay = (status) => {
    const statusMap = {
      active: { text: '수강 중', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
      paused: { text: '일시정지', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle },
      completed: { text: '완료', color: 'text-blue-600', bg: 'bg-blue-100', icon: CheckCircle },
      cancelled: { text: '취소됨', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle }
    }
    return statusMap[status] || statusMap.active
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <div className="text-xl text-gray-600">수업 정보를 불러오는 중...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user || !isStudent()) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>뒤로가기</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">내 수업</h1>
                <p className="text-gray-600 mt-1">등록된 수업 목록을 확인하세요</p>
              </div>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* 수업 목록 */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <BookOpen className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  등록된 수업 ({enrollments.length}개)
                </h2>
              </div>
            </div>

            {enrollments.length === 0 ? (
              <div className="p-12 text-center">
                <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">등록된 수업이 없습니다</h3>
                <p className="text-gray-600 mb-4">음악 학원에서 수업을 신청해보세요!</p>
                <button
                  onClick={() => router.push('/')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  홈으로 가기
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {enrollments.map((enrollment) => {
                  const teacherInfo = enrollment.teacher_profile
                  const statusDisplay = getStatusDisplay(enrollment.status)
                  const StatusIcon = statusDisplay.icon

                  return (
                    <div key={enrollment.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* 상태와 과목 */}
                          <div className="flex items-center space-x-3 mb-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.bg} ${statusDisplay.color}`}>
                              <StatusIcon size={16} className="mr-1" />
                              {statusDisplay.text}
                            </span>
                            {enrollment.subject && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                <Music size={16} className="mr-1" />
                                {enrollment.subject}
                              </span>
                            )}
                          </div>

                          {/* 강사 정보 */}
                          {teacherInfo && (
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="flex items-center space-x-2">
                                <User className="w-5 h-5 text-blue-600" />
                                <span className="font-medium text-gray-900">{teacherInfo.name} 강사님</span>
                              </div>
                              {teacherInfo.email && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <Mail className="w-4 h-4" />
                                  <span>{teacherInfo.email}</span>
                                </div>
                              )}
                              {teacherInfo.phone && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <Phone className="w-4 h-4" />
                                  <span>{teacherInfo.phone}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* 수업 정보 그리드 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-green-600" />
                              <span className="text-gray-700">
                                매주 {dayNames[enrollment.day_of_week]}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-orange-600" />
                              <span className="text-gray-700">
                                {enrollment.lesson_time} ({enrollment.lesson_duration}분)
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-purple-600" />
                              <span className="text-gray-700">
                                {enrollment.room_name || '지정 안됨'}
                              </span>
                            </div>
                          </div>

                          {/* 추가 정보 */}
                          <div className="mt-3 text-xs text-gray-500">
                            <div className="flex items-center space-x-4">
                              <span>등록일: {new Date(enrollment.created_at).toLocaleDateString('ko-KR')}</span>
                              {enrollment.start_date && (
                                <span>수업 시작: {new Date(enrollment.start_date).toLocaleDateString('ko-KR')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* 액션 버튼 */}
                        <div className="flex flex-col space-y-2 ml-4">
                          <button
                            onClick={() => router.push('/student/schedule-change')}
                            disabled={enrollment.status !== 'active'}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                          >
                            <Edit className="w-4 h-4" />
                            <span>일정 변경</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 도움말 */}
          {enrollments.length > 0 && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-medium text-blue-900 mb-2">💡 도움말</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 수업 일정을 변경하고 싶으시면 "일정 변경" 버튼을 클릭하세요</li>
                <li>• 수업 관련 문의사항은 담당 강사님께 직접 연락해주세요</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 