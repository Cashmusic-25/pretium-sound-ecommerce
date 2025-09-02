'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRoom } from '@/app/contexts/RoomContext'
import { useAuth } from '@/app/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Save, X, Calendar, Clock, Users, Repeat } from 'lucide-react'
import { format, addDays, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function AdminClassesPage() {
  const { rooms, classes, loading, addClass, updateClass, deleteClass } = useRoom()
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filterRoom, setFilterRoom] = useState('')
  
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

  // 수정 폼 데이터
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    room_id: '',
    date: '',
    start_time: '',
    end_time: '',
    teacher: '',
    max_students: 20,
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
    if (!loading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [user, isAdmin, loading, router])

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
    
    try {
      console.log('Adding class with data:', newClass) // 디버깅용
      
      const classData = {
        title: newClass.title,
        description: newClass.description,
        room_id: newClass.room_id,
        date: newClass.date,
        start_time: newClass.start_time,
        end_time: newClass.end_time,
        teacher: newClass.teacher,
        max_students: newClass.max_students,
        students: newClass.students.filter(student => student.trim() !== ''),
        is_recurring: newClass.is_recurring,
        recurrence_pattern: newClass.recurrence_pattern,
        recurrence_type: newClass.recurrence_type,
        recurrence_end_date: newClass.recurrence_end_date
      }
      
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
      setShowAddForm(false)
      
      alert('수업이 성공적으로 추가되었습니다!')
    } catch (error) {
      console.error('Add class error:', error)
      // 더 구체적인 에러 메시지 표시
      const errorMessage = error.message.includes('이미 다른 수업이 예약')
        ? `⚠️ 시간 충돌!\n\n${error.message}\n\n다른 시간을 선택해주세요.`
        : `수업 추가 실패: ${error.message}`
      
      alert(errorMessage)
    }
  }

  // 수업 수정 모달 열기
  const openEditModal = (cls) => {
    setEditingClass(cls)
    setEditFormData({
      title: cls.title,
      description: cls.description || '',
      room_id: cls.room_id,
      date: cls.date,
      start_time: cls.start_time,
      end_time: cls.end_time,
      teacher: cls.teacher || '',
      max_students: cls.max_students || 20,
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
    
    try {
      console.log('Updating class with data:', editFormData) // 디버깅용
      
      const updateData = {
        title: editFormData.title,
        description: editFormData.description,
        room_id: editFormData.room_id,
        date: editFormData.date,
        start_time: editFormData.start_time,
        end_time: editFormData.end_time,
        teacher: editFormData.teacher,
        max_students: editFormData.max_students,
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
      // 더 구체적인 에러 메시지 표시
      const errorMessage = error.message.includes('이미 다른 수업이 예약')
        ? `⚠️ 시간 충돌!\n\n${error.message}\n\n다른 시간을 선택해주세요.`
        : `수업 수정 실패: ${error.message}`
      
      alert(errorMessage)
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

  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">수업 관리</h1>
            <p className="text-gray-600 mt-2">수업을 추가, 수정, 삭제하고 반복 일정을 관리할 수 있습니다.</p>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>수업 추가</span>
          </button>
        </div>

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
                        {cls.max_students && ` / ${cls.max_students}명`}
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
                    <input
                      type="text"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="학생 이름 입력"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStudent())}
                    />
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
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {student}
                          <button
                            type="button"
                            onClick={() => removeStudent(index)}
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
                    <select
                      required
                      value={editFormData.room_id}
                      onChange={(e) => setEditFormData({...editFormData, room_id: e.target.value})}
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
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
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
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      강사
                    </label>
                    <input
                      type="text"
                      value={editFormData.teacher}
                      onChange={(e) => setEditFormData({...editFormData, teacher: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      최대 학생 수
                    </label>
                    <input
                      type="number"
                      value={editFormData.max_students}
                      onChange={(e) => setEditFormData({...editFormData, max_students: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                </div>

                {/* 학생 관리 (수정) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    참가 학생
                  </label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={editNewStudentName}
                      onChange={(e) => setEditNewStudentName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="학생 이름 입력"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStudentToEdit())}
                    />
                    <button
                      type="button"
                      onClick={addStudentToEdit}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      추가
                    </button>
                  </div>
                  
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

                {/* 반복 설정 (수정) */}
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <input
                      type="checkbox"
                      id="edit_is_recurring"
                      checked={editFormData.is_recurring}
                      onChange={(e) => setEditFormData({...editFormData, is_recurring: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="edit_is_recurring" className="text-sm font-medium text-gray-700">
                      반복 수업으로 설정
                    </label>
                  </div>
                  
                  {editFormData.is_recurring && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          반복 패턴
                        </label>
                        <select
                          value={editFormData.recurrence_pattern}
                          onChange={(e) => setEditFormData({...editFormData, recurrence_pattern: e.target.value})}
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
                          value={editFormData.recurrence_type}
                          onChange={(e) => setEditFormData({...editFormData, recurrence_type: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="finite">기간 제한</option>
                          <option value="infinite">무제한</option>
                        </select>
                      </div>
                      
                      {editFormData.recurrence_type === 'finite' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            종료 날짜
                          </label>
                          <input
                            type="date"
                            value={editFormData.recurrence_end_date}
                            onChange={(e) => setEditFormData({...editFormData, recurrence_end_date: e.target.value})}
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