// src/app/contexts/RoomContext.js - 함수 순서 수정 버전
'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import { format, addMonths, isAfter, isBefore } from 'date-fns'

const RoomContext = createContext()

export function RoomProvider({ children }) {
  const [rooms, setRooms] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [cachedVirtualClasses, setCachedVirtualClasses] = useState([])
  
  const { user } = useAuth()
  const supabase = getSupabase()

  // 실시간 구독 설정
  useEffect(() => {
    if (!supabase) return

    let roomsSubscription = null
    let classesSubscription = null

    const setupSubscriptions = async () => {
      try {
        // 방 데이터 구독
        roomsSubscription = supabase
          .channel('rooms_changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'rooms'
          }, (payload) => {
            console.log('Rooms change received!', payload)
            fetchRooms()
          })
          .subscribe()

        // 수업 데이터 구독
        classesSubscription = supabase
          .channel('classes_changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'classes'
          }, (payload) => {
            console.log('Classes change received!', payload)
            fetchClasses()
          })
          .subscribe()

        // 초기 데이터 로드
        await Promise.all([fetchRooms(), fetchClasses()])
      } catch (error) {
        console.error('Subscription setup error:', error)
        setLoading(false)
      }
    }

    setupSubscriptions()

    return () => {
      if (roomsSubscription) {
        supabase.removeChannel(roomsSubscription)
      }
      if (classesSubscription) {
        supabase.removeChannel(classesSubscription)
      }
    }
  }, [supabase])

  // 방 데이터 가져오기
  const fetchRooms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('name')

      if (error) throw error
      setRooms(data || [])
      console.log('Rooms fetched:', data?.length || 0)
    } catch (error) {
      console.error('Error fetching rooms:', error)
    }
  }, [supabase])

  // 수업 데이터 가져오기
  const fetchClasses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('date, start_time')

      if (error) throw error
      setClasses(data || [])
      
      // 가상 반복 수업 캐시 업데이트
      updateVirtualClassesCache(data || [])
      setLoading(false)
      console.log('Classes fetched:', data?.length || 0)
    } catch (error) {
      console.error('Error fetching classes:', error)
      setLoading(false)
    }
  }, [supabase])

  // 가상 반복 수업 캐시 생성
  const updateVirtualClassesCache = useCallback((currentClasses) => {
    const now = new Date()
    const cacheEndDate = addMonths(now, 3) // 3개월간 캐시
    
    const recurringClasses = currentClasses.filter(cls => cls.is_recurring)
    const newVirtualClasses = []
    
    recurringClasses.forEach(recurringClass => {
      const originalStartDate = new Date(recurringClass.date)
      let currentDate = new Date(Math.max(now.getTime(), originalStartDate.getTime()))
      
      // 종료일 설정
      let endDate = cacheEndDate
      if (recurringClass.recurrence_type === 'finite' && recurringClass.recurrence_end_date) {
        const recurrenceEndDate = new Date(recurringClass.recurrence_end_date)
        if (isBefore(recurrenceEndDate, cacheEndDate)) {
          endDate = recurrenceEndDate
        }
      }
      
      // 가상 클래스 생성
      while (currentDate <= endDate) {
        const shouldCreateClass = (() => {
          switch (recurringClass.recurrence_pattern) {
            case 'daily':
              return true
            case 'weekly':
              return currentDate.getDay() === originalStartDate.getDay()
            case 'biweekly':
              const diffWeeks = Math.floor((currentDate - originalStartDate) / (1000 * 60 * 60 * 24 * 7))
              return currentDate.getDay() === originalStartDate.getDay() && diffWeeks % 2 === 0
            case 'monthly':
              return currentDate.getDate() === originalStartDate.getDate()
            default:
              return false
          }
        })()
        
        if (shouldCreateClass) {
          const dateStr = format(currentDate, 'yyyy-MM-dd')
          // 같은 날짜에 이미 실제 수업이 있는지 확인
          const hasRealClass = currentClasses.some(cls => 
            cls.date === dateStr && 
            cls.room_id === recurringClass.room_id &&
            cls.start_time === recurringClass.start_time &&
            !cls.is_recurring
          )
          
          if (!hasRealClass) {
            newVirtualClasses.push({
              ...recurringClass,
              id: `virtual_${recurringClass.id}_${dateStr}`,
              date: dateStr,
              isVirtual: true,
              baseRecurrenceId: recurringClass.id
            })
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
    })
    
    setCachedVirtualClasses(newVirtualClasses)
    console.log(`Generated ${newVirtualClasses.length} virtual classes`)
  }, [])

  // 특정 날짜의 수업 목록 가져오기 (먼저 정의해야 함)
  const getClassesByDate = useCallback((date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error('Invalid date provided:', date)
      return []
    }
    
    const dateStr = format(date, 'yyyy-MM-dd')
    
    // 일반 수업과 가상 수업 병합
    const regularClasses = classes.filter(cls => cls.date === dateStr)
    const virtualClassesForDate = cachedVirtualClasses.filter(cls => cls.date === dateStr)
    
    return [...regularClasses, ...virtualClassesForDate]
  }, [classes, cachedVirtualClasses])

  // 시간 충돌 확인 (getClassesByDate 사용하므로 이후에 정의)
  const checkTimeConflict = useCallback((date, startTime, endTime, roomId, excludeClassId = null) => {
    try {
      console.log('Checking conflict for:', { date, startTime, endTime, roomId, excludeClassId })
      
      // 해당 날짜의 모든 수업 가져오기 (일반 + 가상 클래스)
      const dateObj = new Date(date)
      const classesOnDate = getClassesByDate(dateObj)
      
      console.log('Classes on date:', classesOnDate)
      
      // 같은 방에서 시간이 겹치는 수업 찾기
      const conflictingClass = classesOnDate.find(cls => {
        // 다른 방이면 충돌 없음
        if (cls.room_id !== roomId) return false
        
        // 수정 중인 같은 수업이면 제외
        if (excludeClassId && cls.id === excludeClassId) return false
        
        // 시간 겹침 확인
        const isOverlapping = (startTime < cls.end_time) && (endTime > cls.start_time)
        
        if (isOverlapping) {
          console.log('Conflict found with class:', cls)
        }
        
        return isOverlapping
      })
      
      return !!conflictingClass
    } catch (error) {
      console.error('Error checking time conflict:', error)
      return false
    }
  }, [getClassesByDate])

  // 방 추가
  const addRoom = useCallback(async (roomData) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert([{
          ...roomData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      console.error('Error adding room:', error)
      throw error
    }
  }, [supabase])

  // 수업 추가 (checkTimeConflict 사용하므로 이후에 정의)
  const addClass = useCallback(async (classData) => {
    try {
      console.log('Adding class:', classData)
      
      // 시간 충돌 확인
      const isConflict = checkTimeConflict(
        classData.date,
        classData.start_time,
        classData.end_time,
        classData.room_id
      )
      
      if (isConflict) {
        throw new Error(`${classData.date} ${classData.start_time}-${classData.end_time} 시간에 이미 다른 수업이 예약되어 있습니다.`)
      }

      const { data, error } = await supabase
        .from('classes')
        .insert([{
          ...classData,
          created_by: user?.id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      
      console.log('Class added successfully:', data)
      return data.id
    } catch (error) {
      console.error('Error adding class:', error)
      throw error
    }
  }, [supabase, user, checkTimeConflict])

  // 방 정보 업데이트
  const updateRoom = useCallback(async (roomId, roomData) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          ...roomData,
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId)

      if (error) throw error
      
      // 성공적으로 업데이트되면 로컬 상태도 즉시 업데이트
      setRooms(prevRooms => 
        prevRooms.map(room => 
          room.id === roomId ? { ...room, ...roomData } : room
        )
      )
      
    } catch (error) {
      console.error('Error updating room:', error)
      throw error
    }
  }, [supabase])

  // 수업 정보 업데이트
  const updateClass = useCallback(async (classId, classData) => {
    try {
      // 실제 ID 추출 (가상 클래스의 경우)
      const realClassId = classId.startsWith('virtual_') 
        ? classId.split('_')[1] 
        : classId

      console.log('Updating class:', realClassId, classData)

      
      // 현재 수업 정보 가져오기
      const currentClass = classes.find(cls => cls.id === realClassId)
      
      if (!currentClass) {
        throw new Error('수업을 찾을 수 없습니다.')
      }

      // 시간, 날짜, 방이 실제로 변경되는지 확인
      const isDateChanged = classData.date && classData.date !== currentClass.date
      const isStartTimeChanged = classData.start_time && classData.start_time !== currentClass.start_time
      const isEndTimeChanged = classData.end_time && classData.end_time !== currentClass.end_time
      const isRoomChanged = classData.room_id && classData.room_id !== currentClass.room_id

      // 시간이나 방이 실제로 변경되는 경우에만 충돌 체크
      if (isDateChanged || isStartTimeChanged || isEndTimeChanged || isRoomChanged) {
        const checkDate = classData.date || currentClass.date
        const checkStartTime = classData.start_time || currentClass.start_time
        const checkEndTime = classData.end_time || currentClass.end_time
        const checkRoomId = classData.room_id || currentClass.room_id
        
        console.log('Checking conflict for update:', {
          checkDate,
          checkStartTime,
          checkEndTime,
          checkRoomId,
          excludeId: realClassId
        })
        
        const isConflict = checkTimeConflict(
          checkDate,
          checkStartTime,
          checkEndTime,
          checkRoomId,
          realClassId // 현재 수업은 제외
        )
        
        if (isConflict) {
          throw new Error(`${checkDate} ${checkStartTime}-${checkEndTime} 시간에 이미 다른 수업이 예약되어 있습니다.`)
        }
      } else {
        console.log('시간/방 변경이 없어서 충돌 체크를 건너뜁니다.')
      }

      const { error } = await supabase
        .from('classes')
        .update({
          ...classData,
          updated_at: new Date().toISOString()
        })
        .eq('id', realClassId)

      if (error) {
        console.error('Supabase update error:', error)
        throw error
      }

      // 성공적으로 업데이트되면 로컬 상태도 즉시 업데이트
      setClasses(prevClasses => 
        prevClasses.map(cls => 
          cls.id === realClassId ? { ...cls, ...classData, updated_at: new Date().toISOString() } : cls
        )
      )

      console.log('Class updated successfully')

    } catch (error) {
      console.error('Error updating class:', error)
      throw error
    }
  }, [supabase, classes, checkTimeConflict])

  // 수업 삭제
  const deleteClass = useCallback(async (classId) => {
    try {
      // 실제 ID 추출 (가상 클래스의 경우)
      const realClassId = classId.startsWith('virtual_') 
        ? classId.split('_')[1] 
        : classId

      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', realClassId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error deleting class:', error)
      throw error
    }
  }, [supabase])

  // 방 삭제
  const deleteRoom = useCallback(async (roomId) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error deleting room:', error)
      throw error
    }
  }, [supabase])

  const value = useMemo(() => ({
    rooms,
    classes,
    loading,
    addRoom,
    updateRoom,
    deleteRoom,
    addClass,
    updateClass,
    deleteClass,
    getClassesByDate,
    checkTimeConflict,
    fetchRooms,
    fetchClasses
  }), [
    rooms,
    classes,
    loading,
    addRoom,
    updateRoom,
    deleteRoom,
    addClass,
    updateClass,
    deleteClass,
    getClassesByDate,
    checkTimeConflict,
    fetchRooms,
    fetchClasses
  ])

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  )
}

export function useRoom() {
  const context = useContext(RoomContext)
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider')
  }
  return context
}