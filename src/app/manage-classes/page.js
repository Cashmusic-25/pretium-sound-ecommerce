'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Calendar, Clock, Users, Search, 
  CheckCircle, XCircle, AlertCircle, Edit,
  Bell, User, MapPin, MessageSquare, Save, X, Trash2 
} from 'lucide-react'

export default function ManageClassesPage() {
  const { user, isTeacher, makeAuthenticatedRequest, userProfile } = useAuth()
  const router = useRouter()
  const [myClasses, setMyClasses] = useState([])
  const [myStudents, setMyStudents] = useState([])
  const [scheduleRequests, setScheduleRequests] = useState([])
  const [availability, setAvailability] = useState([])
  const [currentClasses, setCurrentClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('classes') // classes, students, requests, availability
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingRequest, setRejectingRequest] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  // 학생번호 매핑 상태
  const [studentNumberMap, setStudentNumberMap] = useState({})
  // 학생정보 매핑 상태 (번호+전화)
  const [studentInfoMap, setStudentInfoMap] = useState({})
  
  // 수업 수정 관련 상태
  const [editingClass, setEditingClass] = useState(null)
  const [editFormData, setEditFormData] = useState({
    title: '',
    subject: '',
    description: '',
    room_id: '',
    day_of_week: 1,
    start_time: '09:00',
    duration: 60,
    student_names: []
  })
  const [rooms, setRooms] = useState([])
  const [showRoomSelection, setShowRoomSelection] = useState(false)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [teacherSubjects, setTeacherSubjects] = useState([])
  const [autoAttendanceStatus, setAutoAttendanceStatus] = useState('')

  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  
  const [newSlot, setNewSlot] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
    is_available: true
  })

  const [editSlot, setEditSlot] = useState({})

  // 과목 코드를 한글명으로 변환하는 함수
  const getSubjectName = (subjectCode) => {
    const subjectMapping = {
      'piano': '피아노',
      'drum': '드럼',
      'guitar': '기타',
      'bass': '베이스기타',
      'vocal': '보컬',
      'composition': '작곡',
      'general': '음악이론'
    }
    return subjectMapping[subjectCode] || subjectCode
  }

  // 한글 과목명을 영어 코드로 변환하는 함수
  const getSubjectCode = (subjectName) => {
    const reverseMapping = {
      '피아노': 'piano',
      '드럼': 'drum',
      '기타': 'guitar',
      '베이스기타': 'bass',
      '보컬': 'vocal',
      '작곡': 'composition',
      '음악이론': 'general',
      '바이올린': 'general',
      '첼로': 'general',
      '플루트': 'general',
      '색소폰': 'general',
      '미디': 'composition',
      '재즈': 'general',
      '시창청음': 'general',
      '클래식': 'general'
    }
    return reverseMapping[subjectName] || 'general'
  }

  // 과목별 필요한 장비 매핑
  const getRequiredFacilities = (subject) => {
    const facilityMapping = {
      'piano': ['piano'],
      'drum': ['drum_set'],
      'guitar': ['guitar', 'amp'],
      'bass': ['guitar', 'amp'],
      'vocal': ['microphone', 'speakers'],
      'composition': ['midi_computer', 'audio_interface'],
      'general': ['music_stand']
    }
    return facilityMapping[subject] || []
  }

  // 방이 과목에 적합한지 확인
  const isRoomSuitableForSubject = (room, subject) => {
    if (!room.facilities || !subject) return true // 기본값
    
    try {
      const facilities = typeof room.facilities === 'string' 
        ? JSON.parse(room.facilities) 
        : room.facilities
      
      const requiredFacilities = getRequiredFacilities(subject)
      
      // 필요한 장비가 하나라도 있으면 적합
      return requiredFacilities.some(facility => facilities[facility])
    } catch (error) {
      console.error('방 장비 정보 파싱 오류:', error)
      return true // 오류 시 기본값
    }
  }

  // 방이 선택된 시간에 사용 가능한지 확인
  const isRoomAvailableAtTime = (roomId, dayOfWeek, startTime, duration, excludeClassId = null) => {
    const conflictingClasses = myClasses.filter(cls => 
      cls.room_id === roomId &&
      cls.day_of_week === dayOfWeek &&
      cls.id !== excludeClassId
    )

    if (conflictingClasses.length === 0) return true

    const newStartTime = startTime
    const newEndTime = calculateEndTime(startTime, duration)

    return !conflictingClasses.some(cls => {
      const clsEndTime = calculateEndTime(cls.start_time, cls.duration || 60)
      
      return (
        (newStartTime >= cls.start_time && newStartTime < clsEndTime) ||
        (newEndTime > cls.start_time && newEndTime <= clsEndTime) ||
        (newStartTime <= cls.start_time && newEndTime >= clsEndTime)
      )
    })
  }

  // 종료 시간 계산 함수
  const calculateEndTime = (startTime, durationMinutes) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
  }

  // 필터링된 방 목록 가져오기
  const getAvailableRooms = () => {
    return rooms.filter(room => {
      // 과목에 적합한지 확인
      const suitableForSubject = isRoomSuitableForSubject(room, editFormData.subject)
      
      // 시간에 사용 가능한지 확인
      const availableAtTime = isRoomAvailableAtTime(
        room.id, 
        editFormData.day_of_week, 
        editFormData.start_time, 
        editFormData.duration,
        editingClass?.id
      )
      
      return suitableForSubject && availableAtTime
    })
  }

  // 방 이름 가져오기
  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId)
    return room?.name || '알 수 없는 방'
  }



  // 강사 권한 확인
  useEffect(() => {
    if (!loading && (!user || !isTeacher())) {
      router.push('/')
    }
  }, [user, isTeacher, loading, router])

  // 데이터 로드
  useEffect(() => {
    if (user && isTeacher()) {
      loadTeacherData()
    }
  }, [user, isTeacher])

  // 학생번호 매핑 fetch
  const fetchStudentNumbers = useCallback(async () => {
    try {
      const res = await fetch('/api/student-numbers') // 별도 API 필요
      if (res.ok) {
        const data = await res.json()
        // { user_id: student_number } 형태로 변환
        const map = {}
        data.forEach(row => { map[row.user_id] = row.student_number })
        setStudentNumberMap(map)
      }
    } catch (e) { console.error('학생번호 fetch 실패:', e) }
  }, [])

  useEffect(() => { fetchStudentNumbers() }, [fetchStudentNumbers])

  // 학생정보 매핑 fetch
  const fetchStudentInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/student-info')
      if (res.ok) {
        const data = await res.json()
        const map = {}
        data.forEach(row => { map[row.user_id] = row })
        setStudentInfoMap(map)
      }
    } catch (e) { console.error('학생정보 fetch 실패:', e) }
  }, [])

  useEffect(() => { fetchStudentInfo() }, [fetchStudentInfo])

  // 방 목록 로드
  const loadRooms = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/rooms')
      if (response.ok) {
        const data = await response.json()
        setRooms(data.rooms || [])
      }
    } catch (error) {
      console.error('방 목록 로드 실패:', error)
    }
  }

  // 강사 과목 목록 로드
  const loadTeacherSubjects = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/teacher/profile')
      if (response.ok) {
        const data = await response.json()
        setTeacherSubjects(data.profile?.subjects || [])
      }
    } catch (error) {
      console.error('강사 과목 로드 실패:', error)
      // 실패 시 기본 과목 목록 사용
      setTeacherSubjects(['피아노', '드럼', '기타', '베이스기타', '보컬', '작곡', '음악이론'])
    }
  }



  // 자동 출석 처리 상태 확인
  const checkAutoAttendanceStatus = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/attendance/status')
      if (response.ok) {
        const data = await response.json()
        
        if (data.total_classes > 0) {
          if (data.pending_classes.length > 0) {
            if (data.is_after_auto_time) {
              setAutoAttendanceStatus(`오늘 ${data.total_classes}개 수업 중 ${data.pending_classes.length}개가 12시 자동 출석 처리 대기 중입니다.`)
            } else {
              setAutoAttendanceStatus(`오늘 ${data.total_classes}개 수업이 12시에 자동 출석 처리됩니다.`)
            }
          } else {
            setAutoAttendanceStatus(`오늘 ${data.total_classes}개 수업이 모두 자동 출석 처리되었습니다.`)
          }
        } else {
          setAutoAttendanceStatus('오늘은 수업이 없습니다.')
        }
      }
    } catch (error) {
      console.error('자동 출석 상태 확인 실패:', error)
      // API 호출 실패 시 기본 로직 사용
      const today = new Date().toISOString().split('T')[0]
      const dayOfWeek = new Date().getDay()
      const todayClasses = myClasses.filter(cls => cls.day_of_week === dayOfWeek)
      
      if (todayClasses.length > 0) {
        setAutoAttendanceStatus(`오늘 ${todayClasses.length}개 수업이 자동 출석 처리됩니다.`)
      } else {
        setAutoAttendanceStatus('오늘은 수업이 없습니다.')
      }
    }
  }

  // 강사의 모든 데이터 로드
  const loadTeacherData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadMyClasses(),
        loadMyStudents(),
        loadScheduleRequests(),
        loadAvailability(),
        loadRooms(),
        loadTeacherSubjects()
      ])
      // 데이터 로드 후 자동 출석 상태 확인
      setTimeout(checkAutoAttendanceStatus, 100)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 내 수업 로드
  const loadMyClasses = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/teacher/classes')
      if (response.ok) {
        const data = await response.json()
        setMyClasses(data.classes || [])
      }
    } catch (error) {
      console.error('수업 로드 실패:', error)
    }
  }

  // 내 학생들 로드
  const loadMyStudents = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/teacher/students')
      if (response.ok) {
        const data = await response.json()
        setMyStudents(data.enrollments || [])
      }
    } catch (error) {
      console.error('학생 로드 실패:', error)
    }
  }

  // 일정변경 요청 로드
  const loadScheduleRequests = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/schedule-change-requests')
      
      if (response.ok) {
        const data = await response.json()
        setScheduleRequests(data.requests || [])
      } else {
        const errorData = await response.json()
        console.error('API 에러:', errorData)
      }
    } catch (error) {
      console.error('일정변경 요청 로드 실패:', error)
    }
  }

  // 일정변경 요청 승인
  const handleApproveRequest = async (requestId) => {
    await handleScheduleRequest(requestId, 'approve')
  }

  // 일정변경 요청 거부 모달 열기
  const openRejectModal = (request) => {
    setRejectingRequest(request)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  // 일정변경 요청 거부 처리
  const handleRejectRequest = async () => {
    if (!rejectionReason.trim()) {
      alert('거절 사유를 입력해주세요.')
      return
    }

    await handleScheduleRequest(rejectingRequest.id, 'reject', rejectionReason)
    setShowRejectModal(false)
    setRejectingRequest(null)
    setRejectionReason('')
  }

  // 일정변경 요청 승인/거부 공통 처리
  const handleScheduleRequest = async (requestId, action, reason = null) => {
    try {
      const requestBody = { action }
      if (action === 'reject' && reason) {
        requestBody.rejectionReason = reason
      }
      
      const response = await makeAuthenticatedRequest(`/api/schedule-change-requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const data = await response.json()
        alert(action === 'approve' ? '일정변경이 승인되었습니다.' : '일정변경이 거부되었습니다.')
        loadScheduleRequests() // 목록 새로고침
        loadMyClasses() // 수업 목록도 새로고침
      } else {
        const errorData = await response.json()
        console.error('API 에러 응답:', errorData)
        throw new Error(errorData.error || `처리 실패 (상태: ${response.status})`)
      }
    } catch (error) {
      console.error('일정변경 처리 실패:', error)
      alert(`일정변경 처리 실패: ${error.message}`)
    }
  }

  // 검색 필터링
  const getFilteredData = () => {
    switch (activeTab) {
      case 'students':
        return myStudents.filter(student =>
          student.students?.user_profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.students?.user_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      case 'requests':
        return scheduleRequests.filter(request =>
          request.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.status?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      default:
        return myClasses.filter(cls =>
          cls.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cls.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }
  }

  // 반복수업 그룹핑 함수
  const groupRecurringClasses = (classes) => {
    const grouped = {}
    classes.forEach(cls => {
      // title 제외, student_names(혹은 student_id) 등 본질적 속성만 사용
      const key = [cls.teacher_id, cls.room_id, cls.day_of_week, cls.start_time, cls.duration, cls.student_names ? cls.student_names.join(',') : ''].join('|')
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(cls)
    })
    return Object.values(grouped).map(group => {
      const first = group[0]
      return {
        ...first,
        repeat_count: group.length,
        repeat_dates: group.map(c => c.created_at),
      }
    })
  }

  const getRequestStatusBadge = (status) => {
    const statusConfig = {
      pending: { icon: AlertCircle, color: 'yellow', text: '대기 중' },
      approved: { icon: CheckCircle, color: 'green', text: '승인됨' },
      rejected: { icon: XCircle, color: 'red', text: '거부됨' }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    )
  }

  // 수업 가능시간 관련 함수들
  const loadAvailability = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/teacher/availability')
      
      if (!response.ok) {
        throw new Error('가능 시간 로드 실패')
      }

      const data = await response.json()
      setAvailability(data.availability || [])
      setCurrentClasses(data.currentClasses || [])
    } catch (error) {
      console.error('가능 시간 로드 오류:', error)
    }
  }

  // 새 시간 슬롯 추가
  const handleAddSlot = async () => {
    if (!validateTimeSlot(newSlot)) return

    setSaving(true)
    try {
      const response = await makeAuthenticatedRequest('/api/teacher/availability', {
        method: 'POST',
        body: JSON.stringify(newSlot)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '시간 추가 실패')
      }

      await loadAvailability()
      setIsAddingNew(false)
      setNewSlot({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
        is_available: true
      })
      alert('가능 시간이 추가되었습니다.')
    } catch (error) {
      console.error('시간 추가 오류:', error)
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  // 시간 슬롯 수정
  const handleUpdateSlot = async (id) => {
    if (!validateTimeSlot(editSlot)) return

    setSaving(true)
    try {
      const response = await makeAuthenticatedRequest(`/api/teacher/availability/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(editSlot)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '시간 수정 실패')
      }

      await loadAvailability()
      setEditingId(null)
      setEditSlot({})
      alert('가능 시간이 수정되었습니다.')
    } catch (error) {
      console.error('시간 수정 오류:', error)
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  // 시간 슬롯 삭제
  const handleDeleteSlot = async (id) => {
    if (!confirm('정말로 이 시간을 삭제하시겠습니까?')) return

    setSaving(true)
    try {
      const response = await makeAuthenticatedRequest(`/api/teacher/availability/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '시간 삭제 실패')
      }

      await loadAvailability()
      alert('가능 시간이 삭제되었습니다.')
    } catch (error) {
      console.error('시간 삭제 오류:', error)
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  // 시간 슬롯 유효성 검사
  const validateTimeSlot = (slot) => {
    if (slot.start_time >= slot.end_time) {
      alert('시작 시간은 종료 시간보다 빨라야 합니다.')
      return false
    }
    return true
  }

  // 편집 모드 시작
  const startEdit = (slot) => {
    setEditingId(slot.id)
    setEditSlot({ ...slot })
  }

  // 편집 모드 취소
  const cancelEdit = () => {
    setEditingId(null)
    setEditSlot({})
  }

  // 추가 모드 취소
  const cancelAdd = () => {
    setIsAddingNew(false)
    setNewSlot({
      day_of_week: 1,
      start_time: '09:00',
      end_time: '10:00',
      is_available: true
    })
  }

  // 수업 수정 모달 열기
  const openEditModal = (cls) => {
    setEditingClass(cls)
    setEditFormData({
      title: cls.title,
      subject: cls.subject || '',
      description: cls.description || '',
      room_id: cls.room_id,
      day_of_week: cls.day_of_week,
      start_time: cls.start_time,
      duration: cls.duration || 60,
      student_names: Array.isArray(cls.student_names) ? [...cls.student_names] : []
    })
  }

  // 수업 수정 핸들러
  const handleUpdateClass = async (e) => {
    e.preventDefault()
    
    setSaving(true)
    try {
      const updateData = {
        title: editFormData.title,
        subject: editFormData.subject,
        description: editFormData.description,
        room_id: editFormData.room_id,
        day_of_week: editFormData.day_of_week,
        start_time: editFormData.start_time,
        duration: editFormData.duration,
        student_names: editFormData.student_names.filter(name => name.trim() !== '')
      }
      
      const response = await makeAuthenticatedRequest(`/api/teacher/classes/${editingClass.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        let errorMessage = '수업 수정 실패'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (jsonError) {
          // JSON 파싱 실패 시 텍스트로 읽기 시도
          try {
            const textError = await response.text()
            errorMessage = textError || errorMessage
          } catch (textError) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
          }
        }
        throw new Error(errorMessage)
      }

      await loadMyClasses()
      setEditingClass(null)
      setEditFormData({
        title: '',
        subject: '',
        description: '',
        room_id: '',
        day_of_week: 1,
        start_time: '09:00',
        duration: 60,
        student_names: []
      })
      alert('수업 정보가 수정되었습니다!')
    } catch (error) {
      console.error('수업 수정 오류:', error)
      alert(`수업 수정 실패: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }



  // 학생 제거 (수정)
  const removeStudentFromEdit = (index) => {
    setEditFormData({
      ...editFormData,
      student_names: editFormData.student_names.filter((_, i) => i !== index)
    })
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">수업 데이터를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (!user || !isTeacher()) {
    return null
  }

  const filteredData = getFilteredData()
  const pendingRequests = scheduleRequests.filter(req => req.status === 'pending').length

  // 내 수업 탭 렌더링 부분에서 그룹핑 적용
  const groupedClasses = activeTab === 'classes' ? groupRecurringClasses(filteredData) : filteredData

  return (
    <div className="min-h-screen bg-gray-100 pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm hover:shadow-md transition-all"
            >
              <ArrowLeft size={16} />
              <span>홈으로</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">수업 관리</h1>
              <p className="text-gray-600">내 수업과 학생들을 관리하고 일정변경 요청을 처리하세요.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {pendingRequests > 0 && (
              <div className="flex items-center space-x-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-lg">
                <Bell className="w-5 h-5" />
                <span className="font-medium">대기 중인 요청 {pendingRequests}건</span>
              </div>
            )}
            {autoAttendanceStatus && (
              <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                <Users className="w-5 h-5" />
                <span className="font-medium">{autoAttendanceStatus}</span>
              </div>
            )}
          </div>
        </div>



        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">내 수업</h3>
            <p className="text-3xl font-bold text-blue-600">{groupedClasses.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">내 학생</h3>
            <p className="text-3xl font-bold text-green-600">{myStudents.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">변경 요청</h3>
            <p className="text-3xl font-bold text-orange-600">{pendingRequests}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">총 요청</h3>
            <p className="text-3xl font-bold text-purple-600">{scheduleRequests.length}</p>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'classes', label: '내 수업', count: myClasses.length },
                { id: 'students', label: '내 학생', count: myStudents.length },
                { id: 'requests', label: '일정변경 요청', count: scheduleRequests.length, badge: pendingRequests },
                { id: 'availability', label: '수업 가능시간', count: availability.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                  {tab.badge > 0 && (
                    <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* 검색 */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={`${activeTab === 'classes' ? '수업명으로' : activeTab === 'students' ? '학생명으로' : '요청 사유로'} 검색...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                초기화
              </button>
            </div>
          </div>

          {/* 컨텐츠 */}
          <div className="p-6">
            {/* 내 수업 탭 */}
            {activeTab === 'classes' && (
              <div className="space-y-4">
                {groupedClasses.length > 0 ? (
                  groupedClasses.map((cls) => (
                    <div key={cls.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {cls.title.replace(cls.subject, getSubjectName(cls.subject))}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {cls.day_of_week !== undefined ? dayNames[cls.day_of_week] + ' ' : ''}
                                {cls.start_time}
                                {cls.start_time ? 
                                  ` - ${(() => {
                                    const [h, m] = cls.start_time.split(':').map(Number)
                                    const endMinutes = h * 60 + m + (cls.duration || 60)
                                    const endHours = Math.floor(endMinutes / 60)
                                    const endMins = endMinutes % 60
                                    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
                                  })()} (${cls.duration || 60}분)` : ''
                                }
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4" />
                              <span>{getRoomName(cls.room_id) || '방 정보 없음'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4" />
                              <span>
                                {cls.student_names && cls.student_names.length > 0 
                                  ? cls.student_names.join(', ') 
                                  : '참여 학생 없음'
                                }
                              </span>
                            </div>
                          </div>
                          {cls.description && (
                            <p className="text-sm text-gray-500 mt-2">{cls.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => router.push(`/manage-classes/${cls.id}/attendance`)}
                            className="flex items-center space-x-2 text-green-600 hover:text-green-800 px-3 py-2 rounded-md hover:bg-green-50"
                            title="출결 관리"
                          >
                            <Users className="w-4 h-4" />
                            <span>출결</span>
                          </button>
                          <button
                            onClick={() => openEditModal(cls)}
                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 px-3 py-2 rounded-md hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                            <span>수정</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">등록된 수업이 없습니다.</p>
                  </div>
                )}
              </div>
            )}

            {/* 내 학생 탭 */}
            {activeTab === 'students' && (
              <div className="space-y-4">
                {filteredData.length > 0 ? (
                  filteredData.map((student) => (
                    <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <div className="flex items-center space-x-2">
                              <User className="w-5 h-5 text-blue-600" />
                              <span className="font-medium text-gray-900">
                                {student.students?.user_profiles?.name || student.students?.user_profiles?.email || '이름 없음'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {student.students?.user_profiles?.email}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>과목: {getSubjectName(student.classes?.subject) || '과목 정보 없음'}</p>
                            <p>전화번호: {student.students?.user_profiles?.phone || '전화번호 없음'}</p>
                            <p>수업 시간: {student.lesson_duration}분</p>
                            <p>등록일: {new Date(student.created_at).toLocaleDateString('ko-KR')}</p>
                            <p>요일: {dayNames[student.day_of_week]} {student.lesson_time} - {student.lesson_end_time}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            student.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {student.status === 'active' ? '활성' : '비활성'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Users size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">등록된 학생이 없습니다.</p>
                  </div>
                )}
              </div>
            )}

            {/* 일정변경 요청 탭 */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                {filteredData.length > 0 ? (
                  filteredData.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-3">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">
                                {request.student?.name || request.student?.email || '학생 정보 없음'}
                              </h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-sm text-gray-600">
                                  {getSubjectName(request.classes?.subject) || '과목 정보 없음'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  요청 #{request.id.slice(0, 8)}
                                </span>
                              </div>
                            </div>
                            {getRequestStatusBadge(request.status)}
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
                          
                          <div className="text-sm">
                            <p className="font-medium text-gray-700 mb-1">변경 사유:</p>
                            <p className="text-gray-600 bg-gray-50 p-2 rounded">{request.reason}</p>
                          </div>
                          
                          {request.status === 'rejected' && request.rejection_reason && (
                            <div className="text-sm mt-3">
                              <p className="font-medium text-red-700 mb-1">거절 사유:</p>
                              <p className="text-red-600 bg-red-50 p-2 rounded border border-red-200">
                                {request.rejection_reason}
                              </p>
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500 mt-2">
                            요청일: {new Date(request.created_at).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                        
                        {request.status === 'pending' && (
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleApproveRequest(request.id)}
                              className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>승인</span>
                            </button>
                            <button
                              onClick={() => openRejectModal(request)}
                              className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>거부</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">
                      {searchTerm ? '검색된 요청이 없습니다.' : '일정변경 요청이 없습니다.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 수업 가능시간 탭 */}
            {activeTab === 'availability' && (
              <>
                {/* 현재 수업 목록 */}
                <div className="bg-white rounded-lg shadow-sm border mb-6">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">수</span>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        현재 진행 중인 수업 ({currentClasses.length}개)
                      </h2>
                    </div>
                  </div>
                  {currentClasses.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-gray-500 text-lg font-bold">수</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">진행 중인 수업이 없습니다</h3>
                      <p className="text-gray-600">현재 등록된 수업이 없습니다.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {currentClasses
                        .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
                        .map((cls) => {
                          const [hours, minutes] = cls.start_time.split(':').map(Number)
                          const endMinutes = hours * 60 + minutes + (cls.duration || 60)
                          const endHours = Math.floor(endMinutes / 60)
                          const endMins = endMinutes % 60
                          const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
                          return (
                            <div key={cls.id} className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-6">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <span className="text-lg font-medium text-gray-900">
                                      {dayNames[cls.day_of_week]}
                                    </span>
                                  </div>
                                  <div className="text-gray-600">
                                    <span className="font-medium">{cls.start_time}</span>
                                    <span className="mx-2">-</span>
                                    <span className="font-medium">{endTime}</span>
                                    <span className="text-sm text-gray-500 ml-2">({cls.duration || 60}분)</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-gray-900">{cls.title}</div>
                                  <div className="text-sm text-gray-500">수업 ID: {cls.id.slice(0, 8)}</div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
                {/* 가능 시간 목록 */}
                <div id="availability-section" className="bg-white rounded-lg shadow-sm border">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-6 h-6 text-blue-600" />
                        <h2 className="text-xl font-semibold text-gray-900">
                          실제 수업 가능한 시간 ({availability.length}개)
                        </h2>
                      </div>
                      <button
                        onClick={() => setIsAddingNew(true)}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <Clock className="w-4 h-4" />
                        <span>시간 추가</span>
                      </button>
                    </div>
                  </div>
                  {availability.length === 0 ? (
                    <div className="p-12 text-center">
                      <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">실제 수업 가능한 시간이 없습니다</h3>
                      <p className="text-gray-600 mb-4">현재 설정된 시간에 이미 수업이 잡혀있거나, 가능한 시간을 추가해주세요.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {availability
                        .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
                        .map((slot) => (
                          <div key={slot.id} className="p-6">
                            {editingId === slot.id ? (
                              // 수정 모드
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">요일</label>
                                  <select
                                    value={editSlot.day_of_week}
                                    onChange={(e) => setEditSlot({ ...editSlot, day_of_week: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  >
                                    {dayNames.map((day, index) => (
                                      <option key={index} value={index}>{day}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">시작 시간</label>
                                  <input
                                    type="time"
                                    value={editSlot.start_time}
                                    onChange={(e) => setEditSlot({ ...editSlot, start_time: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">종료 시간</label>
                                  <input
                                    type="time"
                                    value={editSlot.end_time}
                                    onChange={(e) => setEditSlot({ ...editSlot, end_time: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="flex items-end space-x-2">
                                  <button
                                    onClick={() => handleUpdateSlot(slot.id)}
                                    disabled={saving}
                                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                  >
                                    <Save className="w-4 h-4" />
                                    <span>저장</span>
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    disabled={saving}
                                    className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>취소</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // 보기 모드
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-6">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-3 h-3 rounded-full ${slot.is_available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="text-lg font-medium text-gray-900">
                                      {dayNames[slot.day_of_week]}
                                    </span>
                                  </div>
                                  <div className="text-gray-600">
                                    <span className="font-medium">{slot.start_time}</span>
                                    <span className="mx-2">-</span>
                                    <span className="font-medium">{slot.end_time}</span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => startEdit(slot)}
                                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md hover:bg-blue-50"
                                  >
                                    <Edit className="w-4 h-4" />
                                    <span>수정</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="flex items-center space-x-1 text-red-600 hover:text-red-800 px-3 py-1 rounded-md hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>삭제</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                {/* 새 시간 슬롯 추가 폼 */}
                {isAddingNew && (
                  <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">새 가능 시간 추가</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">요일</label>
                        <select
                          value={newSlot.day_of_week}
                          onChange={(e) => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {dayNames.map((day, index) => (
                            <option key={index} value={index}>{day}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">시작 시간</label>
                        <input
                          type="time"
                          value={newSlot.start_time}
                          onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">종료 시간</label>
                        <input
                          type="time"
                          value={newSlot.end_time}
                          onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex items-end space-x-2">
                        <button
                          onClick={handleAddSlot}
                          disabled={saving}
                          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          <span>저장</span>
                        </button>
                        <button
                          onClick={cancelAdd}
                          disabled={saving}
                          className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          <X className="w-4 h-4" />
                          <span>취소</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 거절 사유 입력 모달 */}
        {showRejectModal && rejectingRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">일정변경 요청 거부</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {rejectingRequest.student?.name || rejectingRequest.student?.email || '학생 정보 없음'} - {getSubjectName(rejectingRequest.classes?.subject) || '과목 정보 없음'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  요청 #{rejectingRequest.id.slice(0, 8)}
                </p>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>학생 요청 사유:</strong>
                  </p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {rejectingRequest.reason}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    거절 사유 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="학생에게 전달할 거절 사유를 입력해주세요..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    학생이 이 메시지를 확인할 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleRejectRequest}
                  disabled={!rejectionReason.trim()}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>거부하기</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 수업 수정 모달 */}
        {editingClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">수업 정보 수정</h3>
              
              <form onSubmit={handleUpdateClass} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 수업명 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      수업명 *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.title}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                    />
                  </div>
                  {/* 과목 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      과목 *
                    </label>
                                          <select
                        required
                        value={editFormData.subject}
                        onChange={e => {
                          const newSubject = e.target.value
                          // 과목이 바뀌면 현재 선택된 방이 적합하지 않을 수 있으므로 초기화
                          const currentRoom = editFormData.room_id
                          const availableRooms = rooms.filter(room => 
                            isRoomSuitableForSubject(room, newSubject) &&
                            isRoomAvailableAtTime(room.id, editFormData.day_of_week, editFormData.start_time, editFormData.duration, editingClass?.id)
                          )
                          
                          // DB 형식에 맞춰 title 생성: "과목명 (요일 시간)"
                          const subjectName = getSubjectName(newSubject)
                          const dayName = dayNames[editFormData.day_of_week]
                          const newTitle = `${subjectName} (${dayName} ${editFormData.start_time})`
                          
                          setEditFormData({
                            ...editFormData,
                            subject: newSubject,
                            title: newTitle,
                            room_id: availableRooms.some(room => room.id === currentRoom) ? currentRoom : ''
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                      <option value="">과목 선택</option>
                      {teacherSubjects.map(subject => (
                        <option key={subject} value={getSubjectCode(subject)}>
                          {subject}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* 강의실 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      강의실 *
                    </label>
                    <div className="space-y-2">
                      {/* 선택된 방 표시 */}
                      {editFormData.room_id && (
                        <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-blue-900">
                                {getRoomName(editFormData.room_id)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditFormData({...editFormData, room_id: ''})}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              변경
                            </button>
                          </div>
                          {/* 방 시설 정보 */}
                          {(() => {
                            const room = rooms.find(r => r.id === editFormData.room_id)
                            if (!room?.facilities) return null
                            
                            try {
                              const facilities = typeof room.facilities === 'string' 
                                ? JSON.parse(room.facilities) 
                                : room.facilities
                              
                              const activeFacilities = Object.entries(facilities)
                                .filter(([key, value]) => value)
                                .map(([key]) => {
                                  const facilityNames = {
                                    piano: '피아노',
                                    drum_set: '드럼세트',
                                    midi_computer: '미디 컴퓨터',
                                    speakers: '스피커',
                                    microphone: '마이크',
                                    audio_interface: '오디오 인터페이스',
                                    music_stand: '악보대',
                                    amp: '앰프',
                                    keyboard: '키보드',
                                    guitar: '기타'
                                  }
                                  return facilityNames[key] || key
                                })
                                .filter(Boolean)
                                .slice(0, 3)
                              
                              return activeFacilities.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {activeFacilities.map(facility => (
                                    <span key={facility} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {facility}
                                    </span>
                                  ))}
                                </div>
                              ) : null
                            } catch (error) {
                              return null
                            }
                          })()}
                        </div>
                      )}
                      
                      {/* 방 선택 버튼 */}
                      {!editFormData.room_id && (
                        <button
                          type="button"
                          onClick={() => setShowRoomSelection(true)}
                          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-center"
                        >
                          <div className="flex items-center justify-center space-x-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>강의실 선택하기</span>
                          </div>
                        </button>
                      )}
                      
                      {editFormData.subject && (
                        <p className="text-xs text-gray-500">
                          {getSubjectName(editFormData.subject)} 과목에 적합하고 시간이 겹치지 않는 방만 표시됩니다.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      요일 *
                    </label>
                    <select
                      required
                      value={editFormData.day_of_week}
                      onChange={(e) => {
                        const newDay = parseInt(e.target.value)
                        // 해당 요일의 가능 시간 중 첫 번째 시간으로 설정
                        const availableSlots = availability.filter(slot => slot.day_of_week === newDay)
                        const firstSlot = availableSlots.length > 0 ? availableSlots[0] : null
                        const newStartTime = firstSlot ? firstSlot.start_time.substring(0, 5) : editFormData.start_time
                        
                        // title 업데이트
                        const subjectName = getSubjectName(editFormData.subject)
                        const dayName = dayNames[newDay]
                        const newTitle = `${subjectName} (${dayName} ${newStartTime})`
                        
                        setEditFormData({
                          ...editFormData, 
                          day_of_week: newDay,
                          start_time: newStartTime,
                          title: newTitle
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {dayNames.map((day, index) => (
                        <option key={index} value={index}>{day}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      시작 시간 *
                    </label>
                    <select
                      required
                      value={editFormData.start_time}
                      onChange={(e) => {
                        const newStartTime = e.target.value
                        // 시간이 바뀌면 현재 선택된 방이 사용 불가능할 수 있으므로 초기화
                        const currentRoom = editFormData.room_id
                        const availableRooms = rooms.filter(room => 
                          isRoomSuitableForSubject(room, editFormData.subject) &&
                          isRoomAvailableAtTime(room.id, editFormData.day_of_week, newStartTime, editFormData.duration, editingClass?.id)
                        )
                        
                        // title 업데이트
                        const subjectName = getSubjectName(editFormData.subject)
                        const dayName = dayNames[editFormData.day_of_week]
                        const newTitle = `${subjectName} (${dayName} ${newStartTime})`
                        
                        setEditFormData({
                          ...editFormData,
                          start_time: newStartTime,
                          title: newTitle,
                          room_id: availableRooms.some(room => room.id === currentRoom) ? currentRoom : ''
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">시간 선택</option>
                      {/* 현재 수업 시간 (같은 요일일 때만 표시) */}
                      {editingClass?.start_time && editingClass?.day_of_week === editFormData.day_of_week && (
                        <option value={editingClass.start_time} className="text-blue-600 font-medium">
                          {editingClass.start_time} - {(() => {
                            const [h, m] = editingClass.start_time.split(':').map(Number)
                            const endMinutes = h * 60 + m + (editingClass.duration || 60)
                            const endHours = Math.floor(endMinutes / 60)
                            const endMins = endMinutes % 60
                            return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
                          })()} (현재 수업)
                        </option>
                      )}
                      {/* 가능 시간 목록 */}
                      {(() => {
                        const filteredSlots = availability.filter(slot => slot.day_of_week === editFormData.day_of_week && slot.is_available)
                        const classDuration = editFormData.duration || 60
                        
                        // 수업 시간에 맞는 슬롯들을 동적으로 생성
                        const availableTimeSlots = []
                        
                        filteredSlots.forEach(slot => {
                          const startTime = slot.start_time.substring(0, 5)
                          const endTime = slot.end_time.substring(0, 5)
                          
                          // 시작 시간을 분으로 변환
                          const [startHour, startMin] = startTime.split(':').map(Number)
                          const startMinutes = startHour * 60 + startMin
                          
                          // 종료 시간을 분으로 변환
                          const [endHour, endMin] = endTime.split(':').map(Number)
                          const endMinutes = endHour * 60 + endMin
                          
                          // 수업 시간 단위로 슬롯 생성
                          for (let time = startMinutes; time + classDuration <= endMinutes; time += classDuration) {
                            const slotStartHour = Math.floor(time / 60)
                            const slotStartMin = time % 60
                            const slotStartTime = `${String(slotStartHour).padStart(2, '0')}:${String(slotStartMin).padStart(2, '0')}`
                            
                            const slotEndTime = calculateEndTime(slotStartTime, classDuration)
                            
                            availableTimeSlots.push({
                              start: slotStartTime,
                              end: slotEndTime
                            })
                          }
                        })
                        
                        return availableTimeSlots.map((slot, index) => (
                          <option key={index} value={slot.start}>
                            {slot.start} - {slot.end}
                          </option>
                        ))
                      })()}
                    </select>
                    
                    {/* 가능 시간이 없을 때 안내 메시지 */}
                    {(() => {
                      const filteredSlots = availability.filter(slot => slot.day_of_week === editFormData.day_of_week && slot.is_available)
                      const hasCurrentClassTime = editingClass?.start_time && editingClass?.day_of_week === editFormData.day_of_week
                      
                      if (filteredSlots.length === 0 && !hasCurrentClassTime) {
                        return (
                          <p className="text-sm text-orange-600 mt-1">
                            ⚠️ {dayNames[editFormData.day_of_week]}에는 가능한 시간이 없습니다. 
                            <button 
                              type="button"
                              onClick={() => {
                                // 가능 시간 추가 모달 열기
                                // 현재 수업의 수업 시간으로 초기화
                                const currentDuration = editFormData.duration || 60
                                const endTime = calculateEndTime(newSlot.start_time, currentDuration)
                                setNewSlot({
                                  ...newSlot,
                                  end_time: endTime
                                })
                                setShowAvailabilityModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-800 underline ml-1"
                            >
                              가능 시간을 추가하세요
                            </button>
                          </p>
                        )
                      }
                      return null
                    })()}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      수업 시간 *
                    </label>
                    <select
                      required
                      value={editFormData.duration}
                      onChange={(e) => {
                        const newDuration = parseInt(e.target.value)
                        // 수업 시간이 바뀌면 시작 시간도 초기화 (새로운 슬롯이 생성되므로)
                        setEditFormData({
                          ...editFormData, 
                          duration: newDuration,
                          start_time: ''
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">시간 선택</option>
                      <option value={30}>30분</option>
                      <option value={60}>1시간</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    참가 학생
                  </label>
                  <div className="mb-2">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          const selectedStudent = myStudents.find(s => s.students?.user_profiles?.name === e.target.value)
                          if (selectedStudent && !editFormData.student_names.includes(e.target.value)) {
                            setEditFormData({
                              ...editFormData,
                              student_names: [...editFormData.student_names, e.target.value]
                            })
                          }
                          e.target.value = '' // 선택 후 초기화
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">학생 선택</option>
                      {myStudents
                        .filter(student => !editFormData.student_names.includes(student.students?.user_profiles?.name))
                        .map((student, index) => (
                          <option key={index} value={student.students?.user_profiles?.name}>
                            {student.students?.user_profiles?.name} ({student.students?.user_profiles?.email})
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  {editFormData.student_names.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editFormData.student_names.map((studentName, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {studentName}
                          <button
                            type="button"
                            onClick={() => removeStudentFromEdit(index)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Save size={16} />
                    <span>{saving ? '저장 중...' : '수정 완료'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingClass(null)
                      setEditFormData({
                        title: '',
                        subject: '',
                        description: '',
                        room_id: '',
                        day_of_week: 1,
                        start_time: '09:00',
                        duration: 60,
                        student_names: []
                      })
                    }}
                    disabled={saving}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 disabled:bg-gray-400 transition-colors flex items-center justify-center space-x-2"
                  >
                    <X size={16} />
                    <span>취소</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 방 선택 모달 */}
        {showRoomSelection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">강의실 선택</h3>
                  <p className="text-gray-600 mt-1">원하는 강의실을 선택해주세요</p>
                </div>
                <button
                  onClick={() => setShowRoomSelection(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* 수업 정보 요약 */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  수업 정보
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{editFormData.subject ? getSubjectName(editFormData.subject) : '과목 미선택'}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>
                      {editFormData.day_of_week !== undefined ? dayNames[editFormData.day_of_week] : '요일 미선택'} {editFormData.start_time || '시간 미선택'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{editFormData.duration}분 수업</span>
                  </div>
                </div>
              </div>

              {/* 방 목록 */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getAvailableRooms().map((room) => (
                    <div
                      key={room.id}
                      className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                        editFormData.room_id === room.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setEditFormData({...editFormData, room_id: room.id})
                        setShowRoomSelection(false)
                      }}
                    >
                      {/* 선택된 방 표시 */}
                      {editFormData.room_id === room.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}

                      <div className="mb-3">
                        <h5 className="font-semibold text-gray-900 flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                          {room.name}
                        </h5>
                        <p className="text-sm text-gray-500 mt-1">{room.description || '설명 없음'}</p>
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
                                  
                                  const facilityNames = {
                                    piano: '피아노',
                                    drum_set: '드럼세트',
                                    midi_computer: '미디 컴퓨터',
                                    speakers: '스피커',
                                    microphone: '마이크',
                                    audio_interface: '오디오 인터페이스',
                                    music_stand: '악보대',
                                    amp: '앰프',
                                    keyboard: '키보드',
                                    guitar: '기타'
                                  }
                                  
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

                {getAvailableRooms().length === 0 && (
                  <div className="text-center py-12">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    {editFormData.subject ? (
                      <div>
                        <p className="text-gray-500 mb-2">
                          {getSubjectName(editFormData.subject)} 과목이 가능한 방이 없습니다.
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
                  onClick={() => setShowRoomSelection(false)}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 가능 시간 추가 모달 */}
        {showAvailabilityModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">새 가능 시간 추가</h3>
                <p className="text-sm text-gray-600 mt-1">
                  수업 수정에 필요한 가능 시간을 추가하세요.
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">요일</label>
                    <select
                      value={newSlot.day_of_week}
                      onChange={(e) => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {dayNames.map((day, index) => (
                        <option key={index} value={index}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">시작 시간</label>
                    <input
                      type="time"
                      value={newSlot.start_time}
                      onChange={(e) => {
                        const startTime = e.target.value
                        const endTime = calculateEndTime(startTime, editFormData.duration || 60)
                        setNewSlot({ 
                          ...newSlot, 
                          start_time: startTime,
                          end_time: endTime
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">수업 시간</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="duration"
                        value="30"
                        checked={(editFormData.duration || 60) === 30}
                        onChange={(e) => {
                          const duration = parseInt(e.target.value)
                          const endTime = calculateEndTime(newSlot.start_time, duration)
                          setEditFormData({ ...editFormData, duration })
                          setNewSlot({ ...newSlot, end_time: endTime })
                        }}
                        className="mr-2"
                      />
                      <span>30분</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="duration"
                        value="60"
                        checked={(editFormData.duration || 60) === 60}
                        onChange={(e) => {
                          const duration = parseInt(e.target.value)
                          const endTime = calculateEndTime(newSlot.start_time, duration)
                          setEditFormData({ ...editFormData, duration })
                          setNewSlot({ ...newSlot, end_time: endTime })
                        }}
                        className="mr-2"
                      />
                      <span>1시간</span>
                    </label>
                  </div>
                </div>

                {/* 현재 설정된 시간 미리보기 */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">설정할 시간</h4>
                  <div className="text-sm text-blue-800">
                    <p><strong>요일:</strong> {dayNames[newSlot.day_of_week]}</p>
                    <p><strong>시간:</strong> {newSlot.start_time} - {newSlot.end_time} ({(editFormData.duration || 60)}분)</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAvailabilityModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    if (validateTimeSlot(newSlot)) {
                      setSaving(true)
                      try {
                        const response = await makeAuthenticatedRequest('/api/teacher/availability', {
                          method: 'POST',
                          body: JSON.stringify(newSlot)
                        })

                        if (!response.ok) {
                          const errorData = await response.json()
                          throw new Error(errorData.error || '시간 추가 실패')
                        }

                        await loadAvailability()
                        setShowAvailabilityModal(false)
                        setNewSlot({
                          day_of_week: 1,
                          start_time: '09:00',
                          end_time: '10:00',
                          is_available: true
                        })
                        alert('가능 시간이 추가되었습니다!')
                      } catch (error) {
                        console.error('시간 추가 오류:', error)
                        alert(error.message)
                      } finally {
                        setSaving(false)
                      }
                    }
                  }}
                  disabled={saving}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? '저장 중...' : '추가하기'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
