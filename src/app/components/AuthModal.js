'use client'

import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Mail, Lock, User, Loader } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import RoomBookingModal from './RoomBookingModal'
import { getAvailableRooms, subjectRequirements, facilityNames, subjectNames } from '../../data/roomHelpers'

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode) // 'login', 'signup', 'student-signup', 'teacher-signup'
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login, signup } = useAuth()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '', // 연락처 추가
    // 학생 추가 정보
    studentType: '', // '학생' 또는 '성인'
    guardianEmail: '',
    musicExperience: '',
    selectedTeacher: '',
    selectedLessonDuration: 30,
    selectedDayOfWeek: '',
    selectedTime: '',
    selectedRoom: '',
    // 강사 추가 정보
    experience: '',
    specialization: '',
    introduction: '',
    // 약관 및 서명
    termsAgreed: false,
    privacyAgreed: false,
    signatureName: ''
  })

  // 과목 목록 상수
  const AVAILABLE_SUBJECTS = [
    '피아노', '드럼', '기타', '베이스기타', '보컬', 
    '바이올린', '첼로', '플루트', '색소폰', '작곡', 
    '음악이론', '미디', '시창청음', '재즈', '클래식'
  ]
  
  // 한국어 과목명을 영어 코드로 변환
  const subjectMapping = {
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

  // 강사와 학생 관련 상태
  const [teachers, setTeachers] = useState([])
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState([]) // 강사용: 여러 과목
  const [selectedSubject, setSelectedSubject] = useState('') // 학생용: 하나의 과목
  
  // 수업 관련 상태
  const [rooms, setRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [teacherAvailability, setTeacherAvailability] = useState([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  
  // 전자서명 관련 상태
  const [signatureCanvas, setSignatureCanvas] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  
  // 방 예약 모달 상태
  const [showRoomBooking, setShowRoomBooking] = useState(false)
  
  // 기존 예약 목록
  const [existingBookings, setExistingBookings] = useState([])
  const [filteredTeachers, setFilteredTeachers] = useState([])

  // 한국 전화번호 포맷팅 함수
  const formatPhoneNumber = (value) => {
    // 숫자만 추출
    const phoneNumber = value.replace(/[^\d]/g, '')
    
    // 길이에 따른 포맷팅
    if (phoneNumber.length <= 3) {
      return phoneNumber
    } else if (phoneNumber.length <= 7) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`
    } else if (phoneNumber.length <= 11) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7)}`
    } else {
      // 11자리 초과시 11자리까지만 허용
      const truncated = phoneNumber.slice(0, 11)
      return `${truncated.slice(0, 3)}-${truncated.slice(3, 7)}-${truncated.slice(7)}`
    }
  }

  // 한국 전화번호 유효성 검증
  const validatePhoneNumber = (phone) => {
    const phoneNumber = phone.replace(/[^\d]/g, '')
    
    // 휴대폰 번호 (010, 011, 016, 017, 018, 019)
    if (/^01[016789]\d{7,8}$/.test(phoneNumber)) {
      return true
    }
    
    // 서울 지역번호 (02)
    if (/^02\d{7,8}$/.test(phoneNumber)) {
      return true
    }
    
    // 기타 지역번호 (031, 032, 033, 041, 042, 043, 044, 051, 052, 053, 054, 055, 061, 062, 063, 064)
    if (/^0(3[1-3]|4[1-4]|5[1-5]|6[1-4])\d{7,8}$/.test(phoneNumber)) {
      return true
    }
    
    return false
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    let processedValue = value
    
    // 전화번호 필드인 경우 포맷팅 적용
    if (name === 'phone') {
      processedValue = formatPhoneNumber(value)
    }
    // 수업 시간 드롭다운은 항상 숫자로 변환
    if (name === 'selectedLessonDuration') {
      processedValue = Number(value)
    }
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }))
    
    // 입력시 에러 메시지 제거
    if (error) setError('')
    
    // 과목 선택 처리
    if (name === 'selectedSubject') {
      setSelectedSubject(value)
    }
  }

  // 강사 목록 로드
  const loadTeachers = async () => {
    setLoadingTeachers(true)
    try {
      const { getSupabase } = await import('../../lib/supabase')
      const supabase = getSupabase()

      // 승인된 강사 목록 user_profiles에서 가져오기
      const { data: teachersData, error: teachersError } = await supabase
        .from('user_profiles')
        .select('user_id, name, email, subjects, specialization')
        .eq('role', 'teacher')
        .eq('status', 'approved')

      if (teachersError) {
        throw teachersError
      }

      setTeachers(teachersData || [])
    } catch (error) {
      console.error('강사 목록 로드 실패:', error)
    } finally {
      setLoadingTeachers(false)
    }
  }

  // 선택된 과목에 맞는 강사 필터링 (수업 가능한 강사만)
  const getFilteredTeachers = async (subject) => {
    if (!subject) {
      return []
    }
    
    console.log('🔍 강사 필터링 시작:', { subject, totalTeachers: teachers.length })
    
    // 1. 선택된 과목을 가르치는 강사 필터링
    const subjectTeachers = teachers.filter(teacher => 
      teacher.subjects && teacher.subjects.includes(subject)
    )
    
    console.log('📚 과목별 강사:', subjectTeachers.map(t => ({ name: t.name, id: t.user_id })))
    
    // 2. 수업 가능한 시간이 있는 강사만 필터링 (공개 API 사용)
    const availableTeachers = []
    
    for (const teacher of subjectTeachers) {
      try {
        // 공개 API를 통해 해당 강사의 수업 가능 시간 조회
        const response = await fetch(`/api/teacher/availability/public?teacherId=${teacher.user_id}`)
        const result = await response.json()
        
        if (!result.success) {
          console.error(`❌ ${teacher.name} 강사 수업 가능 시간 조회 실패:`, result.error)
          continue
        }
        
        // 데이터 구조 검증
        if (!result.availability || !Array.isArray(result.availability)) {
          console.error(`❌ ${teacher.name} 강사: 잘못된 데이터 구조`, result)
          continue
        }
        
        // 해당 강사의 수업 가능 시간 필터링
        const teacherAvailability = result.availability.filter(avail => 
          avail.teacher_id === teacher.user_id && 
          avail.start_time && 
          avail.end_time
        )
        
        console.log(`📅 ${teacher.name} 강사 수업 가능 시간:`, teacherAvailability.map(a => ({
          day: a.day_of_week,
          time: a.start_time.substring(0, 5) + '-' + a.end_time.substring(0, 5)
        })))
        
        // 해당 강사의 기존 수업 조회
        const teacherBookings = existingBookings.filter(booking => 
          booking.teacher_id === teacher.user_id
        )
        
        console.log(`📚 ${teacher.name} 강사 기존 수업:`, teacherBookings.map(b => ({
          day: b.day_of_week,
          time: b.start_time,
          duration: b.duration
        })))
        
        // 수업 가능한 시간이 있는지 확인
        const hasAvailableTime = teacherAvailability.some(avail => {
          // 해당 요일과 시간대에 기존 수업이 있는지 확인
          const conflictingBooking = teacherBookings.find(booking => 
            booking.day_of_week === avail.day_of_week &&
            booking.start_time === avail.start_time.substring(0, 5)
          )
          
          const isAvailable = !conflictingBooking
          console.log(`⏰ ${teacher.name} ${avail.day_of_week}요일 ${avail.start_time.substring(0, 5)}: ${isAvailable ? '가능' : '불가능'} (충돌: ${conflictingBooking ? '있음' : '없음'})`)
          
          // 기존 수업이 없으면 수업 가능
          return isAvailable
        })
        
        console.log(`✅ ${teacher.name} 강사 최종 결과: ${hasAvailableTime ? '선택 가능' : '선택 불가'}`)
        
        if (hasAvailableTime) {
          availableTeachers.push(teacher)
        }
      } catch (error) {
        console.error('강사 필터링 중 오류:', error)
        // 오류 발생 시 해당 강사는 제외
      }
    }
    
    console.log('🎯 최종 필터링 결과:', availableTeachers.map(t => t.name))
    return availableTeachers
  }

  // 방 목록 로드
  const loadRooms = async () => {
    setLoadingRooms(true)
    try {
      const { getSupabase } = await import('../../lib/supabase')
      const supabase = getSupabase()

      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('name')

      if (roomsError) {
        throw roomsError
      }

      setRooms(roomsData || [])
    } catch (error) {
      console.error('방 목록 로드 실패:', error)
    } finally {
      setLoadingRooms(false)
    }
  }

  // 강사 이용 가능 시간 로드
  const loadTeacherAvailability = async (teacherId) => {
    
    if (!teacherId) {
      setTeacherAvailability([])
      return
    }

    setLoadingAvailability(true)
    try {
      
      // API 엔드포인트를 통해 조회 (RLS 우회)
      const response = await fetch(`/api/teacher/availability/public?teacherId=${teacherId}`)
      
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || '알 수 없는 오류')
      }

      setTeacherAvailability(data.availability || [])
    } catch (error) {
      console.error('강사 이용 가능 시간 로드 실패:', error)
      setTeacherAvailability([])
    } finally {
      setLoadingAvailability(false)
    }
  }

  // 기존 예약 정보 로드
  const loadExistingBookings = async () => {
    try {
      const { getSupabase } = await import('../../lib/supabase')
      const supabase = getSupabase()
      // classes 테이블에서 직접 모든 활성 수업 조회
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('classes')
        .select(`
          id,
          teacher_id,
          room_id,
          day_of_week,
          start_time,
          duration,
          subject,
          status
        `)
        .eq('status', 'active')
      
      if (bookingsError) {
        throw bookingsError
      }

      // 데이터 구조 변환 (기존 코드와 호환되도록)
      const transformedBookings = bookingsData?.map(booking => ({
        id: booking.id,
        teacher_id: booking.teacher_id,
        room_id: booking.room_id,
        day_of_week: booking.day_of_week,
        start_time: booking.start_time,
        duration: booking.duration,
        subject: booking.subject,
        status: booking.status
      })) || []

      console.log('📋 기존 예약 정보 로드 완료:', transformedBookings.map(b => ({
        teacher_id: b.teacher_id,
        day: b.day_of_week,
        time: b.start_time,
        subject: b.subject
      })))

      setExistingBookings(transformedBookings)
      setFilteredTeachers(await getFilteredTeachers(selectedSubject)) // 기존 예약 정보가 로드되면 필터링된 강사 목록 업데이트
    } catch (error) {
      console.error('❌ 기존 예약 정보 로드 실패:', error)
      setExistingBookings([])
      setFilteredTeachers([]) // 오류 발생 시 필터링된 강사 목록도 비움
    }
  }

  // 학생 회원가입 모드일 때 강사 목록과 방 목록 로드
  useEffect(() => {
    if (mode === 'student-signup') {
      loadTeachers()
      loadRooms()
      loadExistingBookings()
    }
  }, [mode])

  // 기존 예약 정보가 로드되면 강사 목록 필터링 업데이트
  useEffect(() => {
    if (existingBookings.length > 0 && teachers.length > 0) {
      // 강사 목록이 이미 로드되어 있으면 필터링만 업데이트
      // getFilteredTeachers는 이미 existingBookings를 참조하므로 자동으로 업데이트됨
    }
  }, [existingBookings, teachers])

  // selectedSubject가 변경될 때 필터링된 강사 목록 업데이트
  useEffect(() => {
    if (selectedSubject && teachers.length > 0 && existingBookings.length > 0) {
      getFilteredTeachers(selectedSubject).then(setFilteredTeachers)
    }
  }, [selectedSubject, teachers, existingBookings])

  // 선택된 강사가 변경되면 이용 가능 시간 로드
  useEffect(() => {
    if (formData.selectedTeacher) {
      loadTeacherAvailability(formData.selectedTeacher)
    } else {
      setTeacherAvailability([])
    }
  }, [formData.selectedTeacher])

  // 모드가 변경될 때 서명 초기화
  useEffect(() => {
    setSignatureCanvas(null)
    setHasSignature(false)
    setIsDrawing(false)
  }, [mode])

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return false
    }

    if (mode === 'student-signup' || mode === 'teacher-signup') {
      if (!formData.name) {
        setError('이름을 입력해주세요.')
        return false
      }
      if (!formData.phone) {
        setError('연락처를 입력해주세요.')
        return false
      }
      if (!validatePhoneNumber(formData.phone)) {
        setError('올바른 한국 전화번호를 입력해주세요. (예: 010-1234-5678)')
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.')
        return false
      }
      if (formData.password.length < 6) {
        setError('비밀번호는 최소 6자 이상이어야 합니다.')
        return false
      }
      
      if (mode === 'student-signup' && !selectedSubject) {
        setError('배우고 싶은 과목을 선택해주세요.')
        return false
      }
      
      if (mode === 'teacher-signup' && selectedSubjects.length === 0) {
        setError('가르칠 수 있는 과목을 하나 이상 선택해주세요.')
        return false
      }

      // 학생 추가 정보 검증
      if (mode === 'student-signup') {
        if (!formData.studentType) {
          setError('신분을 선택해주세요.')
          return false
        }
        if (formData.studentType === '학생' && !formData.guardianEmail.trim()) {
          setError('학생 신분의 경우 보호자 이메일이 필수입니다.')
          return false
        }
        if (!hasSignature) {
          setError('서명을 그려주세요.')
          return false
        }
        if (!formData.termsAgreed || !formData.privacyAgreed) {
          setError('모든 약관에 동의해주세요.')
          return false
        }
      }

      // 강사 추가 정보 검증
      if (mode === 'teacher-signup') {
        if (!formData.experience.trim()) {
          setError('경력사항을 입력해주세요.')
          return false
        }
        if (!formData.introduction.trim()) {
          setError('자기소개를 입력해주세요.')
          return false
        }
        if (!hasSignature) {
          setError('서명을 그려주세요.')
          return false
        }
        if (!formData.termsAgreed || !formData.privacyAgreed) {
          setError('모든 약관에 동의해주세요.')
          return false
        }
      }
    }

    // 이메일 검증은 HTML input type="email"에 맡김

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password)
      } else if (mode === 'student-signup') {
        const signatureData = saveSignature()
        // 과목 한글명을 영문 코드로 변환
        const subjectMapping = {
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
        const selectedSubjectCode = subjectMapping[selectedSubject] || 'general'
        await signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'student',
          additionalData: {
            phone: formData.phone,
            studentType: formData.studentType,
            guardianEmail: formData.guardianEmail,
            musicExperience: formData.musicExperience,
            selectedSubject: selectedSubjectCode,
            selectedTeacher: formData.selectedTeacher,
            selectedLessonDuration: formData.selectedLessonDuration,
            selectedDayOfWeek: formData.selectedDayOfWeek,
            selectedTime: formData.selectedTime,
            selectedRoom: formData.selectedRoom,
            signatureData: signatureData,
            termsAgreed: formData.termsAgreed,
            privacyAgreed: formData.privacyAgreed
          }
        })
      } else if (mode === 'teacher-signup') {
        const signatureData = saveSignature()
        // 경력(년수) 숫자 변환
        const experienceValue = isNaN(Number(formData.experience)) ? null : Number(formData.experience)
        await signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'teacher',
          additionalData: {
            phone: formData.phone,
            subjects: selectedSubjects,
            experience: experienceValue,
            specialization: formData.specialization,
            introduction: formData.introduction,
            signatureData: signatureData,
            termsAgreed: formData.termsAgreed,
            privacyAgreed: formData.privacyAgreed
          }
        })
      }
      
      // 성공시 모달 닫기
      onClose()
      resetForm()
    } catch (err) {
      console.error('인증 에러:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      // 학생 추가 정보
      studentType: '',
      guardianEmail: '',
      musicExperience: '',
      selectedTeacher: '',
      selectedLessonDuration: 30,
      selectedDayOfWeek: '',
      selectedTime: '',
      selectedRoom: '',
      // 강사 추가 정보
      experience: '',
      specialization: '',
      introduction: '',
      // 약관 및 서명
      termsAgreed: false,
      privacyAgreed: false
    })
    setSelectedSubject('')
    setSelectedSubjects([])
    setError('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setTeacherAvailability([])
    setHasSignature(false)
    if (signatureCanvas) {
      clearSignature()
    }
  }

  // 요일 한글 변환 함수
  const getDayName = (dayNumber) => {
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return days[dayNumber] || ''
  }

  // 시간 포맷 함수
  const formatTime = (timeString) => {
    if (!timeString) return ''
    const [hours, minutes] = timeString.split(':')
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
  }

  // 가격 계산 함수
  const calculatePrice = () => {
    return formData.selectedLessonDuration === 60 ? 200000 : 100000
  }

  // 방 선택 관련 함수들
  const handleRoomBookingOpen = () => {
    setShowRoomBooking(true)
  }

  const handleRoomBookingClose = () => {
    setShowRoomBooking(false)
  }

  const handleRoomSelect = (room) => {
    setFormData(prev => ({
      ...prev,
      selectedRoom: room.id
    }))
  }

  // 시간 옵션 생성 함수
  const generateTimeOptions = (startTime, endTime, duration) => {
    const options = []
    const start = new Date(`2000-01-01 ${startTime}`)
    const end = new Date(`2000-01-01 ${endTime}`)
    
    while (start < end) {
      const timeString = start.toTimeString().slice(0, 5)
      options.push(timeString)
      start.setMinutes(start.getMinutes() + duration)
    }
    
    return options
  }

  // 전자서명 관련 함수들
  const initializeSignatureCanvas = (canvas) => {
    if (!canvas) {
      return
    }
    
    // 기존 캔버스가 있다면 초기화하지 않고 스킵
    if (signatureCanvas === canvas) {
      return
    }
    
    setSignatureCanvas(canvas)
    const ctx = canvas.getContext('2d')
    
    // 캔버스 크기를 실제 표시 크기와 동일하게 설정
    const rect = canvas.getBoundingClientRect()
    
    // 크기가 0인 경우 기본값 사용
    let canvasWidth = rect.width
    let canvasHeight = rect.height
    
    if (canvasWidth === 0 || canvasHeight === 0) {
      canvasWidth = 400  // 기본 너비
      canvasHeight = 120 // 기본 높이
    }
    
    // 직접 픽셀 크기 설정 (DPR 복잡성 제거)
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    
    // 캔버스 설정
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // 배경을 흰색으로 설정
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const startDrawing = (e) => {
    if (!signatureCanvas) {
      return
    }
    
    setIsDrawing(true)
    const rect = signatureCanvas.getBoundingClientRect()
    
    const clientX = e.clientX || e.touches?.[0]?.clientX
    const clientY = e.clientY || e.touches?.[0]?.clientY
    
    // 간단한 좌표 계산 (스케일링 제거)
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    const ctx = signatureCanvas.getContext('2d')
    
    // 컨텍스트 상태를 다시 설정 (보존 보장)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!isDrawing || !signatureCanvas) {
      return
    }
    
    e.preventDefault()
    const rect = signatureCanvas.getBoundingClientRect()
    
    const clientX = e.clientX || e.touches?.[0]?.clientX
    const clientY = e.clientY || e.touches?.[0]?.clientY
    
    // 간단한 좌표 계산 (스케일링 제거)
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    const ctx = signatureCanvas.getContext('2d')
    
    // 컨텍스트 상태를 매번 다시 설정 (보존 보장)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // 현재 캔버스 상태 확인
    ctx.lineTo(x, y)
    ctx.stroke()
    
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    if (!signatureCanvas) return
    
    const ctx = signatureCanvas.getContext('2d')
    
    // 전체 캔버스 지우기
    ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height)
    // 배경을 흰색으로 다시 설정
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height)
    setHasSignature(false)
  }

  const saveSignature = () => {
    if (!signatureCanvas || !hasSignature) {
      return null
    }
    
    const dataURL = signatureCanvas.toDataURL('image/png')
    return dataURL
  }

  // 테스트용: 캔버스 상태 확인 함수
  const checkCanvasContent = () => {
    if (!signatureCanvas) {
      return
    }
    
    const ctx = signatureCanvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height)
    const data = imageData.data
    
    // 흰색이 아닌 픽셀이 있는지 확인
    let hasContent = false
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      
      // 완전한 흰색이 아니면 내용이 있다고 판단
      if (!(r === 255 && g === 255 && b === 255 && a === 255)) {
        hasContent = true
        break
      }
    }
    
  }

  // 시간 겹침 체크 함수 추가
  function isTimeOverlap(startA, durationA, startB, durationB) {
    const toMinutes = t => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }
    const aStart = toMinutes(startA)
    const aEnd = aStart + durationA
    const bStart = toMinutes(startB)
    const bEnd = bStart + durationB
    return aStart < bEnd && bStart < aEnd
  }

  const switchMode = () => {
    if (mode === 'login') {
      setMode('signup')
    } else {
      setMode('login')
    }
    resetForm()
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        {/* 모달 컨테이너 */}
        <div 
          className="bg-white rounded-2xl w-full max-w-2xl p-8 relative max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>

          {/* 헤더 */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {mode === 'login' ? '로그인' : 
               mode === 'signup' ? '회원가입 유형 선택' :
               mode === 'student-signup' ? '학생 회원가입' : '강사 회원가입'}
            </h2>
            <p className="text-gray-600">
              {mode === 'login' 
                ? 'Pretium Sound에 오신 것을 환영합니다!' 
                : mode === 'signup'
                ? '어떤 유형으로 가입하시겠습니까?'
                : '새로운 음악 여정을 시작해보세요!'
              }
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <div className="font-medium mb-1">오류가 발생했습니다</div>
              <div className="text-sm">{error}</div>
              {error.includes('탈퇴한 계정인 경우') && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
                  <div className="font-medium mb-1">💡 탈퇴한 계정 재가입 안내</div>
                  <div>
                    탈퇴한 계정으로 재가입을 원하시는 경우, 관리자에게 문의해주세요.<br/>
                    관리자가 계정을 완전히 삭제한 후 다시 가입할 수 있습니다.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 회원가입 유형 선택 */}
          {mode === 'signup' && (
            <div className="space-y-4 mb-6">
              <button
                type="button"
                onClick={() => setMode('student-signup')}
                className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">학생으로 가입</h3>
                    <p className="text-sm text-gray-600">음악 수업을 받고 싶어요</p>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setMode('teacher-signup')}
                className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="text-green-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">강사로 가입</h3>
                    <p className="text-sm text-gray-600">음악을 가르치고 싶어요</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* 폼 */}
          {(mode === 'login' || mode === 'student-signup' || mode === 'teacher-signup') && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이름 (회원가입시만) */}
            {(mode === 'student-signup' || mode === 'teacher-signup') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="이름을 입력하세요"
                    required
                  />
                </div>
              </div>
            )}

            {/* 연락처 (회원가입시만) */}
            {(mode === 'student-signup' || mode === 'teacher-signup') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연락처 *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="010-1234-5678"
                    maxLength="13"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  한국 전화번호만 입력 가능합니다 (자동으로 하이픈이 추가됩니다)
                </p>
              </div>
            )}

            {/* 과목 선택 (학생 회원가입시) */}
            {mode === 'student-signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배우고 싶은 과목 *
                </label>
                <select
                  name="selectedSubject"
                  value={selectedSubject}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  required
                >
                  <option value="">과목을 선택해주세요</option>
                  {AVAILABLE_SUBJECTS.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 과목 선택 (강사 회원가입시) */}
            {mode === 'teacher-signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  가르칠 수 있는 과목 * (여러 개 선택 가능)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {AVAILABLE_SUBJECTS.map(subject => (
                    <label key={subject} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(subject)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSubjects([...selectedSubjects, subject])
                          } else {
                            setSelectedSubjects(selectedSubjects.filter(s => s !== subject))
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{subject}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 이메일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="이메일을 입력하세요"
                  required
                />
              </div>
            </div>

            {/* 강사 선택 (학생 회원가입시) */}
            {mode === 'student-signup' && selectedSubject && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  강사 선택 (선택사항)
                </label>
                <select
                  name="selectedTeacher"
                  value={formData.selectedTeacher || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  disabled={loadingTeachers}
                >
                  <option value="">강사 선택 (나중에 선택 가능)</option>
                  {filteredTeachers.map(teacher => (
                    <option key={teacher.user_id} value={teacher.user_id}>
                      {teacher.name} ({teacher.subjects.join(', ')})
                    </option>
                  ))}
                </select>
                {loadingTeachers && (
                  <p className="text-xs text-gray-500 mt-1">강사 목록 로딩 중...</p>
                )}
                {filteredTeachers.length === 0 && !loadingTeachers && (
                  <p className="text-xs text-gray-500 mt-1">해당 과목을 가르치는 강사가 없습니다.</p>
                )}
              </div>
            )}

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="비밀번호를 입력하세요"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* 비밀번호 확인 (회원가입시만) */}
            {(mode === 'student-signup' || mode === 'teacher-signup') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="비밀번호를 다시 입력하세요"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            {/* 학생 추가 정보 */}
            {mode === 'student-signup' && (
              <div className="space-y-6">
                {/* 기본 정보 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      신분 *
                    </label>
                    <select
                      name="studentType"
                      value={formData.studentType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      required
                    >
                      <option value="">신분을 선택하세요</option>
                      <option value="학생">학생 (18세 미만)</option>
                      <option value="성인">성인 (18세 이상)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      수업 시간
                    </label>
                    <select
                      name="selectedLessonDuration"
                      value={formData.selectedLessonDuration}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    >
                      <option value={30}>30분 (100,000원/월)</option>
                      <option value={60}>60분 (200,000원/월)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    보호자 이메일 {formData.studentType === '학생' && '(필수)'}
                  </label>
                  <input
                    type="email"
                    name="guardianEmail"
                    value={formData.guardianEmail}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="보호자 이메일 주소"
                    required={formData.studentType === '학생'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    음악 경험
                  </label>
                  <textarea
                    name="musicExperience"
                    value={formData.musicExperience}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="이전 음악 학습 경험이나 연주할 수 있는 악기 등을 알려주세요"
                    rows={3}
                  />
                </div>

                {/* 수업 스케줄 설정 */}
                {formData.selectedTeacher && (
                  <div className="mt-6 p-6 bg-blue-50 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">수업 스케줄 설정</h4>
                    
                    {/* 로딩 상태 표시 */}
                    {loadingAvailability && (
                      <div className="flex items-center space-x-2 text-blue-600 mb-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm">강사님의 이용 가능 시간을 불러오는 중...</span>
                      </div>
                    )}
                    
                    {/* 가능 시간이 없을 때 */}
                    {!loadingAvailability && teacherAvailability.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-600 mb-2">선택한 강사님의 이용 가능 시간이 설정되어 있지 않습니다.</p>
                        <p className="text-sm text-gray-500">강사님께 이용 가능 시간 설정을 요청해보세요.</p>
                      </div>
                    )}
                    
                    {/* 요일 선택 */}
                    {!loadingAvailability && teacherAvailability.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          수업 요일
                        </label>
                        <div className="grid grid-cols-7 gap-2">
                          {teacherAvailability.reduce((uniqueDays, slot) => {
                            if (!uniqueDays.find(day => day.day_of_week === slot.day_of_week)) {
                              uniqueDays.push(slot)
                            }
                            return uniqueDays
                          }, []).map(daySlot => (
                            <button
                              key={daySlot.day_of_week}
                              type="button"
                              onClick={() => setFormData(prev => ({...prev, selectedDayOfWeek: daySlot.day_of_week, selectedTime: ''}))}
                              className={`p-2 text-sm rounded-lg border transition-colors ${
                                formData.selectedDayOfWeek === daySlot.day_of_week
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                              }`}
                            >
                              {getDayName(daySlot.day_of_week)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 시간 선택 */}
                    {!loadingAvailability && formData.selectedDayOfWeek && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          수업 시간
                        </label>
                        <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                          {teacherAvailability
                            .filter(slot => slot.day_of_week === formData.selectedDayOfWeek)
                            .flatMap(slot => 
                              generateTimeOptions(slot.start_time, slot.end_time, formData.selectedLessonDuration)
                            )
                            .filter(time => {
                              // 이미 예약된 시간인지 확인 (방 기준 중복 체크 추가)
                              const isBooked = existingBookings.some(booking => {
                                // existingBookings는 classes 테이블에서 가져온 데이터이므로 start_time 사용
                                const bookingTime = booking.start_time ? booking.start_time.substring(0, 5) : ''
                                const dayMatch = String(booking.day_of_week) === String(formData.selectedDayOfWeek)
                                const teacherMatch = String(booking.teacher_id) === String(formData.selectedTeacher)
                                const roomMatch = String(booking.room_id) === String(formData.selectedRoom)
                                const statusMatch = ['active', 'pending', 'approved'].includes(booking.status)
                                const bookingDuration = booking.duration || 60
                                const selectedDuration = Number(formData.selectedLessonDuration) || 30
                                const overlap = isTimeOverlap(
                                  bookingTime,
                                  bookingDuration,
                                  time,
                                  selectedDuration
                                )
                                // 강사 기준 중복 체크 (같은 강사가 같은 시간에 다른 수업 불가)
                                const teacherConflict = teacherMatch && dayMatch && statusMatch && overlap
                                // 방 기준 중복 체크 (같은 방에서 같은 시간에 다른 수업 불가)
                                const roomConflict = roomMatch && dayMatch && statusMatch && overlap
                                
                                return teacherConflict || roomConflict
                              })
                              return !isBooked
                            })
                            .map(time => (
                              <button
                                key={time}
                                type="button"
                                onClick={() => setFormData(prev => ({...prev, selectedTime: time}))}
                                className={`p-2 text-sm rounded-lg border transition-colors ${
                                  formData.selectedTime === time
                                    ? 'bg-blue-500 text-white border-blue-500'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                }`}
                              >
                                {formatTime(time)}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* 방 선택 */}
                    {!loadingAvailability && formData.selectedTime && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          수업 방
                        </label>
                        <button
                          type="button"
                          onClick={handleRoomBookingOpen}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-left bg-white hover:bg-gray-50"
                        >
                          {formData.selectedRoom ? 
                            rooms.find(r => r.id === formData.selectedRoom)?.name || '방을 선택해주세요' : 
                            '방을 선택해주세요'
                          }
                        </button>
                        <p className="text-xs text-gray-500 mt-1">클릭하면 방 예약 페이지가 열립니다</p>
                      </div>
                    )}

                    {/* 선택 요약 */}
                    {!loadingAvailability && formData.selectedDayOfWeek && formData.selectedTime && formData.selectedRoom && (
                      <div className="mt-4 p-4 bg-white rounded-lg border">
                        <h5 className="font-medium text-gray-800 mb-2">선택한 수업 정보</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>• 과목: {selectedSubject}</p>
                          <p>• 강사: {teachers.find(t => t.user_id === formData.selectedTeacher)?.name}</p>
                          <p>• 수업 시간: {formData.selectedLessonDuration}분</p>
                          <p>• 요일: 매주 {getDayName(formData.selectedDayOfWeek)}요일</p>
                          <p>• 시간: {formatTime(formData.selectedTime)}</p>
                          <p>• 방: {rooms.find(r => r.id === formData.selectedRoom)?.name}</p>
                          <p>• 월 수강료: {calculatePrice().toLocaleString()}원</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 약관 동의 및 서명 */}
                <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">약관 동의 및 서명</h4>
                  
                  <div className="space-y-3 mb-4">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.termsAgreed}
                        onChange={(e) => setFormData(prev => ({...prev, termsAgreed: e.target.checked}))}
                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">
                        <strong>이용약관</strong>에 동의합니다. 
                        <a href="/documents/terms-of-service.pdf" target="_blank" className="text-indigo-600 hover:underline ml-1">
                          [전문 보기]
                        </a>
                      </span>
                    </label>
                    
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.privacyAgreed}
                        onChange={(e) => setFormData(prev => ({...prev, privacyAgreed: e.target.checked}))}
                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">
                        <strong>개인정보처리방침</strong>에 동의합니다.
                        <a href="/documents/privacy-policy-1.png" target="_blank" className="text-indigo-600 hover:underline ml-1">
                          [전문 보기]
                        </a>
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      전자 서명 *
                    </label>

                    {/* 서명 패드 */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">아래 영역에 마우스나 터치로 서명해주세요</p>
                      <canvas
                        key={`student-signature-${mode}`}
                        ref={(canvas) => {
                          if (canvas) {
                            // 재시도 횟수 제한된 초기화
                            let retryCount = 0
                            const maxRetries = 10
                            
                            const initCanvas = () => {
                              const rect = canvas.getBoundingClientRect()
                              
                              if (rect.width > 0 && rect.height > 0) {
                                initializeSignatureCanvas(canvas)
                              } else if (retryCount < maxRetries) {
                                retryCount++
                                setTimeout(initCanvas, 300)
                              } else {
                                initializeSignatureCanvas(canvas)
                              }
                            }
                            
                            setTimeout(initCanvas, 100)
                          }
                        }}
                        className="w-full border border-gray-300 rounded bg-white cursor-crosshair"
                        style={{ 
                          height: '120px',
                          touchAction: 'none',
                          userSelect: 'none',
                          WebkitUserSelect: 'none'
                        }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={(e) => {
                          e.preventDefault()
                          startDrawing(e)
                        }}
                        onTouchMove={(e) => {
                          e.preventDefault()
                          draw(e)
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault()
                          stopDrawing()
                        }}
                      />
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={clearSignature}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            서명 지우기
                          </button>
                          <button
                            type="button"
                            onClick={checkCanvasContent}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            상태 확인
                          </button>
                        </div>
                        {hasSignature && (
                          <span className="text-sm text-green-600">✓ 서명 완료</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 강사 추가 정보 */}
            {mode === 'teacher-signup' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    경력사항 *
                  </label>
                  <textarea
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="음악 관련 학력, 경력, 수상경력 등을 작성해주세요"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    전문 분야
                  </label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="예: 클래식 피아노, 재즈 기타, 오페라 성악 등"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    자기소개 *
                  </label>
                  <textarea
                    name="introduction"
                    value={formData.introduction}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="학생들에게 전하고 싶은 메시지, 교육 철학, 교육 방식 등을 소개해주세요"
                    rows={4}
                    required
                  />
                </div>

                {/* 약관 동의 및 서명 */}
                <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">약관 동의 및 서명</h4>
                  
                  <div className="space-y-3 mb-4">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.termsAgreed}
                        onChange={(e) => setFormData(prev => ({...prev, termsAgreed: e.target.checked}))}
                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">
                        <strong>이용약관</strong>에 동의합니다. 
                        <a href="/documents/terms-of-service.pdf" target="_blank" className="text-indigo-600 hover:underline ml-1">
                          [전문 보기]
                        </a>
                      </span>
                    </label>
                    
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.privacyAgreed}
                        onChange={(e) => setFormData(prev => ({...prev, privacyAgreed: e.target.checked}))}
                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">
                        <strong>개인정보처리방침</strong>에 동의합니다.
                        <a href="/documents/privacy-policy-1.png" target="_blank" className="text-indigo-600 hover:underline ml-1">
                          [전문 보기]
                        </a>
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      전자 서명 *
                    </label>
                    
                    {/* 서명 패드 */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">아래 영역에 마우스나 터치로 서명해주세요</p>
                      <canvas
                        key={`teacher-signature-${mode}`}
                        ref={(canvas) => {
                          if (canvas) {
                            // 재시도 횟수 제한된 초기화
                            let retryCount = 0
                            const maxRetries = 10
                            
                            const initCanvas = () => {
                              const rect = canvas.getBoundingClientRect()
                              
                              if (rect.width > 0 && rect.height > 0) {
                                initializeSignatureCanvas(canvas)
                              } else if (retryCount < maxRetries) {
                                retryCount++
                                setTimeout(initCanvas, 300)
                              } else {
                                initializeSignatureCanvas(canvas)
                              }
                            }
                            
                            setTimeout(initCanvas, 100)
                          }
                        }}
                        className="w-full border border-gray-300 rounded bg-white cursor-crosshair"
                        style={{ 
                          height: '120px',
                          touchAction: 'none',
                          userSelect: 'none',
                          WebkitUserSelect: 'none'
                        }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={(e) => {
                          e.preventDefault()
                          startDrawing(e)
                        }}
                        onTouchMove={(e) => {
                          e.preventDefault()
                          draw(e)
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault()
                          stopDrawing()
                        }}
                      />
                      <div className="flex justify-between mt-2">
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          서명 지우기
                        </button>
                        {hasSignature && (
                          <span className="text-sm text-green-600">✓ 서명 완료</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}



            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading && <Loader className="animate-spin" size={20} />}
              <span>
                {isLoading 
                  ? (mode === 'login' ? '로그인 중...' : '회원가입 중...') 
                  : (mode === 'login' ? '로그인' : '회원가입')
                }
              </span>
            </button>
          </form>
          )}

          {/* 모드 전환 */}
          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <p className="text-gray-600">
              {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
              <button
                onClick={switchMode}
                className="ml-2 text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {mode === 'login' ? '회원가입' : '로그인'}
              </button>
            </p>
            {(mode === 'student-signup' || mode === 'teacher-signup') && (
              <button
                onClick={() => setMode('signup')}
                className="mt-2 text-sm text-gray-500 hover:text-gray-700"
              >
                ← 회원가입 유형 선택으로 돌아가기
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* 방 예약 모달 */}
      <RoomBookingModal
        isOpen={showRoomBooking}
        onClose={handleRoomBookingClose}
        onSelectRoom={handleRoomSelect}
        dayOfWeek={formData.selectedDayOfWeek !== '' ? Number(formData.selectedDayOfWeek) : null}
        selectedTime={formData.selectedTime}
        duration={formData.selectedLessonDuration}
        selectedRoom={formData.selectedRoom}
        subject={subjectMapping[selectedSubject] || 'general'}
        existingBookings={existingBookings}
      />
    </>
  )
}