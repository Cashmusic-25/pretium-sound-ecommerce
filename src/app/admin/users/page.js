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
  Trash2,
  ShieldAlert
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/Header'
import Avatar from '../../components/Avatar'

export default function AdminUsersPage() {
  const router = useRouter()
  const { isAdmin, makeAuthenticatedRequest } = useAuth()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

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
      
      // Supabase에서 직접 사용자 데이터 가져오기
      const { getSupabase } = await import('@/lib/supabase')
      const supabase = getSupabase()
      
      if (!supabase) {
        console.error('Supabase 연결 실패')
        setUsers([])
        setFilteredUsers([])
        return
      }
  
      console.log('👥 사용자 데이터 로드 시작...')
  
      // users 테이블에서 모든 사용자 가져오기
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
  
      if (error) {
        console.error('사용자 데이터 로드 실패:', error)
        setUsers([])
        setFilteredUsers([])
        return
      }
  
      console.log('✅ 로드된 사용자 데이터:', usersData.length, '명')
      console.log('📋 사용자 목록:', usersData)
  
      // 데이터 형식 변환 (기존 코드와 호환되도록)
      const formattedUsers = usersData.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        joinDate: user.created_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        wishlist: user.wishlist || [],
        // 임시 데이터 (나중에 실제 orders, reviews 테이블과 연결)
        orders: [],
        reviews: []
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

  const handleChangeRole = async (userId, currentRole) => {
    try {
      const nextRole = currentRole === 'admin' ? 'user' : 'admin'
      if (!confirm(`이 사용자의 역할을 '${nextRole}'(으)로 변경할까요?`)) return
      setActionLoading(true)
      const res = await makeAuthenticatedRequest('/api/admin/users/change-role', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: userId, role: nextRole })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '역할 변경 실패')
      await loadUsers()
      alert('역할이 변경되었습니다.')
    } catch (e) {
      console.error(e)
      alert(e.message || '오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    try {
      if (!confirm('정말로 이 사용자를 삭제하시겠습니까? 되돌릴 수 없습니다.')) return
      setActionLoading(true)
      const res = await makeAuthenticatedRequest('/api/admin/users/delete', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: userId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '사용자 삭제 실패')
      await loadUsers()
      alert('사용자가 삭제되었습니다.')
    } catch (e) {
      console.error(e)
      alert(e.message || '오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  // 검색 및 필터링
  useEffect(() => {
    let filtered = users

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
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
      user: users.filter(u => u.role === 'user').length,
      newThisMonth: users.filter(user => {
        const joinDate = new Date(user.joinDate)
        const thisMonth = new Date()
        thisMonth.setDate(1)
        return joinDate >= thisMonth
      }).length
    }
    return stats
  }

  const calculateUserMetrics = (user) => {
    const orders = user.orders || []
    const reviews = user.reviews || []
    const wishlist = user.wishlist || []
    
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    const totalOrders = orders.length
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0

    return {
      totalSpent,
      totalOrders,
      averageOrderValue,
      totalReviews: reviews.length,
      wishlistItems: wishlist.length
    }
  }

  const getUserLevel = (totalSpent) => {
    if (totalSpent >= 200000) return { level: 'VIP', color: 'text-purple-600', bg: 'bg-purple-100' }
    if (totalSpent >= 100000) return { level: 'Gold', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (totalSpent >= 50000) return { level: 'Silver', color: 'text-gray-600', bg: 'bg-gray-100' }
    return { level: 'Bronze', color: 'text-orange-600', bg: 'bg-orange-100' }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="text-indigo-600" size={24} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-sm text-gray-600">전체 사용자</p>
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
                <UserCheck className="text-green-600" size={24} />
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.user}</p>
              <p className="text-sm text-gray-600">일반 사용자</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="text-blue-600" size={24} />
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.newThisMonth}</p>
              <p className="text-sm text-gray-600">이번 달 신규</p>
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
                  placeholder="이름이나 이메일로 검색..."
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
                <option value="user">일반 사용자</option>
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
            </div>
          </div>

          {/* 사용자 목록 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        사용자
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        역할
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        가입일
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        활동
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        구매 금액
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => {
                      const metrics = calculateUserMetrics(user)
                      const userLevel = getUserLevel(metrics.totalSpent)
                      
                      return (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-4">
                              <div className="relative">
                                <Avatar name={user.name} size={40} />
                                {user.role === 'admin' && (
                                  <Crown size={12} className="absolute -top-1 -right-1 text-purple-600" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                                  <span>{user.name}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${userLevel.bg} ${userLevel.color}`}>
                                    {userLevel.level}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.role === 'admin' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                <Crown size={12} />
                                <span>관리자</span>
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                사용자
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(user.joinDate).toLocaleDateString('ko-KR')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <ShoppingBag size={14} />
                                <span>{metrics.totalOrders}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Star size={14} />
                                <span>{metrics.totalReviews}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Heart size={14} />
                                <span>{metrics.wishlistItems}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatPrice(metrics.totalSpent)}
                            </div>
                            {metrics.totalOrders > 0 && (
                              <div className="text-sm text-gray-500">
                                평균: {formatPrice(metrics.averageOrderValue)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedUser(user)
                                  setShowDetailModal(true)
                                }}
                                className="text-gray-600 hover:text-indigo-600 transition-colors p-2"
                                title="상세 보기"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleChangeRole(user.id, user.role)}
                                disabled={actionLoading}
                                className="text-purple-600 hover:text-purple-800 transition-colors p-2 disabled:opacity-50"
                                title="역할 변경"
                              >
                                <ShieldAlert size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={actionLoading}
                                className="text-red-600 hover:text-red-800 transition-colors p-2 disabled:opacity-50"
                                title="사용자 삭제"
                              >
                                <Trash2 size={16} />
                              </button>
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

      {/* 사용자 상세 모달 */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">사용자 상세 정보</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {(() => {
                const metrics = calculateUserMetrics(selectedUser)
                const userLevel = getUserLevel(metrics.totalSpent)
                
                return (
                  <>
                    {/* 사용자 기본 정보 */}
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Avatar name={selectedUser.name} size={80} />
                        {selectedUser.role === 'admin' && (
                          <Crown size={20} className="absolute -top-2 -right-2 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-xl font-bold text-gray-800">{selectedUser.name}</h4>
                          <span className={`text-sm px-3 py-1 rounded-full ${userLevel.bg} ${userLevel.color}`}>
                            {userLevel.level}
                          </span>
                        </div>
                        <p className="text-gray-600">{selectedUser.email}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          {selectedUser.role === 'admin' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              <Crown size={12} />
                              <span>관리자</span>
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              일반 사용자
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            가입일: {new Date(selectedUser.joinDate).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 활동 통계 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <ShoppingBag className="text-blue-600 mb-2 mx-auto" size={24} />
                        <p className="text-2xl font-bold text-blue-600">{metrics.totalOrders}</p>
                        <p className="text-sm text-gray-600">총 주문</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <Star className="text-green-600 mb-2 mx-auto" size={24} />
                        <p className="text-2xl font-bold text-green-600">{metrics.totalReviews}</p>
                        <p className="text-sm text-gray-600">작성 리뷰</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 text-center">
                        <Heart className="text-red-600 mb-2 mx-auto" size={24} />
                        <p className="text-2xl font-bold text-red-600">{metrics.wishlistItems}</p>
                        <p className="text-sm text-gray-600">위시리스트</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <Crown className="text-purple-600 mb-2 mx-auto" size={24} />
                        <p className="text-lg font-bold text-purple-600">{userLevel.level}</p>
                        <p className="text-sm text-gray-600">등급</p>
                      </div>
                    </div>

                    {/* 구매 정보 */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-semibold text-gray-800 mb-3">구매 정보</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">총 구매 금액</p>
                          <p className="text-xl font-bold text-indigo-600">{formatPrice(metrics.totalSpent)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">평균 주문 금액</p>
                          <p className="text-xl font-bold text-gray-800">{formatPrice(metrics.averageOrderValue)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">주문 빈도</p>
                          <p className="text-xl font-bold text-gray-800">
                            {metrics.totalOrders > 0 ? `${metrics.totalOrders}회` : '없음'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 최근 주문 */}
                    {selectedUser.orders && selectedUser.orders.length > 0 && (
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-3">최근 주문 (최대 3개)</h5>
                        <div className="space-y-3">
                          {selectedUser.orders.slice(0, 3).map((order) => (
                            <div key={order.id} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-800">
                                  주문번호: {order.orderNumber}
                                </span>
                                <span className="font-bold text-indigo-600">
                                  {formatPrice(order.totalAmount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>{order.items?.length || 0}개 상품</span>
                                <span>{new Date(order.createdAt).toLocaleDateString('ko-KR')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 최근 리뷰 */}
                    {selectedUser.reviews && selectedUser.reviews.length > 0 && (
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-3">최근 리뷰 (최대 3개)</h5>
                        <div className="space-y-3">
                          {selectedUser.reviews.slice(0, 3).map((review) => (
                            <div key={review.id} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      size={14}
                                      className={`${
                                        i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                                </span>
                              </div>
                              {review.title && (
                                <p className="font-medium text-gray-800 text-sm mb-1">{review.title}</p>
                              )}
                              <p className="text-sm text-gray-600 line-clamp-2">{review.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}