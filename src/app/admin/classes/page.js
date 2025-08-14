'use client'

import { useState, useEffect } from 'react'
import { useRoom } from '@/app/contexts/RoomContext'
import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Save, X, Calendar, Clock, Users, Repeat } from 'lucide-react'
import RoomBookingModal from '@/app/components/RoomBookingModal'
import { getSupabase } from '@/lib/supabase'
import { format, addDays, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function AdminClassesPage() {
  const { rooms, classes, loading, addClass, updateClass, deleteClass } = useRoom()
  const { user, isAdmin, isTeacher, userProfile, makeAuthenticatedRequest } = useAuth()
  const router = useRouter()
  
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filterRoom, setFilterRoom] = useState('')
  const [adminClasses, setAdminClasses] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState(null)
  const [teacherOptions, setTeacherOptions] = useState([])
  const [studentOptions, setStudentOptions] = useState([])
  const [showRoomBooking, setShowRoomBooking] = useState(false)
  const [bookingContext, setBookingContext] = useState({ type: 'create' })
  const [teacherAvailability, setTeacherAvailability] = useState([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [existingBookings, setExistingBookings] = useState([])
  const [teacherAvailabilityCache, setTeacherAvailabilityCache] = useState({})
  const [filteredTeachersForCreate, setFilteredTeachersForCreate] = useState([])
  const [filteredTeachersForEdit, setFilteredTeachersForEdit] = useState([])

  // 과목 옵션 및 한글→코드 매핑 (AuthModal 기준)
  const AVAILABLE_SUBJECTS = [
    '피아노', '드럼', '기타', '베이스기타', '보컬', 
    '바이올린', '첼로', '플루트', '색소폰', '작곡', 
    '음악이론', '미디', '시창청음', '재즈', '클래식'
  ]
  const SUBJECT_MAPPING = {
    '피아노': 'piano',
    '드럼': 'drum',
    '기타': 'guitar',
    '베이스기타': 'bass',
    '보컬': 'vocal',
    '작곡': 'composition',
    '미디': 'composition',
    '음악이론': 'general',
    '바이올린': 'general',
    '첼로': 'general',
    '플루트': 'general',
    '색소폰': 'general',
    '시창청음': 'general',
    '재즈': 'general',
    '클래식': 'general'
  }
  const normalizeSubjectCode = (val) => {
    if (!val) return null
    if (SUBJECT_MAPPING[val]) return SUBJECT_MAPPING[val]
    // 이미 코드일 가능성 처리
    const codes = Object.values(SUBJECT_MAPPING)
    if (codes.includes(val)) return val
    return 'general'
  }

  // 날짜 문자열을 로컬 기준 요일로 안전하게 계산
  const getDayOfWeekFromDateStr = (dateStr) => {
    if (!dateStr) return null
    const [y, m, d] = String(dateStr).split('-').map(Number)
    if (!y || !m || !d) return null
    const dt = new Date(y, m - 1, d)
    if (isNaN(dt)) return null
    return dt.getDay()
  }

  const getCreateSelectedDOW = () => {
    const fromDate = getDayOfWeekFromDateStr(newClass.date)
    return fromDate !== null && fromDate !== undefined
      ? fromDate
      : (typeof newClass.day_of_week === 'number' ? newClass.day_of_week : null)
  }

  const getEditSelectedDOW = () => {
    const fromDate = getDayOfWeekFromDateStr(editFormData.date)
    return fromDate !== null && fromDate !== undefined
      ? fromDate
      : (typeof editFormData.day_of_week === 'number' ? editFormData.day_of_week : null)
  }
  
  // 새 수업 폼 데이터
  const [newClass, setNewClass] = useState({
    title: '',
    description: '',
    room_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:30',
    teacher: '',
    students: [],
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_type: 'finite',
    recurrence_end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd')
  })

  // 수정 폼 데이터
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    room_id: '',
    date: '',
    start_time: '',
    end_time: '',
    teacher: '',
    students: [],
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_type: 'finite',
    recurrence_end_date: ''
  })

  // 새 학생 이름 입력
  const [newStudentName, setNewStudentName] = useState('')
  const [editNewStudentName, setEditNewStudentName] = useState('')

  // 관리자 권한 확인
  useEffect(() => {
    if (!loading && (!user || (!isAdmin() && !isTeacher()))) {
      router.push('/')
    }
  }, [user, isAdmin, isTeacher, loading, router])

  // 관리자: 활성 수업 전체 조회
  useEffect(() => {
    const fetchAdminClasses = async () => {
      if (loading || !user || !isAdmin()) return
      try {
        setAdminLoading(true)
        setAdminError(null)
        const res = await makeAuthenticatedRequest('/api/admin/classes', { method: 'GET' })
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json?.error || '관리자 수업 목록을 불러오는데 실패했습니다.')
        }
        setAdminClasses(json?.classes || [])
      } catch (err) {
        console.error('관리자 수업 조회 실패:', err)
        setAdminError(err.message)
      } finally {
        setAdminLoading(false)
      }
    }
    fetchAdminClasses()
  }, [loading, user, isAdmin, makeAuthenticatedRequest])

  // 관리자: 교사/학생 선택 옵션 로딩
  useEffect(() => {
    const fetchUsers = async () => {
      if (loading || !user || !isAdmin()) return
      try {
        const [tRes, sRes] = await Promise.all([
          makeAuthenticatedRequest('/api/admin/users?role=teacher', { method: 'GET' }),
          makeAuthenticatedRequest('/api/admin/users?role=student', { method: 'GET' })
        ])
        const tJson = await tRes.json()
        const sJson = await sRes.json()
        if (tRes.ok) setTeacherOptions(tJson?.users || [])
        if (sRes.ok) setStudentOptions(sJson?.users || [])
      } catch (e) {
        console.error('사용자 옵션 로드 실패:', e)
      }
    }
    fetchUsers()
  }, [loading, user, isAdmin, makeAuthenticatedRequest])

  // 강사 이용 가능 시간 로드 (추가/수정 공통 사용)
  useEffect(() => {
    const teacherId = editingClass ? (editFormData.teacher_id || '') : (newClass.teacher_id || '')
    if (!teacherId || (!showAddForm && !editingClass)) {
      setTeacherAvailability([])
      return
    }
    const fetchAvailability = async () => {
      try {
        setAvailabilityLoading(true)
        const res = await fetch(`/api/teacher/availability/public?teacherId=${teacherId}`)
        const json = await res.json()
        if (!json?.success) throw new Error(json?.error || '강사 이용 가능 시간 조회 실패')
        setTeacherAvailability(Array.isArray(json.availability) ? json.availability : [])
      } catch (e) {
        console.error('강사 이용 가능 시간 로드 실패:', e)
        setTeacherAvailability([])
      } finally {
        setAvailabilityLoading(false)
      }
    }
    fetchAvailability()
  }, [showAddForm, editingClass, newClass.teacher_id, editFormData.teacher_id])

  // 기존 예약 정보 로드 (AuthModal과 동일한 방식)
  useEffect(() => {
    const loadExistingBookings = async () => {
      try {
        const supabase = getSupabase()
        const { data, error } = await supabase
          .from('classes')
          .select('id, teacher_id, room_id, day_of_week, start_time, duration, subject, status, date')
          .eq('status', 'active')
        if (error) throw error
        const normalized = (data || []).map(b => {
          // day_of_week 보정
          let dow = typeof b.day_of_week === 'number' ? b.day_of_week : null
          if (dow === null && b.date) {
            const dt = new Date(b.date)
            if (!isNaN(dt)) dow = dt.getDay()
          }
          return {
            id: b.id,
            teacher_id: b.teacher_id,
            room_id: b.room_id,
            day_of_week: dow,
            start_time: b.start_time,
            duration: b.duration || null,
            subject: b.subject,
            status: b.status
          }
        })
        setExistingBookings(normalized)
      } catch (e) {
        console.error('기존 예약 정보 로드 실패:', e)
        setExistingBookings([])
      }
    }
    loadExistingBookings()
  }, [])

  // 시간 유틸
  const isTimeOverlap = (startA, durationA, startB, durationB) => {
    const toMinutes = (t) => {
      const [h, m] = String(t).split(':').map(Number)
      return h * 60 + m
    }
    const aStart = toMinutes(startA)
    const aEnd = aStart + Number(durationA || 0)
    const bStart = toMinutes(startB)
    const bEnd = bStart + Number(durationB || 0)
    return aStart < bEnd && bStart < aEnd
  }

  const generateTimeOptions = (startTime, endTime, duration) => {
    const options = []
    if (!startTime || !endTime || !duration) return options
    const start = new Date(`2000-01-01 ${startTime}`)
    const end = new Date(`2000-01-01 ${endTime}`)
    while (start < end) {
      options.push(start.toTimeString().slice(0, 5))
      start.setMinutes(start.getMinutes() + Number(duration))
    }
    return options
  }

  const calcEndFromDuration = (start, duration) => {
    if (!start || !duration) return null
    const [h, m] = String(start).split(':').map(Number)
    const startMin = h * 60 + m
    const endMin = startMin + Number(duration)
    const eh = String(Math.floor(endMin / 60)).padStart(2, '0')
    const em = String(endMin % 60).padStart(2, '0')
    return `${eh}:${em}`
  }

  // 특정 강사의 이용 가능 시간 캐시 조회/로드
  const fetchAvailabilityForTeacher = async (teacherId) => {
    if (!teacherId) return []
    if (teacherAvailabilityCache[teacherId]) return teacherAvailabilityCache[teacherId]
    try {
      const res = await fetch(`/api/teacher/availability/public?teacherId=${teacherId}`)
      const json = await res.json()
      const avail = json?.success && Array.isArray(json.availability) ? json.availability : []
      setTeacherAvailabilityCache(prev => ({ ...prev, [teacherId]: avail }))
      return avail
    } catch {
      return []
    }
  }

  const timeToMin = (t) => {
    const [h, m] = String(t).split(':').map(Number)
    return h * 60 + m
  }

  const getDurationFromTimes = (startTime, endTime) => {
    if (!startTime || !endTime) return undefined
    const start = timeToMin(startTime)
    const end = timeToMin(endTime)
    if (Number.isNaN(start) || Number.isNaN(end)) return undefined
    const diff = end - start
    return diff > 0 ? diff : undefined
  }

  const daysKo = ['일', '월', '화', '수', '목', '금', '토']
  const buildTitle = (subject, dateStr, startTime) => {
    const day = getDayOfWeekFromDateStr(dateStr)
    const dayKo = day !== null ? `${daysKo[day]}요일` : ''
    const subj = subject || '수업'
    const time = startTime || ''
    return dayKo ? `${subj} (${dayKo} ${time})` : `${subj} (${time})`
  }

  const fitsSlot = (slot, day, start, duration) => {
    if (Number(slot.day_of_week) !== Number(day)) return false
    const startMin = timeToMin(start)
    const endMin = startMin + Number(duration || 0)
    const slotStart = timeToMin(slot.start_time?.slice(0,5))
    const slotEnd = timeToMin(slot.end_time?.slice(0,5))
    return slotStart <= startMin && slotEnd >= endMin
  }

  // 선택된 요일/시간/길이에 맞는 강사만 필터링 (생성)
  useEffect(() => {
    const applyFilter = async () => {
      if (!isAdmin()) return
      const day = getCreateSelectedDOW()
      const start = newClass.start_time
      const duration = getDurationFromTimes(newClass.start_time, newClass.end_time) || 60
      if (day === null || !start || !newClass.end_time) { setFilteredTeachersForCreate([]); return }
      const result = []
      for (const t of teacherOptions) {
        const avail = await fetchAvailabilityForTeacher(t.user_id)
        const ok = avail.some(slot => fitsSlot(slot, day, start, duration))
        if (!ok) continue
        const teacherHasConflict = existingBookings.some(b => String(b.teacher_id) === String(t.user_id) && Number(b.day_of_week) === Number(day) && isTimeOverlap(start, duration, b.start_time, b.duration || 60))
        if (!teacherHasConflict) result.push(t)
      }
      setFilteredTeachersForCreate(result)
    }
    applyFilter()
  }, [isAdmin, teacherOptions, newClass.date, newClass.start_time, newClass.end_time, existingBookings])

  // 생성 폼: 과목/날짜/시간 변경 시 제목 자동 갱신
  useEffect(() => {
    setNewClass(prev => ({ ...prev, title: buildTitle(prev.subject, prev.date, prev.start_time) }))
  }, [newClass.subject, newClass.date, newClass.start_time])

  // 선택된 요일/시간/길이에 맞는 강사만 필터링 (수정)
  useEffect(() => {
    const applyFilter = async () => {
      if (!isAdmin()) return
      const day = getEditSelectedDOW()
      const start = editFormData.start_time
      const duration = getDurationFromTimes(editFormData.start_time, editFormData.end_time) || 60
      if (day === null || !start || !editFormData.end_time) { setFilteredTeachersForEdit([]); return }
      const result = []
      for (const t of teacherOptions) {
        const avail = await fetchAvailabilityForTeacher(t.user_id)
        const ok = avail.some(slot => fitsSlot(slot, day, start, duration))
        if (!ok) continue
        // 자기 자신 수업은 제외하고 충돌 확인
        const currentId = editingClass?.id?.startsWith?.('virtual_') ? editingClass.id.split('_')[1] : editingClass?.id
        const teacherHasConflict = existingBookings.some(b => String(b.id) !== String(currentId) && String(b.teacher_id) === String(t.user_id) && Number(b.day_of_week) === Number(day) && isTimeOverlap(start, duration, b.start_time, b.duration || 60))
        if (!teacherHasConflict) result.push(t)
      }
      setFilteredTeachersForEdit(result)
    }
    applyFilter()
  }, [isAdmin, teacherOptions, editFormData.date, editFormData.start_time, editFormData.end_time, existingBookings, editingClass])

  // 수정 폼: 과목/날짜/시간 변경 시 제목 자동 갱신
  useEffect(() => {
    setEditFormData(prev => ({ ...prev, title: buildTitle(prev.subject, prev.date, prev.start_time) }))
  }, [editFormData.subject, editFormData.date, editFormData.start_time])

  // 필터링된 수업 목록
  const filteredClasses = classes.filter(cls => {
    let matchesDate = true
    let matchesRoom = true
    
    if (filterDate) {
      matchesDate = cls.date === filterDate
    }
    
    if (filterRoom) {
      matchesRoom = cls.room_id === filterRoom
    }
    
    return matchesDate && matchesRoom
  }).sort((a, b) => {
    // 날짜순, 시간순 정렬
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.start_time.localeCompare(b.start_time)
  })

  // 방 이름 가져오기
  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId)
    return room?.name || '알 수 없는 방'
  }

  // 수업 추가 핸들러
  const handleAddClass = async (e) => {
    e.preventDefault()
    
    if (isAdmin()) {
      // 관리자: DB 스키마에 맞춰 관리자 API 호출
      try {
        // 필수값 검증 (수정 모달과 동일 제약)
        if (!newClass.room_id) {
          alert('강의실을 선택해주세요.')
          return
        }
        if (!newClass.date) {
          alert('날짜를 선택해주세요.')
          return
        }
        if (!newClass.start_time || !newClass.end_time) {
          alert('시작/종료 시간을 입력해주세요.')
          return
        }
        const dur = getDurationFromTimes(newClass.start_time, newClass.end_time)
        if (!dur) {
          alert('종료 시간은 시작 시간보다 뒤여야 합니다.')
          return
        }
        const body = {
          title: buildTitle(newClass.subject, newClass.date, newClass.start_time),
          subject: (newClass.subject ?? '').trim() === '' ? null : newClass.subject,
          room_id: newClass.room_id,
          date: newClass.date || null,
          day_of_week: newClass.date ? getDayOfWeekFromDateStr(newClass.date) : null,
          start_time: newClass.start_time,
          end_time: newClass.end_time,
          duration: dur,
          status: 'active',
          teacher_id: (newClass.teacher_id ?? '').trim() === '' ? null : newClass.teacher_id,
          student_ids: Array.isArray(newClass.student_ids) ? newClass.student_ids : [],
          is_recurring: !!newClass.is_recurring
        }
        const res = await makeAuthenticatedRequest('/api/admin/classes', {
          method: 'POST',
          body: JSON.stringify(body)
        })
        const json = await res.json()
        if (!res.ok) {
          console.error('Create class failed:', { body, json })
          throw new Error(json?.error || '수업 생성 실패')
        }
      } catch (error) {
        console.error('관리자 수업 생성 실패:', error)
        alert(`수업 추가 실패: ${error.message}`)
        return
      }
    } else {
      // 강사/일반 플로우 유지
      let classData = {
        ...newClass,
        students: newClass.students.filter(student => student.trim() !== ''),
      }
      if (isTeacher()) {
        classData.teacher = userProfile?.name || user?.email || '강사';
        classData.created_by = user.id;
      }
      try {
        await addClass(classData)
      } catch (error) {
        console.error('Add class error:', error)
        const errorMessage = error.message.includes('이미 다른 수업이 예약')
          ? `⚠️ 시간 충돌!\n\n${error.message}\n\n다른 시간을 선택해주세요.`
          : `수업 추가 실패: ${error.message}`
        alert(errorMessage)
        return
      }
    }

    // 폼 초기화
    setNewClass({
      title: '',
      description: '',
      room_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:30',
      teacher: '',
      students: [],
      subject: '',
      day_of_week: undefined,
      duration: undefined,
      teacher_id: '',
      student_ids: [],
      is_recurring: false,
      recurrence_pattern: 'weekly',
      recurrence_type: 'finite',
      recurrence_end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd')
    })
    setShowAddForm(false)
    alert('수업이 성공적으로 추가되었습니다!')
  }

  // 수업 수정 모달 열기
  const openEditModal = (cls) => {
    setEditingClass(cls)
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const initialDate = cls.next_date || (cls.date && cls.date > todayStr ? cls.date : todayStr)
    setEditFormData({
      title: cls.title,
      description: cls.description || '',
      room_id: cls.room_id,
      date: initialDate,
      start_time: cls.start_time,
      end_time: cls.end_time,
      teacher: cls.teacher || '',
      subject: cls.subject || '',
      day_of_week: typeof cls.day_of_week === 'number' ? cls.day_of_week : undefined,
      duration: typeof cls.duration === 'number' ? cls.duration : undefined,
      teacher_id: cls.teacher_id || '',
      student_ids: Array.isArray(cls.student_ids) ? cls.student_ids : [],
      students: Array.isArray(cls.students) ? [...cls.students] : [],
      is_recurring: cls.is_recurring || false,
      recurrence_pattern: cls.recurrence_pattern || 'weekly',
      recurrence_type: cls.recurrence_type || 'finite',
      recurrence_end_date: cls.recurrence_end_date || format(addDays(new Date(), 30), 'yyyy-MM-dd')
    })
  }

  // 수업 수정 핸들러
  const handleUpdateClass = async (e) => {
    e.preventDefault()
    
    if (isAdmin()) {
      try {
        const payload = {
          id: editingClass.id?.startsWith?.('virtual_') ? editingClass.id.split('_')[1] : editingClass.id,
          title: editFormData.title,
          description: editFormData.description,
          room_id: editFormData.room_id,
          date: editFormData.date,
          start_time: editFormData.start_time,
          end_time: editFormData.end_time,
          subject: (editFormData.subject ?? '').trim() === '' ? null : editFormData.subject,
          day_of_week: editFormData.date ? getDayOfWeekFromDateStr(editFormData.date) : null,
          duration: getDurationFromTimes(editFormData.start_time, editFormData.end_time) ?? null,
          teacher_id: (editFormData.teacher_id ?? '').trim() === '' ? null : editFormData.teacher_id,
          student_ids: Array.isArray(editFormData.student_ids) ? editFormData.student_ids : undefined,
          is_recurring: editFormData.is_recurring,
          recurrence_pattern: editFormData.recurrence_pattern,
          recurrence_type: editFormData.recurrence_type,
          recurrence_end_date: editFormData.recurrence_end_date
        }
        const res = await makeAuthenticatedRequest('/api/admin/classes', {
          method: 'PATCH',
          body: JSON.stringify(payload)
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || '수업 수정 실패')
        setEditingClass(null)
        alert('수업 정보가 수정되었습니다!')
      } catch (error) {
        console.error('관리자 수업 수정 실패:', error)
        const errorMessage = error.message.includes('이미 다른 수업이 예약')
          ? `⚠️ 시간 충돌!\n\n${error.message}\n\n다른 시간을 선택해주세요.`
          : `수업 수정 실패: ${error.message}`
        alert(errorMessage)
      }
    } else {
      try {
        const updateData = {
          title: editFormData.title,
          description: editFormData.description,
          room_id: editFormData.room_id,
          date: editFormData.date,
          start_time: editFormData.start_time,
          end_time: editFormData.end_time,
          teacher: editFormData.teacher,
          students: editFormData.students.filter(student => student.trim() !== ''),
          is_recurring: editFormData.is_recurring,
          recurrence_pattern: editFormData.recurrence_pattern,
          recurrence_type: editFormData.recurrence_type,
          recurrence_end_date: editFormData.recurrence_end_date
        }
        await updateClass(editingClass.id, updateData)
        setEditingClass(null)
        alert('수업 정보가 수정되었습니다!')
      } catch (error) {
        console.error('Update error:', error)
        const errorMessage = error.message.includes('이미 다른 수업이 예약')
          ? `⚠️ 시간 충돌!\n\n${error.message}\n\n다른 시간을 선택해주세요.`
          : `수업 수정 실패: ${error.message}`
        alert(errorMessage)
      }
    }
  }

  // 수업 삭제 핸들러
  const handleDeleteClass = async (classId) => {
    try {
      console.log('Attempting to delete class:', classId)
      
      const result = await deleteClass(classId)
      console.log('Delete result:', result)
      
      setDeleteConfirm(null)
      alert('수업이 삭제되었습니다!')
    } catch (error) {
      console.error('Delete class error:', error)
      
      // 더 구체적인 에러 메시지
      let errorMessage = '수업 삭제 실패: '
      
      if (error.message.includes('RLS')) {
        errorMessage += '권한이 없습니다. 관리자에게 문의하세요.'
      } else if (error.message.includes('not found')) {
        errorMessage += '수업을 찾을 수 없습니다.'
      } else {
        errorMessage += error.message
      }
      
      alert(errorMessage)
    }
  }

  // 학생 추가 (새 수업)
  const addStudent = () => {
    if (newStudentName.trim() && !newClass.students.includes(newStudentName.trim())) {
      setNewClass({
        ...newClass,
        students: [...newClass.students, newStudentName.trim()]
      })
      setNewStudentName('')
    }
  }

  // 학생 제거 (새 수업)
  const removeStudent = (index) => {
    setNewClass({
      ...newClass,
      students: newClass.students.filter((_, i) => i !== index)
    })
  }

  // 학생 추가 (수정)
  const addStudentToEdit = () => {
    if (editNewStudentName.trim() && !editFormData.students.includes(editNewStudentName.trim())) {
      setEditFormData({
        ...editFormData,
        students: [...editFormData.students, editNewStudentName.trim()]
      })
      setEditNewStudentName('')
    }
  }

  // 학생 제거 (수정)
  const removeStudentFromEdit = (index) => {
    setEditFormData({
      ...editFormData,
      students: editFormData.students.filter((_, i) => i !== index)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">로딩 중...</div>
      </div>
    )
  }

  if (!user || (!isAdmin() && !isTeacher())) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md border border-gray-300 bg-white shadow-sm"
            >
              <span className="material-icons">arrow_back</span>
              <span>뒤로가기</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">수업 관리</h1>
              <p className="text-gray-600 mt-2">수업을 추가, 수정, 삭제하고 반복 일정을 관리할 수 있습니다.</p>
            </div>
          </div>
          {(isAdmin() || isTeacher()) && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>수업 추가</span>
            </button>
          )}
        </div>

        {/* 관리자용: 활성 수업 전체 */}
        {isAdmin() && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">활성 수업 (관리자 전체 보기)</h2>
              <div className="text-sm text-gray-500">
                {adminLoading ? '불러오는 중…' : `${adminClasses.length}건`}
              </div>
            </div>
            {adminError && (
              <div className="px-6 py-3 text-sm text-red-600">{adminError}</div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수업명</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">방</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">다음 수업</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">강사</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학생 수</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학생</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminClasses.map((cls) => (
                    <tr key={cls.id} className="hover:bg-gray-50 align-top">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{cls.title || '(제목 없음)'}</div>
                        {cls.subject && (
                          <div className="text-xs text-gray-500">과목: {cls.subject}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cls.room_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cls.next_date ? (
                          <>
                            <div>{format(parseISO(cls.next_date), 'yyyy-MM-dd (EEE)', { locale: ko })}</div>
                            <div className="text-gray-500">{cls.start_time} - {cls.end_time || '-'}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">예정 없음</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cls.teacher_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cls.student_count ?? 0}명</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {(cls.student_names || []).length > 0 ? (
                          <div className="max-w-sm truncate" title={(cls.student_names || []).join(', ')}>
                            {(cls.student_names || []).join(', ')}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(cls)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="수정"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(cls)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!adminLoading && adminClasses.length === 0 && (
                <div className="text-center py-8 text-gray-500">활성 수업이 없습니다.</div>
              )}
            </div>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">총 수업 수</h3>
            <p className="text-3xl font-bold text-blue-600">{classes.length}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">오늘 수업</h3>
            <p className="text-3xl font-bold text-green-600">
              {classes.filter(cls => cls.date === format(new Date(), 'yyyy-MM-dd')).length}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">반복 수업</h3>
            <p className="text-3xl font-bold text-purple-600">
              {classes.filter(cls => cls.is_recurring).length}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">총 학생 수</h3>
            <p className="text-3xl font-bold text-orange-600">
              {classes.reduce((total, cls) => total + (cls.students?.length || 0), 0)}
            </p>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">필터</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">방</label>
              <select
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">모든 방</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              총 {filteredClasses.length}개의 수업이 검색되었습니다.
            </p>
            <button
              onClick={() => {
                setFilterDate('')
                setFilterRoom('')
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              필터 초기화
            </button>
          </div>
        </div>

        {/* 수업 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">수업 목록</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수업명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    방
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    날짜 & 시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    강사
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    학생 수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    반복
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{cls.title}</div>
                      {cls.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{cls.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getRoomName(cls.room_id)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(parseISO(cls.date), 'yyyy-MM-dd (EEE)', { locale: ko })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {cls.start_time} - {cls.end_time}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cls.teacher || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cls.students?.length || 0}명
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {cls.is_recurring ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Repeat size={12} className="mr-1" />
                          {cls.recurrence_pattern === 'daily' && '매일'}
                          {cls.recurrence_pattern === 'weekly' && '매주'}
                          {cls.recurrence_pattern === 'biweekly' && '격주'}
                          {cls.recurrence_pattern === 'monthly' && '매월'}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(cls)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="수정"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(cls)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredClasses.length === 0 && (
              <div className="text-center py-12">
                <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">검색된 수업이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 수업 추가 모달 */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">새 수업 추가</h3>
              
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
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newClass.room_id ? getRoomName(newClass.room_id) : ''}
                        placeholder="방 선택 버튼으로 선택하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                        disabled
                        readOnly
                      />
                    </div>
                  </div>
                </div>
                {/* 과목 (생성) - 강의실 아래 */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">과목</label>
                    <select
                      value={newClass.subject || ''}
                      onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">선택</option>
                      {AVAILABLE_SUBJECTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* 생성 모달에서는 수정용 구성 블록 제거 */}

                {/* 강사 가능 시간 제안 섹션 제거 (수정 모달과 동일 단순화) */}
                
                {/* 설명 입력 유지 (수정 모달과 동일) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <textarea
                    value={newClass.description}
                    onChange={(e) => setNewClass({...newClass, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="수업에 대한 설명을 입력하세요"
                  />
                </div>
                
                {/* 과목/요일/시간 구성 중복 섹션 제거 (수정 모달과 동일 단순화) */}

                {/* 생성 모달에서는 수정용 강사 가능 시간 제안 블록 제거 */}

                {/* 생성 모달에서는 수정용 과목/요일/시간 블록 제거 */}

                {/* 생성 모달에서는 수정용 강사/학생 블록 제거 (아래 newClass 전용 블록 존재) */}
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
                    <button
                      type="button"
                      onClick={() => { setBookingContext({ type: 'create' }); setShowRoomBooking(true) }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      방 선택(겹침 자동 체크)
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 강사 입력란 제거: 관리자에선 회원 강사 드롭다운에서 선택 */}
                  
                  {/* 참가 학생 텍스트 입력 제거: 관리자에선 체크박스 섹션 사용 */}
                </div>

                {/* 강사/학생 선택 (관리자 전용) - 생성 폼도 동일 정책 적용 */}
                {isAdmin() && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">강사</label>
                      <select
                        value={newClass.teacher_id || ''}
                        onChange={(e) => setNewClass({ ...newClass, teacher_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="" disabled>{(getCreateSelectedDOW() !== null && newClass.start_time && newClass.end_time) ? '가능한 강사 선택' : '날짜/시간을 먼저 선택하세요'}</option>
                        {(((getCreateSelectedDOW() !== null) && newClass.start_time && newClass.end_time) ? filteredTeachersForCreate : []).map(t => (
                          <option key={t.user_id} value={t.user_id}>{t.name || t.email}</option>
                        ))}
                      </select>
                      {((getCreateSelectedDOW() !== null) && newClass.start_time && newClass.end_time) && filteredTeachersForCreate.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">이 시간대에 가능한 강사가 없습니다.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">참가 학생</label>
                      <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                        {studentOptions.map(s => {
                          const checked = (newClass.student_ids || []).includes(String(s.user_id))
                          return (
                            <label key={s.user_id} className="flex items-center space-x-2 py-1 px-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const prev = new Set((newClass.student_ids || []).map(String))
                                  if (e.target.checked) prev.add(String(s.user_id))
                                  else prev.delete(String(s.user_id))
                                  setNewClass({ ...newClass, student_ids: Array.from(prev) })
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-700">{s.name || s.email}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 반복 설정 제거 (항상 반복 수업 전제라면 UI 숨김) */}
                
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
                    onClick={() => setShowAddForm(false)}
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

        {/* 수업 수정 모달 */}
        {editingClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">수업 정보 수정</h3>
              
              <form onSubmit={handleUpdateClass} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      수업명 *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      강의실 *
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editFormData.room_id ? getRoomName(editFormData.room_id) : ''}
                        placeholder="방 선택 버튼으로 선택하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                        disabled
                        readOnly
                      />
                    </div>
                  </div>
                </div>
                
                {/* 과목 (수정) - 강의실 아래, 수업시간 필드 제거 */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">과목</label>
                    <select
                      value={editFormData.subject || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">선택</option>
                      {AVAILABLE_SUBJECTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      날짜 *
                    </label>
                    <input
                      type="date"
                      required
                      value={editFormData.date}
                      onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
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
                      value={editFormData.start_time}
                      onChange={(e) => setEditFormData({...editFormData, start_time: e.target.value})}
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
                      value={editFormData.end_time}
                      onChange={(e) => setEditFormData({...editFormData, end_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => { setBookingContext({ type: 'edit' }); setShowRoomBooking(true) }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      방 선택(겹침 자동 체크)
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!isAdmin() && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        강사
                      </label>
                      <input
                        type="text"
                        value={editFormData.teacher}
                        onChange={(e) => setEditFormData({...editFormData, teacher: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="강사 이름"
                        readOnly
                      />
                    </div>
                  )}

                  {isAdmin() && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">강사</label>
                      <select
                        value={editFormData.teacher_id || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, teacher_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="" disabled>{(getEditSelectedDOW() !== null && editFormData.start_time && editFormData.end_time) ? '가능한 강사 선택' : '날짜/시간을 먼저 선택하세요'}</option>
                        {(((getEditSelectedDOW() !== null) && editFormData.start_time && editFormData.end_time) ? filteredTeachersForEdit : []).map(t => (
                          <option key={t.user_id} value={t.user_id}>{t.name || t.email}</option>
                        ))}
                      </select>
                      {((getEditSelectedDOW() !== null) && editFormData.start_time && editFormData.end_time) && filteredTeachersForEdit.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">이 시간대에 가능한 강사가 없습니다.</p>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      참가 학생
                    </label>
                    {isAdmin() && (
                      <div className="border rounded-md p-2 max-h-40 overflow-y-auto mb-2">
                        {studentOptions.map(s => {
                          const checked = (editFormData.student_ids || []).includes(String(s.user_id))
                          return (
                            <label key={s.user_id} className="flex items-center space-x-2 py-1 px-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const prev = new Set((editFormData.student_ids || []).map(String))
                                  if (e.target.checked) prev.add(String(s.user_id))
                                  else prev.delete(String(s.user_id))
                                  setEditFormData({ ...editFormData, student_ids: Array.from(prev) })
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-700">{s.name || s.email}</span>
                            </label>
                          )
                        })}
                        <p className="text-xs text-gray-500 mt-1">회원 목록에서 학생을 선택하세요</p>
                      </div>
                    )}
                    
                    {editFormData.students.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editFormData.students.map((student, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {student}
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
                </div>

                {/* 반복 설정 (수정) 제거 */}
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Save size={16} />
                    <span>수정 완료</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingClass(null)}
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

        {/* 방 예약 모달 */}
        {(showAddForm || editingClass) && (
          <RoomBookingModal
            isOpen={showRoomBooking}
            onClose={() => setShowRoomBooking(false)}
            onSelectRoom={(room) => {
              if (!room || !room.id) return
              if (bookingContext.type === 'edit') {
                setEditFormData(prev => ({ ...prev, room_id: room.id }))
              } else {
                setNewClass(prev => ({ ...prev, room_id: room.id }))
              }
            }}
            dayOfWeek={bookingContext.type === 'edit' ? getEditSelectedDOW() : getCreateSelectedDOW()}
            selectedTime={bookingContext.type === 'edit' ? editFormData.start_time : newClass.start_time}
            duration={bookingContext.type === 'edit' ? (editFormData.duration ?? 60) : (newClass.duration ?? 60)}
            selectedRoom={bookingContext.type === 'edit' ? editFormData.room_id : newClass.room_id}
            subject={bookingContext.type === 'edit' ? normalizeSubjectCode(editFormData.subject || null) : normalizeSubjectCode(newClass.subject || null)}
            existingBookings={existingBookings}
          />
        )}

        {/* 삭제 확인 모달 */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4 text-red-600">수업 삭제 확인</h3>
              <p className="text-gray-700 mb-6">
                <strong>{deleteConfirm.title}</strong>을(를) 정말 삭제하시겠습니까?
                <br />
                <span className="text-sm text-red-500">이 작업은 되돌릴 수 없습니다.</span>
                {deleteConfirm.is_recurring && (
                  <><br />
                  <span className="text-sm text-orange-600">반복 수업의 원본을 삭제하면 모든 반복 일정이 영향을 받을 수 있습니다.</span></>
                )}
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handleDeleteClass(deleteConfirm.id)}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                >
                  삭제
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}