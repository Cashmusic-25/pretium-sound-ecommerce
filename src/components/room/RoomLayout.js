'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRoom } from '@/app/contexts/RoomContext'

const RoomLayout = ({ editMode = false, customActiveRoomIds = null }) => {
  const { rooms, classes, getClassesByDate, updateRoom } = useRoom()
  const [selectedRooms, setSelectedRooms] = useState([])
  const [activeRoomIds, setActiveRoomIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [editedRooms, setEditedRooms] = useState({})
  const [draggedRoom, setDraggedRoom] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [roomClassInfo, setRoomClassInfo] = useState({})
  
  // 데이터 가져오기 간격 설정 - 30초
  const FETCH_INTERVAL = 30000
  
  // 마지막 데이터 업데이트 시간 추적
  const lastUpdateRef = useRef(null)
  // 인터벌 ID 참조
  const intervalRef = useRef(null)
  
  const svgRef = useRef(null)
  
  // 현재 수업 중인 방 목록 가져오기
  const fetchActiveRooms = useCallback(() => {
    // 커스텀 activeRoomIds가 제공된 경우 그것을 사용
    if (customActiveRoomIds !== null) {
      setActiveRoomIds(customActiveRoomIds)
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      
      // 현재 시간
      const now = new Date()
      const nowHour = now.getHours()
      const nowMinutes = now.getMinutes()
      const currentTime = `${String(nowHour).padStart(2, '0')}:${String(nowMinutes).padStart(2, '0')}`
      
      // 오늘 클래스 가져오기 (일반 + 가상 클래스)
      const todayClasses = getClassesByDate(now)
      
      // 지금 사용 중인 방 찾기
      const activeClasses = todayClasses.filter(cls => {
        return cls.start_time <= currentTime && cls.end_time >= currentTime
      })
      
      // 사용 중인 방 ID 추출 (중복 제거)
      const roomIds = [...new Set(activeClasses.map(cls => cls.room_id))]
      console.log('Active room IDs:', roomIds)
      setActiveRoomIds(roomIds)
      
      // 마지막 업데이트 시간 기록
      lastUpdateRef.current = now
      
    } catch (error) {
      console.error('방 사용 상태를 가져오는 중 오류 발생:', error)
    } finally {
      setLoading(false)
    }
  }, [getClassesByDate, customActiveRoomIds])
  
  // 컴포넌트 마운트/언마운트 처리
  useEffect(() => {
    if (rooms.length > 0) {
      // 첫 로드 시 데이터 가져오기
      fetchActiveRooms()
      
      // 편집 모드가 아닐 때만 주기적으로 업데이트
      if (!editMode) {
        // 기존 인터벌 정리
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        
        // 새 인터벌 설정
        intervalRef.current = setInterval(fetchActiveRooms, FETCH_INTERVAL)
        
        // 컴포넌트 언마운트 시 인터벌 정리
        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      }
    }
  }, [rooms, editMode, fetchActiveRooms])
  
  // 방별 수업 정보 가져오기
  const updateRoomClassInfo = useCallback(() => {
    if (rooms.length === 0) return
    
    // 현재 시간 정보
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
      
    const classInfoByRoom = {}
    
    rooms.forEach(room => {
      // 해당 방의 오늘 수업 가져오기 (가상 수업 포함)
      const todayClasses = getClassesByDate(now).filter(cls => cls.room_id === room.id)
      
      // 현재 진행 중인 수업
      const currentClass = todayClasses.find(cls => 
        cls.start_time <= currentTimeStr && cls.end_time >= currentTimeStr
      )
      
      // 앞으로 진행될 수업들 (시간순 정렬)
      const upcomingClasses = todayClasses
        .filter(cls => {
          // 현재 수업은 제외하고 현재 시간 이후의 수업만
          if (cls === currentClass) return false
          return cls.start_time > currentTimeStr
        })
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .slice(0, 3) // 다음 3개 수업만
      
      classInfoByRoom[room.id] = {
        current: currentClass,
        upcoming: upcomingClasses
      }
    })
    
    setRoomClassInfo(classInfoByRoom)
  }, [rooms, getClassesByDate])
  
  // 수업 정보 주기적 업데이트
  useEffect(() => {
    if (rooms.length > 0 && !editMode) {
      // 초기 로드 시 수업 정보 업데이트
      updateRoomClassInfo()
      
      // 30초마다 수업 정보 업데이트
      const classInfoInterval = setInterval(updateRoomClassInfo, FETCH_INTERVAL)
      
      return () => clearInterval(classInfoInterval)
    }
  }, [rooms, editMode, updateRoomClassInfo])
  
  // 초기 편집된 방 상태 설정 - rooms 데이터가 변경될 때마다 업데이트
  useEffect(() => {
    if (rooms.length > 0) {
      const initialEditedRooms = {}
      rooms.forEach(room => {
        initialEditedRooms[room.id] = {
          x: room.x !== null && room.x !== undefined ? room.x : Math.floor(Math.random() * 600),
          y: room.y !== null && room.y !== undefined ? room.y : Math.floor(Math.random() * 400),
          width: room.width !== null && room.width !== undefined ? room.width : 100,
          height: room.height !== null && room.height !== undefined ? room.height : 80
        }
      })
      setEditedRooms(initialEditedRooms)
      console.log('방 위치 데이터 초기화:', initialEditedRooms)
    }
  }, [rooms]) // rooms가 변경될 때마다 실행
  
  // 방 정보 처리를 위한 유틸리티 함수들
  const getDayName = useCallback((dateStr) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const days = ['일', '월', '화', '수', '목', '금', '토']
      return days[date.getDay()]
    } catch (error) {
      console.error('날짜 파싱 오류:', error)
      return ''
    }
  }, [])
  
  // 현재 날짜 여부 확인
  const isToday = useCallback((dateStr) => {
    if (!dateStr) return false
    try {
      const today = new Date().toISOString().split('T')[0]
      return dateStr === today
    } catch (error) {
      return false
    }
  }, [])
  
  // 수업 시간 포맷팅
  const formatClassTime = useCallback((cls) => {
    if (!cls) return ''
    
    const dayPrefix = isToday(cls.date) ? "" : `(${getDayName(cls.date)})`
    
    // 시간만 표시 (시:분)
    const startTimeShort = cls.start_time.substring(0, 5)
    const endTimeShort = cls.end_time.substring(0, 5)
    
    return `${dayPrefix}${startTimeShort}~${endTimeShort}`
  }, [isToday, getDayName])
  
  // 방의 수업 정보 렌더링
  const renderClassInfo = useCallback((roomId) => {
    const info = roomClassInfo[roomId]
    if (!info) return null
    
    let tooltipContent = ""
    
    // 현재 진행 중인 수업 정보
    if (info.current) {
      tooltipContent += `현재: ${info.current.title}\n`
      tooltipContent += `${info.current.start_time} - ${info.current.end_time}\n\n`
    }
    
    // 예정된 수업 정보
    if (info.upcoming && info.upcoming.length > 0) {
      info.upcoming.forEach((cls, idx) => {
        const isToday = cls.date === new Date().toISOString().split('T')[0]
        const dayPrefix = isToday ? "오늘" : `${getDayName(cls.date)}요일`
        
        tooltipContent += `다음${idx+1}: ${cls.title}\n`
        tooltipContent += `${dayPrefix} ${cls.start_time} - ${cls.end_time}\n\n`
      })
    }
    
    return tooltipContent.trim() || "예정된 수업이 없습니다"
  }, [roomClassInfo, getDayName])
  
  const handleRoomClick = useCallback((room, e) => {
    if (!editMode) {
      // 보기 모드에서는 단일 방만 선택
      setSelectedRooms([room])
      return
    }
    
    e.stopPropagation()
    
    // 다중 선택 모드에서는 Ctrl/Cmd 키를 누르지 않아도 다중 선택 가능
    if (multiSelectMode) {
      // 이미 선택된 방이면 선택 해제
      if (selectedRooms.some(selectedRoom => selectedRoom.id === room.id)) {
        setSelectedRooms(selectedRooms.filter(selectedRoom => selectedRoom.id !== room.id))
      } else {
        // 그렇지 않으면 선택에 추가
        setSelectedRooms([...selectedRooms, room])
      }
      return
    }
    
    // Ctrl/Cmd 키를 누른 상태에서 클릭하면 다중 선택
    if (e.ctrlKey || e.metaKey) {
      // 이미 선택된 방이면 선택 해제
      if (selectedRooms.some(selectedRoom => selectedRoom.id === room.id)) {
        setSelectedRooms(selectedRooms.filter(selectedRoom => selectedRoom.id !== room.id))
      } else {
        // 그렇지 않으면 선택에 추가
        setSelectedRooms([...selectedRooms, room])
      }
    } else {
      // Ctrl/Cmd 키를 누르지 않았으면 이 방만 선택
      setSelectedRooms([room])
    }
  }, [editMode, multiSelectMode, selectedRooms])
  
  const handleMouseDown = useCallback((e, room) => {
    if (!editMode) return
    
    e.stopPropagation()
    
    // 이 방이 선택되어 있지 않다면 선택
    if (!selectedRooms.some(selectedRoom => selectedRoom.id === room.id)) {
      if (e.ctrlKey || e.metaKey || multiSelectMode) {
        setSelectedRooms([...selectedRooms, room])
      } else {
        setSelectedRooms([room])
      }
    }
    
    const svgRect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - svgRect.left
    const mouseY = e.clientY - svgRect.top
    
    const roomX = editedRooms[room.id].x
    const roomY = editedRooms[room.id].y
    
    setDraggedRoom(room)
    setDragOffset({
      x: mouseX - roomX,
      y: mouseY - roomY
    })
    setLastMousePos({ x: mouseX, y: mouseY })
  }, [editMode, selectedRooms, editedRooms, multiSelectMode])
  
  const handleMouseMove = useCallback((e) => {
    if (!editMode || !draggedRoom) return
    
    e.preventDefault()
    
    const svgRect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - svgRect.left
    const mouseY = e.clientY - svgRect.top
    
    // 마우스 이동 거리 계산
    const deltaX = mouseX - lastMousePos.x
    const deltaY = mouseY - lastMousePos.y
    
    // 선택된 모든 방을 함께 이동
    const updatedRooms = { ...editedRooms }
    
    selectedRooms.forEach(selectedRoom => {
      const currentRoom = updatedRooms[selectedRoom.id]
      
      // 새 위치 계산
      const newX = currentRoom.x + deltaX
      const newY = currentRoom.y + deltaY
      
      // 경계 체크
      const boundedX = Math.max(0, Math.min(newX, 800 - currentRoom.width))
      const boundedY = Math.max(0, Math.min(newY, 600 - currentRoom.height))
      
      // 위치 업데이트
      updatedRooms[selectedRoom.id] = {
        ...currentRoom,
        x: boundedX,
        y: boundedY
      }
    })
    
    setEditedRooms(updatedRooms)
    setLastMousePos({ x: mouseX, y: mouseY })
  }, [editMode, draggedRoom, lastMousePos, selectedRooms, editedRooms])
  
  const handleMouseUp = useCallback(() => {
    setDraggedRoom(null)
  }, [])
  
  const handleResizeRoom = useCallback((room, direction, amount) => {
    if (!editMode) return
    
    const updatedRooms = { ...editedRooms }
    
    // 선택된 방들만 크기 조절
    selectedRooms.forEach(selectedRoom => {
      const currentRoom = updatedRooms[selectedRoom.id]
      
      switch (direction) {
        case 'width':
          updatedRooms[selectedRoom.id] = {
            ...currentRoom,
            width: Math.max(50, currentRoom.width + amount)
          }
          break
        case 'height':
          updatedRooms[selectedRoom.id] = {
            ...currentRoom,
            height: Math.max(50, currentRoom.height + amount)
          }
          break
      }
    })
    
    setEditedRooms(updatedRooms)
  }, [editMode, selectedRooms, editedRooms])
  
  const saveRoomPositions = useCallback(async () => {
    try {
      // 각 방의 위치와 크기를 Supabase에 저장
      const updatePromises = Object.entries(editedRooms).map(([roomId, roomData]) => {
        return updateRoom(roomId, {
          x: roomData.x,
          y: roomData.y,
          width: roomData.width,
          height: roomData.height
        })
      })
      
      await Promise.all(updatePromises)
      
      // 저장 후 실제 rooms 데이터를 다시 불러와서 동기화
      // 이렇게 하면 다음에 페이지를 다시 방문할 때 올바른 위치가 표시됨
      console.log('방 위치 저장 완료 - 데이터 새로고침 중...')
      
      alert('모든 방의 위치와 크기가 저장되었습니다.')
    } catch (error) {
      console.error('방 위치 저장 중 오류 발생:', error)
      alert('방 위치 저장 중 오류가 발생했습니다.')
    }
  }, [editedRooms, updateRoom])
  
  // 모든 방 선택/선택 해제
  const handleSelectAll = useCallback(() => {
    if (selectedRooms.length === rooms.length) {
      // 모든 방이 선택된 상태면 모두 선택 해제
      setSelectedRooms([])
    } else {
      // 그렇지 않으면 모든 방 선택
      setSelectedRooms([...rooms])
    }
  }, [selectedRooms, rooms])
  
  // 로딩 상태 메모이제이션
  const isLoading = useMemo(() => loading && rooms.length === 0, [loading, rooms])
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">방 정보를 불러오는 중...</div>
      </div>
    )
  }
  
  return (
    <div className="room-layout-container">
      {/* 범례 */}
      <div className="flex flex-wrap items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-700">빈 방</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-700">사용 중</span>
          </div>
          {editMode && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 border-2 border-blue-700 rounded"></div>
              <span className="text-sm text-gray-700">선택됨</span>
            </div>
          )}
        </div>
        
        {editMode && (
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={multiSelectMode}
                onChange={(e) => setMultiSelectMode(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>다중 선택 모드</span>
            </label>
            <button 
              onClick={handleSelectAll}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              {selectedRooms.length === rooms.length ? '모두 선택 해제' : '모두 선택'}
            </button>
            <button 
              onClick={saveRoomPositions}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              변경사항 저장
            </button>
          </div>
        )}
      </div>
      
      {/* 방 배치도 */}
      <div className="room-layout-canvas bg-white border rounded-lg p-4">
        <svg 
          width="100%" 
          height="600"
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid meet"
          className="border border-gray-200 bg-gray-50"
          ref={svgRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {rooms.map((room) => {
            const isInUse = activeRoomIds.includes(room.id)
            const isSelected = selectedRooms.some(selectedRoom => selectedRoom.id === room.id)
            
            // 편집된 위치 또는 원래 위치 사용
            const roomData = editedRooms[room.id] || {
              x: room.x || Math.floor(Math.random() * 600),
              y: room.y || Math.floor(Math.random() * 300),
              width: room.width || 100,
              height: room.height || 80
            }
            
            // 수업 정보 툴팁 텍스트 생성
            const tooltipText = renderClassInfo(room.id)
            
            return (
              <g 
                key={room.id} 
                onClick={(e) => handleRoomClick(room, e)}
                onMouseDown={(e) => handleMouseDown(e, room)}
                style={{ cursor: editMode ? 'move' : 'pointer' }}
                title={!editMode ? tooltipText : undefined}
              >
                <rect
                  x={roomData.x}
                  y={roomData.y}
                  width={roomData.width}
                  height={roomData.height}
                  fill={isInUse ? '#EF4444' : '#10B981'}
                  stroke={isSelected ? '#3B82F6' : '#374151'}
                  strokeWidth={isSelected ? 3 : 2}
                  rx="5"
                  opacity={isSelected ? 0.9 : 0.7}
                />
                
                {/* 방 이름 */}
                <text
                  x={roomData.x + roomData.width / 2}
                  y={roomData.y + roomData.height / 2 - 10}
                  textAnchor="middle"
                  fill="white"
                  fontWeight="bold"
                  fontSize={Math.min(14, roomData.width * 0.12)}
                  dominantBaseline="middle"
                >
                  {room.name}
                </text>
                
                {/* 현재/다음 수업 정보 표시 */}
                {!editMode && roomClassInfo[room.id] && (
                  <g>
                    {/* 현재 진행 중인 수업 */}
                    {roomClassInfo[room.id].current && (
                      <text
                        x={roomData.x + roomData.width / 2}
                        y={roomData.y + roomData.height / 2 + 5}
                        textAnchor="middle"
                        fill="white"
                        fontSize={Math.min(10, roomData.width * 0.08)}
                        fontWeight="bold"
                      >
                        현재: {formatClassTime(roomClassInfo[room.id].current)}
                      </text>
                    )}
                    
                    {/* 다음 예정된 수업 */}
                    {roomClassInfo[room.id].upcoming && roomClassInfo[room.id].upcoming.length > 0 && (
                      <text
                        x={roomData.x + roomData.width / 2}
                        y={roomData.y + roomData.height / 2 + (roomClassInfo[room.id].current ? 18 : 5)}
                        textAnchor="middle"
                        fill="white"
                        fontSize={Math.min(9, roomData.width * 0.07)}
                      >
                        {roomClassInfo[room.id].current ? 
                          `다음: ${formatClassTime(roomClassInfo[room.id].upcoming[0])}` :
                          `다음: ${formatClassTime(roomClassInfo[room.id].upcoming[0])}`
                        }
                      </text>
                    )}
                  </g>
                )}
                
                {editMode && isSelected && (
                  <>
                    {/* 크기 조절 핸들 - 너비 */}
                    <g>
                      {/* 너비 증가 버튼 */}
                      <rect
                        x={roomData.x + roomData.width - 10}
                        y={roomData.y + roomData.height / 2 - 10}
                        width="20"
                        height="20"
                        fill="#3B82F6"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResizeRoom(room, 'width', 10)
                        }}
                        style={{ cursor: 'e-resize' }}
                      />
                      <text
                        x={roomData.x + roomData.width}
                        y={roomData.y + roomData.height / 2}
                        textAnchor="middle"
                        fill="white"
                        fontSize="12"
                        dominantBaseline="middle"
                      >
                        +
                      </text>
                      
                      {/* 너비 감소 버튼 */}
                      <rect
                        x={roomData.x + roomData.width - 30}
                        y={roomData.y + roomData.height / 2 - 10}
                        width="20"
                        height="20"
                        fill="#EF4444"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResizeRoom(room, 'width', -10)
                        }}
                        style={{ cursor: 'w-resize' }}
                      />
                      <text
                        x={roomData.x + roomData.width - 20}
                        y={roomData.y + roomData.height / 2}
                        textAnchor="middle"
                        fill="white"
                        fontSize="12"
                        dominantBaseline="middle"
                      >
                        -
                      </text>
                    </g>
                    
                    {/* 크기 조절 핸들 - 높이 */}
                    <g>
                      {/* 높이 증가 버튼 */}
                      <rect
                        x={roomData.x + roomData.width / 2 - 10}
                        y={roomData.y + roomData.height - 10}
                        width="20"
                        height="20"
                        fill="#3B82F6"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResizeRoom(room, 'height', 10)
                        }}
                        style={{ cursor: 's-resize' }}
                      />
                      <text
                        x={roomData.x + roomData.width / 2}
                        y={roomData.y + roomData.height}
                        textAnchor="middle"
                        fill="white"
                        fontSize="12"
                        dominantBaseline="middle"
                      >
                        +
                      </text>
                      
                      {/* 높이 감소 버튼 */}
                      <rect
                        x={roomData.x + roomData.width / 2 - 10}
                        y={roomData.y + roomData.height - 30}
                        width="20"
                        height="20"
                        fill="#EF4444"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResizeRoom(room, 'height', -10)
                        }}
                        style={{ cursor: 'n-resize' }}
                      />
                      <text
                        x={roomData.x + roomData.width / 2}
                        y={roomData.y + roomData.height - 20}
                        textAnchor="middle"
                        fill="white"
                        fontSize="12"
                        dominantBaseline="middle"
                      >
                        -
                      </text>
                    </g>
                  </>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      
      {/* 선택된 방 정보 표시 */}
      {selectedRooms.length === 1 && !editMode && (
        <div className="mt-6 p-4 bg-white border rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">{selectedRooms[0].name}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">상태:</span> 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                activeRoomIds.includes(selectedRooms[0].id) 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {activeRoomIds.includes(selectedRooms[0].id) ? '사용 중' : '사용 가능'}
              </span>
            </div>
            <div>
              <span className="font-medium">수용 인원:</span> 
              <span className="ml-2">{selectedRooms[0].capacity || '정보 없음'}명</span>
            </div>
          </div>
          
          {selectedRooms[0].description && (
            <div className="mt-2">
              <span className="font-medium">설명:</span> 
              <span className="ml-2">{selectedRooms[0].description}</span>
            </div>
          )}

          {/* 수업 일정 정보 표시 */}
          {roomClassInfo[selectedRooms[0].id] && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <h4 className="font-medium mb-2">수업 일정</h4>
              {roomClassInfo[selectedRooms[0].id].current && (
                <div className="mb-2 p-2 bg-red-50 border-l-3 border-red-400">
                  <p className="font-medium text-red-800">현재 수업: {roomClassInfo[selectedRooms[0].id].current.title}</p>
                  <p className="text-red-600 text-sm">
                    {roomClassInfo[selectedRooms[0].id].current.start_time} - {roomClassInfo[selectedRooms[0].id].current.end_time}
                  </p>
                  {roomClassInfo[selectedRooms[0].id].current.teacher && (
                    <p className="text-red-600 text-sm">강사: {roomClassInfo[selectedRooms[0].id].current.teacher}</p>
                  )}
                </div>
              )}
              
              {roomClassInfo[selectedRooms[0].id].upcoming && roomClassInfo[selectedRooms[0].id].upcoming.length > 0 ? (
                <div>
                  <p className="font-medium text-gray-700 mb-1">예정된 수업:</p>
                  <ul className="space-y-1">
                    {roomClassInfo[selectedRooms[0].id].upcoming.map((cls, idx) => (
                      <li key={idx} className="text-sm text-gray-600">
                        <span className="font-medium">{cls.title}</span> - {cls.start_time} ~ {cls.end_time}
                        {cls.teacher && <span className="text-gray-500"> (강사: {cls.teacher})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                !roomClassInfo[selectedRooms[0].id].current && (
                  <p className="text-gray-500 text-sm">예정된 수업이 없습니다.</p>
                )
              )}
            </div>
          )}
        </div>
      )}
      
      {selectedRooms.length > 1 && (
        <div className="mt-6 p-4 bg-white border rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">{selectedRooms.length}개의 방이 선택됨</h3>
          <div className="flex flex-wrap gap-2">
            {selectedRooms.map(room => (
              <span key={room.id} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                {room.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomLayout