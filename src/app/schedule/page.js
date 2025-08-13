'use client'

import { useEffect, useState } from 'react'
import { useRoom } from '@/app/contexts/RoomContext'
import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { format, addDays, startOfWeek } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Plus, ArrowLeft, Save, X } from 'lucide-react'

export default function SchedulePage() {
  const { classes, rooms, loading, addClass } = useRoom()
  const { user, isAdmin, isTeacher, isStudent, userProfile, makeAuthenticatedRequest } = useAuth()
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  // 학생은 이 페이지에 접근할 수 없음
  useEffect(() => {
    if (userProfile && userProfile.role === 'student') {
      router.push('/')
      return
    }
  }, [userProfile, router])
  const [showAddModal, setShowAddModal] = useState(false)
  
  // 학생 개인 수업 일정
  const [studentLessons, setStudentLessons] = useState([])
  const [loadingStudentLessons, setLoadingStudentLessons] = useState(false)

  // 새 수업 폼 데이터
  const [newClass, setNewClass] = useState({
    title: '',
    description: '',
    room_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:30',
    teacher: '',
    max_students: 20,
    students: [],
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_type: 'finite',
    recurrence_end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd')
  })

  // 새 학생 이름 입력
  const [newStudentName, setNewStudentName] = useState('')
  
  // 등록된 학생 목록 (임시 데이터 - 실제로는 API에서 가져와야 함)
  const [registeredStudents, setRegisteredStudents] = useState([
    { id: 1, name: '김학생', email: 'student1@test.com' },
    { id: 2, name: '이학생', email: 'student2@test.com' },
    { id: 3, name: '박학생', email: 'student3@test.com' },
    { id: 4, name: '최학생', email: 'student4@test.com' },
    { id: 5, name: '정학생', email: 'student5@test.com' }
  ])
  const [selectedStudentId, setSelectedStudentId] = useState('')

  // 학생 수업 일정 로드
  const loadStudentLessons = async () => {
    if (!user || !isStudent()) return

    setLoadingStudentLessons(true)
    try {
      const response = await makeAuthenticatedRequest('/api/student/enrollments')
      
      if (!response.ok) {
        throw new Error('수업 정보 로드 실패')
      }

      const data = await response.json()
      console.log('📚 학생 수업 일정 로드:', data.enrollments?.length || 0, '개')
      setStudentLessons(data.enrollments || [])
    } catch (error) {
      console.error('❌ 학생 수업 정보 로드 오류:', error)
      setStudentLessons([])
    } finally {
      setLoadingStudentLessons(false)
    }
  }

  // 디버그용 - 사용자 정보 출력
  useEffect(() => {
    console.log('=== 사용자 정보 디버그 ===');
    console.log('user:', user);
    console.log('userProfile:', userProfile);
    console.log('isAdmin():', isAdmin());
    console.log('isTeacher():', isTeacher());
    console.log('isStudent():', isStudent());
    console.log('========================');
  }, [user, userProfile, isAdmin, isTeacher, isStudent]);

  // 학생 수업 데이터 로드
  useEffect(() => {
    if (user && isStudent()) {
      loadStudentLessons()
    }
  }, [user, isStudent]);

  // 수업 추가 핸들러
  const handleAddClass = async (e) => {
    e.preventDefault()

    let classData = {
      ...newClass,
      students: newClass.students.filter(student => student.trim() !== ''),
    }

    // 강사라면 본인 정보 자동 입력
    if (isTeacher()) {
      classData.teacher = userProfile?.name || user?.email || '강사';
      classData.created_by = user.id;
    }

    try {
      await addClass(classData)
      // 폼 초기화
      setNewClass({
        title: '',
        description: '',
        room_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '10:30',
        teacher: '',
        max_students: 20,
        students: [],
        is_recurring: false,
        recurrence_pattern: 'weekly',
        recurrence_type: 'finite',
        recurrence_end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd')
      })
      setShowAddModal(false)
      alert('수업이 성공적으로 추가되었습니다!')
    } catch (error) {
      console.error('Add class error:', error)
      const errorMessage = error.message.includes('이미 다른 수업이 예약')
        ? `⚠️ 시간 충돌!\n\n${error.message}\n\n다른 시간을 선택해주세요.`
        : `수업 추가 실패: ${error.message}`
      alert(errorMessage)
    }
  }

  // 학생 추가
  const addStudent = () => {
    if (selectedStudentId) {
      const selectedStudent = registeredStudents.find(s => s.id === parseInt(selectedStudentId))
      if (selectedStudent && !newClass.students.some(s => s.id === selectedStudent.id)) {
        setNewClass({
          ...newClass,
          students: [...newClass.students, selectedStudent]
        })
        setSelectedStudentId('')
      }
    }
  }

  // 학생 제거
  const removeStudent = (studentId) => {
    setNewClass({
      ...newClass,
      students: newClass.students.filter(s => s.id !== studentId)
    })
  }

  // 선택된 날짜의 수업 목록 (강사/관리자용 classes + 학생용 lessons)
  const todayClasses = classes.filter(cls => 
    cls.date === format(selectedDate, 'yyyy-MM-dd')
  )

  // 학생용 개인 수업 일정 (요일 기반)
  const todayStudentLessons = studentLessons.filter(lesson => {
    const selectedDayOfWeek = selectedDate.getDay()
    return lesson.day_of_week === selectedDayOfWeek && lesson.status === 'active'
  })

  // 전체 일정 (classes + student lessons)
  const allTodaySchedules = [
    ...todayClasses.map(cls => ({ ...cls, type: 'class' })),
    ...todayStudentLessons.map(lesson => ({ ...lesson, type: 'student_lesson' }))
  ].sort((a, b) => {
    const timeA = a.type === 'class' ? a.start_time : a.lesson_time
    const timeB = b.type === 'class' ? b.start_time : b.lesson_time
    return timeA.localeCompare(timeB)
  })

  // 방 이름 매핑
  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId)
    return room?.name || '알 수 없는 방'
  }

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
          <div className="text-xl text-gray-600">일정을 불러오는 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm hover:shadow-md transition-all"
            >
              <ArrowLeft size={16} />
              <span>뒤로가기</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">일정 관리</h1>
              <p className="text-gray-600">수업 일정을 확인하고 관리하세요.</p>
            </div>
          </div>
          {(isAdmin() || isTeacher()) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={20} />
              <span>일정 추가</span>
            </button>
          )}
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
              총 {allTodaySchedules.length}개 일정
            </span>
          </h2>

          {allTodaySchedules.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">📅</div>
              <p className="text-gray-500">선택한 날짜에 예정된 수업이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allTodaySchedules.map((schedule) => (
                <div 
                  key={`${schedule.type}-${schedule.id}`} 
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    schedule.type === 'student_lesson' 
                      ? 'border-purple-200 bg-purple-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        {schedule.type === 'student_lesson' 
                          ? `${schedule.subject === 'piano' ? '피아노' : (schedule.subject || '일반')} 개인 레슨`
                          : schedule.title
                        }
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {schedule.type === 'student_lesson' 
                          ? `${schedule.lesson_duration}분 개인 수업`
                          : (schedule.description || '설명 없음')
                        }
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="flex items-center text-gray-700">
                          🕐 {schedule.type === 'student_lesson' 
                            ? `${schedule.lesson_time.substring(0, 5)} (${schedule.lesson_duration}분)`
                            : `${schedule.start_time} - ${schedule.end_time}`
                          }
                        </span>
                        <span className="flex items-center text-gray-700">
                          🏢 {getRoomName(schedule.room_id)}
                        </span>
                        {schedule.type === 'student_lesson' ? (
                          <span className="flex items-center text-purple-700">
                            💜 개인 수업
                          </span>
                        ) : (
                          <>
                            {schedule.teacher && (
                              <span className="flex items-center text-gray-700">
                                👨‍🏫 {schedule.teacher}
                              </span>
                            )}
                            {schedule.students && schedule.students.length > 0 && (
                              <span className="flex items-center text-gray-700">
                                👥 {schedule.students.length}명
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      {schedule.type === 'student_lesson' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          👤 개인 레슨
                        </span>
                      ) : (
                        <>
                          {schedule.is_recurring && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              🔄 반복 수업
                            </span>
                          )}
                          {schedule.isVirtual && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              📅 가상 일정
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* 학생 목록 (있는 경우) */}
                  {schedule.type === 'class' && schedule.students && schedule.students.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600 mb-1">참가 학생:</p>
                      <div className="flex flex-wrap gap-1">
                        {schedule.students.map((student, idx) => (
                          <span 
                            key={idx}
                            className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {student.name}
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

      {/* 일정 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">새 일정 추가</h3>
            
            <form onSubmit={handleAddClass} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    수업명 *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClass.title}
                    onChange={(e) => setNewClass({...newClass, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 수학 기초"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    강의실 *
                  </label>
                  <select
                    required
                    value={newClass.room_id}
                    onChange={(e) => setNewClass({...newClass, room_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">강의실 선택</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={newClass.description}
                  onChange={(e) => setNewClass({...newClass, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="수업에 대한 설명을 입력하세요"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    날짜 *
                  </label>
                  <input
                    type="date"
                    required
                    value={newClass.date}
                    onChange={(e) => setNewClass({...newClass, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작 시간 *
                  </label>
                  <input
                    type="time"
                    required
                    value={newClass.start_time}
                    onChange={(e) => setNewClass({...newClass, start_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료 시간 *
                  </label>
                  <input
                    type="time"
                    required
                    value={newClass.end_time}
                    onChange={(e) => setNewClass({...newClass, end_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    강사
                  </label>
                  <input
                    type="text"
                    value={newClass.teacher}
                    onChange={(e) => setNewClass({...newClass, teacher: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="강사 이름"
                    readOnly={isTeacher()}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최대 학생 수
                  </label>
                  <input
                    type="number"
                    value={newClass.max_students}
                    onChange={(e) => setNewClass({...newClass, max_students: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>

              {/* 학생 관리 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  참가 학생
                </label>
                <div className="flex space-x-2 mb-2">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">학생 선택</option>
                    {registeredStudents.map(student => (
                      <option key={student.id} value={student.id}>{student.name} ({student.email})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addStudent}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    추가
                  </button>
                </div>
                
                {newClass.students.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newClass.students.map((student, index) => (
                      <span
                        key={student.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {student.name}
                        <button
                          type="button"
                          onClick={() => removeStudent(student.id)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 반복 설정 */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    checked={newClass.is_recurring}
                    onChange={(e) => setNewClass({...newClass, is_recurring: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="is_recurring" className="text-sm font-medium text-gray-700">
                    반복 수업으로 설정
                  </label>
                </div>
                
                {newClass.is_recurring && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        반복 패턴
                      </label>
                      <select
                        value={newClass.recurrence_pattern}
                        onChange={(e) => setNewClass({...newClass, recurrence_pattern: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="daily">매일</option>
                        <option value="weekly">매주</option>
                        <option value="biweekly">격주</option>
                        <option value="monthly">매월</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        반복 유형
                      </label>
                      <select
                        value={newClass.recurrence_type}
                        onChange={(e) => setNewClass({...newClass, recurrence_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="finite">기간 제한</option>
                        <option value="infinite">무제한</option>
                      </select>
                    </div>
                    
                    {newClass.recurrence_type === 'finite' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          종료 날짜
                        </label>
                        <input
                          type="date"
                          value={newClass.recurrence_end_date}
                          onChange={(e) => setNewClass({...newClass, recurrence_end_date: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Save size={16} />
                  <span>저장</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors flex items-center justify-center space-x-2"
                >
                  <X size={16} />
                  <span>취소</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}