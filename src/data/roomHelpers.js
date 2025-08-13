// 방 시설 관련 유틸리티 함수들

// 시설별 한국어 이름
export const facilityNames = {
  piano: '피아노',
  drum_set: '드럼세트', 
  midi_computer: '미디 컴퓨터',
  speakers: '스피커',
  microphone: '마이크',
  audio_interface: '오디오 인터페이스',
  music_stand: '악보대',
  amp: '앰프',
  keyboard: '키보드/신디사이저',
  guitar: '기타'
}

// 과목별 필수 시설 매핑
export const subjectRequirements = {
  'piano': ['piano', 'music_stand'],
  'drum': ['drum_set'],
  'vocal': [], // 보컬은 시설 필요 없음
  'guitar': ['guitar', 'amp', 'music_stand'],
  'bass': ['amp', 'music_stand'],
  'composition': ['midi_computer', 'speakers', 'keyboard'],
  'mixing': ['midi_computer', 'speakers', 'audio_interface'],
  'production': ['midi_computer', 'speakers', 'audio_interface'],
  'general': ['music_stand'] // 일반/기타 악기
}

// 과목별 한국어 이름
export const subjectNames = {
  'piano': '피아노',
  'drum': '드럼',
  'vocal': '보컬',
  'guitar': '기타',
  'bass': '베이스',
  'composition': '작곡',
  'mixing': '믹싱',
  'production': '프로듀싱',
  'general': '일반/기타 악기'
}

/**
 * 방이 특정 과목에 적합한지 확인
 * @param {Object} room - 방 정보
 * @param {string} subject - 과목 코드
 * @returns {boolean} - 적합 여부
 */
export const isRoomSuitableForSubject = (room, subject) => {
  if (!room || !subject) {
    console.log(`❌ ${room?.name || 'Unknown'}: room 또는 subject 누락`)
    return false
  }
  
  try {
    // 방 시설 정보 파싱
    const facilities = typeof room.facilities === 'string' 
      ? JSON.parse(room.facilities) 
      : room.facilities || {}
    
    // 해당 과목의 필수 시설
    const requiredFacilities = subjectRequirements[subject] || []
    
    console.log(`🔍 ${room.name} (${subject}):`, {
      시설: facilities,
      필수시설: requiredFacilities
    })
    
    // 모든 필수 시설이 있는지 확인
    const isValid = requiredFacilities.every(facility => facilities[facility] === true)
    
    console.log(`${isValid ? '✅' : '❌'} ${room.name}: ${isValid ? '적합' : '부적합'}`)
    
    return isValid
  } catch (error) {
    console.warn('❌ 방 시설 정보 파싱 실패:', room.name, error)
    return false
  }
}

/**
 * 과목에 맞는 방 목록 필터링
 * @param {Array} rooms - 방 목록
 * @param {string} subject - 과목 코드
 * @returns {Array} - 필터링된 방 목록
 */
export const filterRoomsBySubject = (rooms, subject) => {
  if (!rooms || !Array.isArray(rooms)) return []
  if (!subject) return rooms
  
  return rooms.filter(room => isRoomSuitableForSubject(room, subject))
}

