'use client'

import { useState, useEffect } from 'react'
import { useRoom } from '@/app/contexts/RoomContext'
import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Save, X, Move, RotateCw } from 'lucide-react'
import RoomLayout from '@/components/room/RoomLayout'

export default function AdminRoomsPage() {
  const { rooms, loading, addRoom, updateRoom, deleteRoom } = useRoom()
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [layoutEditMode, setLayoutEditMode] = useState(false)
  
  // 새 방 폼 데이터
  const [newRoom, setNewRoom] = useState({
    name: '',
    capacity: '',
    description: ''
  })

  // 수정 폼 데이터
  const [editFormData, setEditFormData] = useState({
    name: '',
    capacity: '',
    description: ''
  })

  // 관리자 권한 확인
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [user, isAdmin, loading, router])

  // 방 추가 핸들러
  const handleAddRoom = async (e) => {
    e.preventDefault()
    
    try {
      // 랜덤한 위치에 방 생성 (나중에 드래그로 조정 가능)
      const randomX = Math.floor(Math.random() * 500) + 50
      const randomY = Math.floor(Math.random() * 250) + 50
      
      await addRoom({
        name: newRoom.name,
        capacity: parseInt(newRoom.capacity) || null,
        description: newRoom.description,
        x: randomX,
        y: randomY,
        width: 100,
        height: 80
      })
      
      // 폼 초기화
      setNewRoom({
        name: '',
        capacity: '',
        description: ''
      })
      setShowAddForm(false)
      
      alert('방이 성공적으로 추가되었습니다! 배치도에서 위치와 크기를 조정해보세요.')
    } catch (error) {
      alert('방 추가 실패: ' + error.message)
    }
  }

  // 방 수정 모달 열기
  const openEditModal = (room) => {
    setEditingRoom(room)
    setEditFormData({
      name: room.name,
      capacity: room.capacity || '',
      description: room.description || ''
    })
  }

  // 방 수정 핸들러
  const handleUpdateRoom = async (e) => {
    e.preventDefault()
    
    try {
      await updateRoom(editingRoom.id, {
        name: editFormData.name,
        capacity: parseInt(editFormData.capacity) || null,
        description: editFormData.description
      })
      setEditingRoom(null)
      alert('방 정보가 수정되었습니다!')
    } catch (error) {
      alert('방 수정 실패: ' + error.message)
    }
  }

  // 방 삭제 핸들러
  const handleDeleteRoom = async (roomId) => {
    try {
      await deleteRoom(roomId)
      setDeleteConfirm(null)
      alert('방이 삭제되었습니다!')
    } catch (error) {
      alert('방 삭제 실패: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">로딩 중...</div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">방 관리</h1>
            <p className="text-gray-600 mt-2">강의실을 추가, 수정, 삭제하고 배치도를 편집할 수 있습니다.</p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setLayoutEditMode(!layoutEditMode)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                layoutEditMode 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {layoutEditMode ? <Save size={20} /> : <Move size={20} />}
              <span>{layoutEditMode ? '편집 완료' : '배치도 편집'}</span>
            </button>
            
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>방 추가</span>
            </button>
          </div>
        </div>

        {/* 편집 모드 안내 */}
        {layoutEditMode && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-800">
              <RotateCw size={20} />
              <div>
                <h3 className="font-semibold">배치도 편집 모드</h3>
                <p className="text-sm">
                  • 방을 드래그해서 위치를 이동할 수 있습니다<br/>
                  • 방을 선택한 후 크기 조절 버튼(+/-)으로 크기를 변경할 수 있습니다<br/>
                  • 여러 방을 선택하려면 Ctrl/Cmd 키를 누르거나 다중선택모드를 활성화하세요<br/>
                  • 완료되면 "편집 완료" 버튼을 클릭하여 변경사항을 저장하세요
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">총 방 수</h3>
            <p className="text-3xl font-bold text-blue-600">{rooms.length}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">총 수용 인원</h3>
            <p className="text-3xl font-bold text-green-600">
              {rooms.reduce((total, room) => total + (room.capacity || 0), 0)}명
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">평균 수용 인원</h3>
            <p className="text-3xl font-bold text-purple-600">
              {rooms.length > 0 
                ? Math.round(rooms.reduce((total, room) => total + (room.capacity || 0), 0) / rooms.length)
                : 0}명
            </p>
          </div>
        </div>

        {/* 방 배치도 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">방 배치도</h2>
            <p className="text-sm text-gray-600 mt-1">
              {layoutEditMode ? '편집 모드: 방을 드래그하여 배치를 변경하세요' : '현재 방 배치 상황'}
            </p>
          </div>
          <div className="p-6">
            <RoomLayout editMode={layoutEditMode} />
          </div>
        </div>

        {/* 방 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">방 목록</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    방 이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수용 인원
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    위치 (X, Y)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    크기 (W × H)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    설명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{room.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{room.capacity || '-'}명</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">({room.x || 0}, {room.y || 0})</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{room.width || 100} × {room.height || 80}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {room.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(room)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="수정"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(room)}
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
          </div>
        </div>

        {/* 방 추가 모달 */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">새 방 추가</h3>
              
              <form onSubmit={handleAddRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    방 이름 *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 강의실 F"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    수용 인원
                  </label>
                  <input
                    type="number"
                    value={newRoom.capacity}
                    onChange={(e) => setNewRoom({...newRoom, capacity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 30"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={newRoom.description}
                    onChange={(e) => setNewRoom({...newRoom, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="방에 대한 설명을 입력하세요"
                  />
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">
                    💡 <strong>팁:</strong> 방을 추가한 후 배치도 편집 모드에서 위치와 크기를 자유롭게 조정할 수 있습니다.
                  </p>
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

        {/* 방 수정 모달 */}
        {editingRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">방 정보 수정</h3>
              
              <form onSubmit={handleUpdateRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    방 이름 *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    수용 인원
                  </label>
                  <input
                    type="number"
                    value={editFormData.capacity}
                    onChange={(e) => setEditFormData({...editFormData, capacity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-700">
                    📍 방의 위치와 크기는 배치도 편집 모드에서 변경할 수 있습니다.
                  </p>
                </div>
                
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
                    onClick={() => setEditingRoom(null)}
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

        {/* 삭제 확인 모달 */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4 text-red-600">방 삭제 확인</h3>
              <p className="text-gray-700 mb-6">
                <strong>{deleteConfirm.name}</strong>을(를) 정말 삭제하시겠습니까?
                <br />
                <span className="text-sm text-red-500">이 작업은 되돌릴 수 없습니다.</span>
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handleDeleteRoom(deleteConfirm.id)}
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