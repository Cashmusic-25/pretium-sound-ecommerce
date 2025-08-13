'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter,
  UserCheck,
  UserX,
  ArrowLeft,
  Users,
  Crown,
  Calendar,
  Mail,
  ShoppingBag,
  Heart,
  Star,
  Eye,
  MoreVertical,
  X,
  Edit,
  Save,
  GraduationCap,
  BookOpen,
  User,
  Phone,
  MapPin,
  FileText,
  Shield,
  AlertTriangle,
  Trash2,
  Check
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/Header'
import Avatar from '../../components/Avatar'

export default function AdminUsersPage() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailEditModal, setShowDetailEditModal] = useState(false)
  const [editUserData, setEditUserData] = useState(null)
  const [editDetailData, setEditDetailData] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editRowId, setEditRowId] = useState(null)

  useEffect(() => {
    if (!isAdmin) {
      router.push('/')
      return
    }

    loadUsers()
  }, [isAdmin, router])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      
      const { getSupabase } = await import('@/lib/supabase')
      const supabase = getSupabase()
      
      if (!supabase) {
        console.error('Supabase 연결 실패')
        setUsers([])
        setFilteredUsers([])
        return
      }
  
      console.log('👥 사용자 데이터 로드 시작...')
  
      // user_profiles에서 모든 정보 한 번에 가져오기
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
  
      if (usersError) {
        console.error('사용자 프로필 로드 실패:', usersError)
        setUsers([])
        setFilteredUsers([])
        return
      }

      console.log('✅ 로드된 사용자 프로필:', usersData?.length || 0, '명')
      
      if (!usersData || usersData.length === 0) {
        console.log('ℹ️ 사용자 프로필이 없습니다.')
        setUsers([])
        setFilteredUsers([])
        return
      }
  
      // user_profiles의 컬럼만 사용
      const formattedUsers = usersData.map((user) => ({
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role || 'student',
        joinDate: user.created_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        phone: user.phone,
        parent_name: user.parent_name,
        parent_phone: user.parent_phone,
        parent_email: user.parent_email,
        agree_terms: user.agree_terms,
        agree_privacy: user.agree_privacy,
        signature: user.signature,
        subjects: user.subjects,
        specialization: user.specialization,
        experience_detail: user.experience_detail,
        bio: user.bio,
        status: user.status,
        // 기타 필요한 컬럼 추가
        orders: [],
        reviews: [],
        wishlist: []
      }))
  
      setUsers(formattedUsers)
      setFilteredUsers(formattedUsers)
      
    } catch (error) {
      console.error('사용자 로드 중 오류:', error)
      setUsers([])
      setFilteredUsers([])
    } finally {
      setIsLoading(false)
    }
  }



  // 사용자 권한 업데이트
  const updateUserRole = async (userId, newRole) => {
    try {
      setSaving(true)
      
      const { getSupabase } = await import('@/lib/supabase')
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        console.error('권한 업데이트 실패:', error)
        alert('권한 업데이트에 실패했습니다.')
        return false
      }

      // 로컬 상태 업데이트
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ))
      setFilteredUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ))

      console.log('✅ 사용자 권한 업데이트 성공:', userId, newRole)
      return true
    } catch (error) {
      console.error('권한 업데이트 중 오류:', error)
      alert('권한 업데이트 중 오류가 발생했습니다.')
      return false
    } finally {
      setSaving(false)
    }
  }

  // 사용자 삭제
  const deleteUser = async (userId, userName) => {
    try {
      setSaving(true)
      
      const { getSupabase } = await import('@/lib/supabase')
      const supabase = getSupabase()
      
      console.log('🗑️ 사용자 삭제 시작:', userId, userName)

      // 세션 토큰 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('인증 세션을 가져올 수 없습니다.')
      }

      // API 엔드포인트 호출
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '사용자 삭제에 실패했습니다.')
      }

      // 로컬 상태에서 사용자 제거
      setUsers(prev => prev.filter(user => user.id !== userId))
      setFilteredUsers(prev => prev.filter(user => user.id !== userId))

      console.log('✅ 사용자 삭제 완료:', userId, userName)
      console.log('📄 서버 응답:', result.message)
      
      return { success: true, message: result.message }
    } catch (error) {
      console.error('사용자 삭제 중 오류:', error)
      return { success: false, error: error.message }
    } finally {
      setSaving(false)
    }
  }
  const updateUserDetails = async (userId, detailData, type) => {
    try {
      setSaving(true)
      
      const { getSupabase } = await import('@/lib/supabase')
      const supabase = getSupabase()
      
      let error = null

      if (type === 'student' && detailData.studentInfo) {
        const { error: updateError } = await supabase
          .from('students')
          .update({
            grade: detailData.studentInfo.grade,
            phone: detailData.studentInfo.phone,
            parent_name: detailData.studentInfo.parent_name,
            parent_phone: detailData.studentInfo.parent_phone,
            parent_email: detailData.studentInfo.parent_email,
            emergency_contact: detailData.studentInfo.emergency_contact,
            zip_code: detailData.studentInfo.zip_code,
            address: detailData.studentInfo.address,
            detail_address: detailData.studentInfo.detail_address,
            birth_date: detailData.studentInfo.birth_date,
            notes: detailData.studentInfo.notes,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        
        error = updateError
      } else if (type === 'teacher' && detailData.teacherInfo) {
        const { error: updateError } = await supabase
          .from('teachers')
          .update({
            subjects: detailData.teacherInfo.subjects,
            phone: detailData.teacherInfo.phone,
            qualification: detailData.teacherInfo.qualification,
            experience_years: detailData.teacherInfo.experience_years,
            bio: detailData.teacherInfo.bio,
            status: detailData.teacherInfo.status,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        
        error = updateError
      }

      if (error) {
        console.error('상세 정보 업데이트 실패:', error)
        alert('상세 정보 업데이트에 실패했습니다.')
        return false
      }

      // 로컬 상태 업데이트
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...detailData } : user
      ))
      setFilteredUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...detailData } : user
      ))

      // 선택된 사용자 업데이트
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => ({ ...prev, ...detailData }))
      }

      console.log('✅ 상세 정보 업데이트 성공:', userId, type)
      return true
    } catch (error) {
      console.error('상세 정보 업데이트 중 오류:', error)
      alert('상세 정보 업데이트 중 오류가 발생했습니다.')
      return false
    } finally {
      setSaving(false)
    }
  }
  const updateTeacherStatus = async (userId, status) => {
    try {
      setSaving(true)
      
      const { getSupabase } = await import('@/lib/supabase')
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('teachers')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        console.error('강사 상태 업데이트 실패:', error)
        alert('강사 상태 업데이트에 실패했습니다.')
        return false
      }

      // 로컬 상태 업데이트
      setUsers(prev => prev.map(user => 
        user.id === userId && user.teacherInfo 
          ? { ...user, teacherInfo: { ...user.teacherInfo, status } } 
          : user
      ))
      setFilteredUsers(prev => prev.map(user => 
        user.id === userId && user.teacherInfo 
          ? { ...user, teacherInfo: { ...user.teacherInfo, status } } 
          : user
      ))

      console.log('✅ 강사 상태 업데이트 성공:', userId, status)
      return true
    } catch (error) {
      console.error('강사 상태 업데이트 중 오류:', error)
      alert('강사 상태 업데이트 중 오류가 발생했습니다.')
      return false
    } finally {
      setSaving(false)
    }
  }

  // 검색 및 필터링
  useEffect(() => {
    let filtered = users

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.studentInfo?.student_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.teacherInfo?.teacher_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 역할 필터링
    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole)
    }

    setFilteredUsers(filtered)
  }, [searchTerm, selectedRole, users])

  const getUserStats = () => {
    const stats = {
      total: users.length,
      admin: users.filter(u => u.role === 'admin').length,
      teacher: users.filter(u => u.role === 'teacher').length,
      student: users.filter(u => u.role === 'student').length,
      pendingTeachers: users.filter(u => u.role === 'teacher' && u.status === 'pending').length,
      newThisMonth: users.filter(user => {
        const joinDate = new Date(user.joinDate)
        const thisMonth = new Date()
        thisMonth.setDate(1)
        return joinDate >= thisMonth
      }).length
    }
    return stats
  }

  const getRoleDisplay = (user) => {
    switch (user.role) {
      case 'admin':
        return { text: '관리자', icon: Crown, color: 'purple' }
      case 'teacher':
        return { 
          text: user.teacherInfo?.status === 'approved' ? '승인된 강사' : 
                user.teacherInfo?.status === 'pending' ? '승인 대기 강사' : '강사',
          icon: BookOpen, 
          color: user.teacherInfo?.status === 'approved' ? 'green' : 
                 user.teacherInfo?.status === 'pending' ? 'yellow' : 'blue'
        }
      case 'student':
        return { text: '학생', icon: GraduationCap, color: 'blue' }
      default:
        return { text: '미지정', icon: User, color: 'gray' }
    }
  }

  const formatPhoneNumber = (phone) => {
    if (!phone) return '-'
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
  }

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

  if (!isAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">사용자 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const stats = getUserStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>대시보드로 돌아가기</span>
              </button>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-800">사용자 관리</h1>
              <p className="text-gray-600 mt-2">회원 정보를 조회하고 관리하세요</p>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="text-indigo-600" size={24} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-sm text-gray-600">전체</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Crown className="text-purple-600" size={24} />
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.admin}</p>
              <p className="text-sm text-gray-600">관리자</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="text-green-600" size={24} />
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.teacher}</p>
              <p className="text-sm text-gray-600">강사</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <GraduationCap className="text-blue-600" size={24} />
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.student}</p>
              <p className="text-sm text-gray-600">학생</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="text-yellow-600" size={24} />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingTeachers}</p>
              <p className="text-sm text-gray-600">승인 대기</p>
            </div>
          </div>

          {/* 검색 및 필터 */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              {/* 검색 */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="이름, 이메일, 학번, 강사번호로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              {/* 역할 필터 */}
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white min-w-[150px]"
              >
                <option value="all">전체 역할</option>
                <option value="admin">관리자</option>
                <option value="teacher">강사</option>
                <option value="student">학생</option>
              </select>
            </div>

            {/* 결과 개수 */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>총 {filteredUsers.length}명의 사용자</span>
              {(searchTerm || selectedRole !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedRole('all')
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  필터 초기화
                </button>
              )}

      {/* 사용자 삭제 확인 모달 */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              {/* 경고 아이콘 */}
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <AlertTriangle className="text-red-600" size={32} />
              </div>

              {/* 제목 */}
              <h3 className="text-lg font-bold text-gray-800 text-center mb-2">
                사용자 삭제 확인
              </h3>

              {/* 설명 */}
              <div className="text-center mb-6">
                <p className="text-gray-600 mb-3">
                  다음 사용자를 정말 삭제하시겠습니까?
                </p>
                
                {/* 사용자 정보 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <Avatar name={userToDelete.name} size={40} />
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{userToDelete.name}</p>
                      <p className="text-sm text-gray-600">{userToDelete.email}</p>
                      {(() => {
                        const roleDisplay = getRoleDisplay(userToDelete)
                        const IconComponent = roleDisplay.icon
                        return (
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full bg-${roleDisplay.color}-100 text-${roleDisplay.color}-800 mt-1`}>
                            <IconComponent size={12} />
                            <span>{roleDisplay.text}</span>
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                {/* 삭제될 데이터 안내 */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                  <h4 className="font-semibold text-red-800 mb-2 flex items-center space-x-1">
                    <Trash2 size={16} />
                    <span>삭제될 데이터</span>
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• 사용자 기본 정보</li>
                    <li>• Auth 사용자 계정 (로그인 불가)</li>
                    {userToDelete.role === 'student' && userToDelete.studentInfo && (
                      <>
                        <li>• 학생 정보 (학번, 보호자 정보, 주소 등)</li>
                        <li>• 서명 정보</li>
                      </>
                    )}
                    {userToDelete.role === 'teacher' && userToDelete.teacherInfo && (
                      <>
                        <li>• 강사 정보 (강사번호, 과목, 자격증 등)</li>
                        <li>• 승인 정보</li>
                      </>
                    )}
                    <li>• 관련된 모든 활동 기록</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ 이 작업은 되돌릴 수 없습니다!
                  </p>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setUserToDelete(null)
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={saving}
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    const result = await deleteUser(userToDelete.id, userToDelete.name)
                    if (result.success) {
                      setShowDeleteModal(false)
                      setUserToDelete(null)
                      alert(`${userToDelete.name} 사용자가 완전히 삭제되었습니다.\n\n${result.message}`)
                    } else {
                      alert(`삭제 실패: ${result.error}`)
                    }
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>{saving ? '삭제 중...' : '완전 삭제'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 상세 정보 편집 모달 */}
      {showDetailEditModal && editDetailData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">상세 정보 편집</h3>
                <button
                  onClick={() => setShowDetailEditModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 사용자 기본 정보 */}
              <div className="flex items-center space-x-4">
                <Avatar name={editDetailData.name} size={60} />
                <div>
                  <h4 className="text-lg font-semibold text-gray-800">{editDetailData.name}</h4>
                  <p className="text-gray-600">{editDetailData.email}</p>
                  {(() => {
                    const roleDisplay = getRoleDisplay(editDetailData)
                    const IconComponent = roleDisplay.icon
                    return (
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-sm font-semibold rounded-full bg-${roleDisplay.color}-100 text-${roleDisplay.color}-800 mt-1`}>
                        <IconComponent size={14} />
                        <span>{roleDisplay.text}</span>
                      </span>
                    )
                  })()}
                </div>
              </div>

              {/* 학생 정보 편집 */}
              {editDetailData.role === 'student' && editDetailData.studentInfo && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <h5 className="font-semibold text-blue-800 mb-4 flex items-center space-x-2">
                    <GraduationCap size={20} />
                    <span>학생 정보 편집</span>
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 학년 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
                      <select
                        value={editDetailData.studentInfo.grade || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          studentInfo: { ...editDetailData.studentInfo, grade: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">학년 선택</option>
                        <option value="초등학교 1학년">초등학교 1학년</option>
                        <option value="초등학교 2학년">초등학교 2학년</option>
                        <option value="초등학교 3학년">초등학교 3학년</option>
                        <option value="초등학교 4학년">초등학교 4학년</option>
                        <option value="초등학교 5학년">초등학교 5학년</option>
                        <option value="초등학교 6학년">초등학교 6학년</option>
                        <option value="중학교 1학년">중학교 1학년</option>
                        <option value="중학교 2학년">중학교 2학년</option>
                        <option value="중학교 3학년">중학교 3학년</option>
                        <option value="고등학교 1학년">고등학교 1학년</option>
                        <option value="고등학교 2학년">고등학교 2학년</option>
                        <option value="고등학교 3학년">고등학교 3학년</option>
                        <option value="대학생">대학생</option>
                        <option value="성인">성인</option>
                      </select>
                    </div>

                    {/* 전화번호 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                      <input
                        type="tel"
                        value={editDetailData.studentInfo.phone || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          studentInfo: { ...editDetailData.studentInfo, phone: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="010-0000-0000"
                      />
                    </div>

                    {/* 생년월일 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
                      <input
                        type="date"
                        value={editDetailData.studentInfo.birth_date || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          studentInfo: { ...editDetailData.studentInfo, birth_date: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    {/* 보호자 이름 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">보호자 이름</label>
                      <input
                        type="text"
                        value={editDetailData.studentInfo.parent_name || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          studentInfo: { ...editDetailData.studentInfo, parent_name: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="보호자 이름"
                      />
                    </div>

                    {/* 보호자 전화번호 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">보호자 전화번호</label>
                      <input
                        type="tel"
                        value={editDetailData.studentInfo.parent_phone || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          studentInfo: { ...editDetailData.studentInfo, parent_phone: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="010-0000-0000"
                      />
                    </div>

                    {/* 보호자 이메일 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">보호자 이메일</label>
                      <input
                        type="email"
                        value={editDetailData.studentInfo.parent_email || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          studentInfo: { ...editDetailData.studentInfo, parent_email: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="보호자 이메일"
                      />
                    </div>

                    {/* 비상 연락처 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">비상 연락처</label>
                      <input
                        type="tel"
                        value={editDetailData.studentInfo.emergency_contact || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          studentInfo: { ...editDetailData.studentInfo, emergency_contact: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="010-0000-0000"
                      />
                    </div>

                    {/* 우편번호 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">우편번호</label>
                      <input
                        type="text"
                        value={editDetailData.studentInfo.zip_code || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          studentInfo: { ...editDetailData.studentInfo, zip_code: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="우편번호"
                      />
                    </div>

                    {/* 주소 */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                      <input
                        type="text"
                        value={editDetailData.studentInfo.address || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          studentInfo: { ...editDetailData.studentInfo, address: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-2"
                        placeholder="기본 주소"
                      />
                      <input
                        type="text"
                        value={editDetailData.studentInfo.detail_address || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          studentInfo: { ...editDetailData.studentInfo, detail_address: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="상세 주소"
                      />
                    </div>

                    {/* 기타 사항 */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">기타 사항</label>
                      <textarea
                        value={editDetailData.studentInfo.notes || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          studentInfo: { ...editDetailData.studentInfo, notes: e.target.value }
                        })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                        placeholder="알레르기, 특이사항 등"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 강사 정보 편집 */}
              {editDetailData.role === 'teacher' && editDetailData.teacherInfo && (
                <div className="bg-green-50 rounded-lg p-6">
                  <h5 className="font-semibold text-green-800 mb-4 flex items-center space-x-2">
                    <BookOpen size={20} />
                    <span>강사 정보 편집</span>
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 전화번호 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                      <input
                        type="tel"
                        value={editDetailData.teacherInfo.phone || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          teacherInfo: { ...editDetailData.teacherInfo, phone: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        placeholder="010-0000-0000"
                      />
                    </div>

                    {/* 경력 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">경력 (년)</label>
                      <input
                        type="number"
                        value={editDetailData.teacherInfo.experience_years || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          teacherInfo: { ...editDetailData.teacherInfo, experience_years: parseInt(e.target.value) || null }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        placeholder="숫자만 입력"
                        min="0"
                        max="50"
                      />
                    </div>

                    {/* 담당 과목 */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">담당 과목</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {['피아노', '일렉기타', '통기타', '베이스기타', '보컬', '드럼', '바이올린', '음악이론', '작곡', '미디', '색소폰', '신디사이저'].map(subject => (
                          <label key={subject} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editDetailData.teacherInfo.subjects?.includes(subject) || false}
                              onChange={(e) => {
                                const currentSubjects = editDetailData.teacherInfo.subjects || []
                                let newSubjects
                                if (e.target.checked) {
                                  newSubjects = [...currentSubjects, subject]
                                } else {
                                  newSubjects = currentSubjects.filter(s => s !== subject)
                                }
                                setEditDetailData({
                                  ...editDetailData,
                                  teacherInfo: { ...editDetailData.teacherInfo, subjects: newSubjects }
                                })
                              }}
                              className="text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700">{subject}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 자격증/학력 */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">자격증/학력</label>
                      <textarea
                        value={editDetailData.teacherInfo.qualification || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          teacherInfo: { ...editDetailData.teacherInfo, qualification: e.target.value }
                        })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                        placeholder="보유 자격증, 학력사항, 수상경력 등"
                      />
                    </div>

                    {/* 자기소개 */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">자기소개</label>
                      <textarea
                        value={editDetailData.teacherInfo.bio || ''}
                        onChange={(e) => setEditDetailData({
                          ...editDetailData,
                          teacherInfo: { ...editDetailData.teacherInfo, bio: e.target.value }
                        })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                        placeholder="강사님의 음악적 배경, 교육 철학, 특별한 경험 등"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailEditModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    const type = editDetailData.role === 'student' ? 'student' : 'teacher'
                    const success = await updateUserDetails(editDetailData.id, editDetailData, type)
                    if (success) {
                      setShowDetailEditModal(false)
                      setShowDetailModal(true) // 상세 모달 다시 열기
                      alert('상세 정보가 성공적으로 업데이트되었습니다.')
                    }
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>{saving ? '저장 중...' : '저장'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
            </div>
          </div>

          {/* 사용자 목록 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">역할</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] whitespace-nowrap">연락처</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px] whitespace-nowrap">보호자이름</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] whitespace-nowrap">보호자이메일</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] whitespace-nowrap">과목</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] whitespace-nowrap">전문분야</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] whitespace-nowrap">경력사항</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] whitespace-nowrap">자기소개</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">승인상태</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가입일</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => {
                      const isEditing = editRowId === user.id
                      return (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                value={user.name || ''}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, name: newValue } : u));
                                  setFilteredUsers(prev => prev.map(u => u.id === user.id ? { ...u, name: newValue } : u));
                                  const { getSupabase } = await import('@/lib/supabase');
                                  const supabase = getSupabase();
                                  await supabase.from('user_profiles').update({ name: newValue, updated_at: new Date().toISOString() }).eq('user_id', user.id);
                                }}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-28 focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : user.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{user.email}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={user.role}
                                onChange={async (e) => {
                                  const newRole = e.target.value;
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
                                  setFilteredUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
                                  const { getSupabase } = await import('@/lib/supabase');
                                  const supabase = getSupabase();
                                  await supabase
                                    .from('user_profiles')
                                    .update({ role: newRole, updated_at: new Date().toISOString() })
                                    .eq('user_id', user.id);
                                }}
                                className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="student">학생</option>
                                <option value="teacher">강사</option>
                                <option value="admin">관리자</option>
                              </select>
                            ) : user.role}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                value={user.phone || ''}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, phone: newValue } : u));
                                  setFilteredUsers(prev => prev.map(u => u.id === user.id ? { ...u, phone: newValue } : u));
                                  const { getSupabase } = await import('@/lib/supabase');
                                  const supabase = getSupabase();
                                  await supabase.from('user_profiles').update({ phone: newValue, updated_at: new Date().toISOString() }).eq('user_id', user.id);
                                }}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-28 focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : user.phone || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                value={user.parent_name || ''}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, parent_name: newValue } : u));
                                  setFilteredUsers(prev => prev.map(u => u.id === user.id ? { ...u, parent_name: newValue } : u));
                                  const { getSupabase } = await import('@/lib/supabase');
                                  const supabase = getSupabase();
                                  await supabase.from('user_profiles').update({ parent_name: newValue, updated_at: new Date().toISOString() }).eq('user_id', user.id);
                                }}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-28 focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : user.parent_name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                value={user.parent_email || ''}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, parent_email: newValue } : u));
                                  setFilteredUsers(prev => prev.map(u => u.id === user.id ? { ...u, parent_email: newValue } : u));
                                  const { getSupabase } = await import('@/lib/supabase');
                                  const supabase = getSupabase();
                                  await supabase.from('user_profiles').update({ parent_email: newValue, updated_at: new Date().toISOString() }).eq('user_id', user.id);
                                }}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-36 focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : user.parent_email}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                value={user.subjects?.join(', ') || ''}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  const newSubjects = newValue.split(',').map(s => s.trim()).filter(Boolean);
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, subjects: newSubjects } : u));
                                  setFilteredUsers(prev => prev.map(u => u.id === user.id ? { ...u, subjects: newSubjects } : u));
                                  const { getSupabase } = await import('@/lib/supabase');
                                  const supabase = getSupabase();
                                  await supabase.from('user_profiles').update({ subjects: newSubjects, updated_at: new Date().toISOString() }).eq('user_id', user.id);
                                }}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-36 focus:ring-2 focus:ring-indigo-500"
                                placeholder="예: 피아노, 드럼"
                              />
                            ) : (
                              user.subjects?.map(subject => getSubjectName(subject)).join(', ') || '-'
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                value={user.specialization || ''}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, specialization: newValue } : u));
                                  setFilteredUsers(prev => prev.map(u => u.id === user.id ? { ...u, specialization: newValue } : u));
                                  const { getSupabase } = await import('@/lib/supabase');
                                  const supabase = getSupabase();
                                  await supabase.from('user_profiles').update({ specialization: newValue, updated_at: new Date().toISOString() }).eq('user_id', user.id);
                                }}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-28 focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : user.specialization}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <textarea
                                value={user.experience_detail || ''}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, experience_detail: newValue } : u));
                                  setFilteredUsers(prev => prev.map(u => u.id === user.id ? { ...u, experience_detail: newValue } : u));
                                  const { getSupabase } = await import('@/lib/supabase');
                                  const supabase = getSupabase();
                                  await supabase.from('user_profiles').update({ experience_detail: newValue, updated_at: new Date().toISOString() }).eq('user_id', user.id);
                                }}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-40 h-10 focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : user.experience_detail || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <textarea
                                value={user.bio || ''}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, bio: newValue } : u));
                                  setFilteredUsers(prev => prev.map(u => u.id === user.id ? { ...u, bio: newValue } : u));
                                  const { getSupabase } = await import('@/lib/supabase');
                                  const supabase = getSupabase();
                                  await supabase.from('user_profiles').update({ bio: newValue, updated_at: new Date().toISOString() }).eq('user_id', user.id);
                                }}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-40 h-10 focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : user.bio || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={user.status || 'pending'}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  // optimistic UI
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
                                  setFilteredUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
                                  // DB 업데이트
                                  const { getSupabase } = await import('@/lib/supabase');
                                  const supabase = getSupabase();
                                  await supabase
                                    .from('user_profiles')
                                    .update({ status: newStatus, updated_at: new Date().toISOString() })
                                    .eq('user_id', user.id);
                                }}
                                className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="pending">승인 대기</option>
                                <option value="approved">승인됨</option>
                                <option value="rejected">거부됨</option>
                              </select>
                            ) : (
                              user.status || '-'
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{user.joinDate ? new Date(user.joinDate).toLocaleDateString('ko-KR') : '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {isEditing ? (
                                <button onClick={() => setEditRowId(null)} className="text-green-600 hover:text-green-800 transition-colors p-2" title="저장"><Check size={16} /></button>
                              ) : (
                                <button onClick={() => setEditRowId(user.id)} className="text-gray-600 hover:text-indigo-600 transition-colors p-2" title="수정"><Edit size={16} /></button>
                              )}
                              <button onClick={() => { setUserToDelete(user); setShowDeleteModal(true); }} className="text-gray-600 hover:text-red-600 transition-colors p-2" title="사용자 삭제"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* 사용자가 없을 때 */
              <div className="text-center py-16">
                <Users size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {searchTerm || selectedRole !== 'all' ? '검색 결과가 없습니다' : '사용자가 없습니다'}
                </h3>
                <p className="text-gray-600">
                  {searchTerm || selectedRole !== 'all' 
                    ? '다른 검색어나 필터를 시도해보세요.' 
                    : '아직 등록된 사용자가 없습니다.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 권한 수정 모달 */}
      {showEditModal && editUserData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">권한 수정</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 사용자 정보 */}
              <div className="flex items-center space-x-4">
                <Avatar name={editUserData.name} size={50} />
                <div>
                  <h4 className="font-semibold text-gray-800">{editUserData.name}</h4>
                  <p className="text-sm text-gray-600">{editUserData.email}</p>
                </div>
              </div>

              {/* 현재 역할 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">현재 역할</p>
                <div className="p-3 bg-gray-50 rounded-lg">
                  {(() => {
                    const roleDisplay = getRoleDisplay(editUserData)
                    const IconComponent = roleDisplay.icon
                    return (
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-sm font-semibold rounded-full bg-${roleDisplay.color}-100 text-${roleDisplay.color}-800`}>
                        <IconComponent size={14} />
                        <span>{roleDisplay.text}</span>
                      </span>
                    )
                  })()}
                </div>
              </div>

              {/* 역할 변경 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">새 역할</p>
                <div className="space-y-2">
                  {[
                    { value: 'student', label: '학생', icon: GraduationCap, color: 'blue' },
                    { value: 'teacher', label: '강사', icon: BookOpen, color: 'green' },
                    { value: 'admin', label: '관리자', icon: Crown, color: 'purple' }
                  ].map((role) => {
                    const IconComponent = role.icon
                    return (
                      <label key={role.value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={editUserData.role === role.value}
                          onChange={(e) => setEditUserData({...editUserData, role: e.target.value})}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 text-sm font-semibold rounded-full bg-${role.color}-100 text-${role.color}-800`}>
                          <IconComponent size={14} />
                          <span>{role.label}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* 강사 승인 상태 (강사인 경우만) */}
              {editUserData.role === 'teacher' && editUserData.teacherInfo && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">강사 승인 상태</p>
                  <div className="space-y-2">
                    {[
                      { value: 'pending', label: '승인 대기', color: 'yellow' },
                      { value: 'approved', label: '승인됨', color: 'green' },
                      { value: 'rejected', label: '거부됨', color: 'red' }
                    ].map((status) => (
                      <label key={status.value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="teacherStatus"
                          value={status.value}
                          checked={editUserData.teacherInfo?.status === status.value}
                          onChange={(e) => setEditUserData({
                            ...editUserData, 
                            teacherInfo: {...editUserData.teacherInfo, status: e.target.value}
                          })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full bg-${status.color}-100 text-${status.color}-800`}>
                          {status.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 경고 메시지 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="text-yellow-600 mt-0.5" size={16} />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">주의사항</p>
                    <p>사용자 권한을 변경하면 해당 사용자의 접근 권한이 즉시 변경됩니다.</p>
                  </div>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    const success = await updateUserRole(editUserData.id, editUserData.role)
                    if (success && editUserData.role === 'teacher' && editUserData.teacherInfo) {
                      await updateTeacherStatus(editUserData.id, editUserData.teacherInfo.status)
                    }
                    if (success) {
                      setShowEditModal(false)
                      alert('권한이 성공적으로 업데이트되었습니다.')
                    }
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>{saving ? '저장 중...' : '저장'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}