// 시간 겹침 체크 함수 (시작 시간, 길이 기준)
export const isTimeOverlap = (startA, durationA, startB, durationB) => {
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

/**
 * 특정 시간에 방이 사용 가능한지 확인 (duration까지 고려)
 * @param {Object} room - 방 정보
 * @param {number} dayOfWeek - 요일 (0=일요일, 6=토요일)
 * @param {string} lessonTime - 수업 시간 (HH:MM 형식)
 * @param {Array} existingBookings - 기존 예약 목록
 * @param {number} duration - 수업 길이(분)
 * @returns {boolean} - 사용 가능 여부
 */
export const isRoomAvailable = (room, dayOfWeek, lessonTime, existingBookings = [], duration = 60) => {
  if (!room || dayOfWeek === undefined || !lessonTime) {
    console.log(`❌ ${room?.name || 'Unknown'}: 시간 파라미터 누락`)
    return false
  }
  
  // existingBookings가 배열이 아닌 경우 처리
  if (!Array.isArray(existingBookings)) {
    console.warn('existingBookings가 배열이 아님:', existingBookings)
    return true // 예약 데이터가 없으면 사용 가능
  }
  // duration(수업 길이)까지 고려해서 겹치는 예약이 있으면 false
  const normalizedDayOfWeek = String(dayOfWeek)
  const normalizedLessonTime = lessonTime.length === 5 ? lessonTime : lessonTime.substring(0, 5)
  const conflictingBooking = existingBookings.find(booking => {
    // booking.lesson_time이 없으면 booking.start_time 사용 (classes 테이블 구조에 맞춤)
    const bookingTime = booking.lesson_time || booking.start_time
    const bookingDuration = booking.lesson_duration || booking.duration || 60
    
    if (!bookingTime) {
      console.warn('예약 데이터에 시간 정보가 없음:', booking)
      return false
    }
    
    return String(booking.room_id) === String(room.id) &&
      String(booking.day_of_week) === normalizedDayOfWeek &&
      ['active', 'pending', 'approved'].includes(booking.status) &&
      isTimeOverlap(
        bookingTime.length === 5 ? bookingTime : bookingTime.substring(0, 5),
        bookingDuration,
        normalizedLessonTime,
        duration
      )
  })
  const isAvailable = !conflictingBooking
  console.log(`⏰ ${room.name} 시간 체크:`, {
    요일: normalizedDayOfWeek,
    시간: normalizedLessonTime,
    길이: duration,
    충돌예약: conflictingBooking ? 'Yes' : 'No',
    결과: isAvailable ? '사용가능' : '사용불가'
  })
  return isAvailable
}

/**
 * 과목과 시간에 맞는 사용 가능한 방 목록
 * @param {Array} rooms - 방 목록
 * @param {string} subject - 과목 코드
 * @param {number} dayOfWeek - 요일
 * @param {string} lessonTime - 수업 시간
 * @param {Array} existingBookings - 기존 예약 목록
 * @returns {Array} - 사용 가능한 방 목록
 */
export const getAvailableRooms = (rooms, subject, dayOfWeek, lessonTime, existingBookings = [], duration = 60) => {
  // 입력 데이터 검증
  if (!Array.isArray(rooms)) {
    console.warn('rooms가 배열이 아님:', rooms)
    return []
  }
  
  if (!Array.isArray(existingBookings)) {
    console.warn('existingBookings가 배열이 아님:', existingBookings)
    existingBookings = []
  }
  
  console.log('🏠 getAvailableRooms 시작:', { 
    totalRooms: rooms.length, 
    subject, 
    dayOfWeek, 
    lessonTime, 
    bookings: existingBookings.length,
    duration
  })
  
  // 1. 과목에 맞는 방 필터링
  const suitableRooms = filterRoomsBySubject(rooms, subject)
  console.log('🎯 과목 필터링 후:', suitableRooms.length, '개')
  console.log('📋 과목에 맞는 방들:', suitableRooms.map(r => r.name))
  
  // 2. 시간 가용성 확인 (duration까지 전달)
  const availableRooms = suitableRooms.filter(room => {
    const isAvailable = isRoomAvailable(room, dayOfWeek, lessonTime, existingBookings, duration)
    console.log(`⏰ ${room.name} 시간 가용성:`, isAvailable)
    return isAvailable
  })
  
  console.log('✅ 최종 사용 가능한 방:', availableRooms.length, '개')
  
  return availableRooms
}

/**
 * 방의 시설 정보를 문자열로 표시
 * @param {Object} room - 방 정보
 * @param {number} maxItems - 최대 표시할 시설 수
 * @returns {string} - 시설 문자열
 */
export const getRoomFacilitiesText = (room, maxItems = 3) => {
  if (!room) return '없음'
  
  try {
    const facilities = typeof room.facilities === 'string' 
      ? JSON.parse(room.facilities) 
      : room.facilities || {}
    
    const activeFacilities = Object.entries(facilities)
      .filter(([key, value]) => value)
      .map(([key]) => facilityNames[key])
      .filter(Boolean)
    
    if (activeFacilities.length === 0) return '없음'
    
    if (activeFacilities.length <= maxItems) {
      return activeFacilities.join(', ')
    }
    
    return activeFacilities.slice(0, maxItems).join(', ') + ' 외'
  } catch (error) {
    console.warn('시설 정보 파싱 실패:', error)
    return '없음'
  }
}

/**
 * 방 사용 통계
 * @param {Array} rooms - 방 목록
 * @param {Array} bookings - 예약 목록
 * @returns {Object} - 통계 정보
 */
export const getRoomUsageStats = (rooms, bookings) => {
  const stats = {
    totalRooms: rooms.length,
    roomsWithFacilities: 0,
    mostPopularFacilities: {},
    utilizationRate: 0
  }
  
  // 시설 보유 방 수 계산
  rooms.forEach(room => {
    try {
      const facilities = typeof room.facilities === 'string' 
        ? JSON.parse(room.facilities) 
        : room.facilities || {}
      
      const hasFacilities = Object.values(facilities).some(value => value === true)
      if (hasFacilities) {
        stats.roomsWithFacilities++
        
        // 시설별 사용 통계
        Object.entries(facilities).forEach(([facility, hasIt]) => {
          if (hasIt) {
            stats.mostPopularFacilities[facility] = (stats.mostPopularFacilities[facility] || 0) + 1
          }
        })
      }
    } catch (error) {
      console.warn('시설 정보 파싱 실패:', error)
    }
  })
  
  // 방 사용률 계산 (총 가능한 시간슬롯 대비 예약된 시간슬롯)
  const totalTimeSlots = rooms.length * 7 * 12 // 방수 * 요일 * 하루 12시간 가정
  const bookedSlots = bookings.filter(booking => booking.status === 'active').length
  stats.utilizationRate = totalTimeSlots > 0 ? (bookedSlots / totalTimeSlots * 100) : 0
  
  return stats
} 