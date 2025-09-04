'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Edit3, Mail, Calendar, Package, Heart, ShoppingBag, Trophy, ArrowLeft, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import Header from '../components/Header'
import Avatar from '../components/Avatar'

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, updateUser, makeAuthenticatedRequest, logout } = useAuth()
  const { getTotalItems } = useCart()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: ''
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || ''
      })
    }
  }, [isAuthenticated, user, router])

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveProfile = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      alert('이름과 이메일을 모두 입력해주세요.')
      return
    }

    try {
      await updateUser({
        name: editForm.name.trim(),
        email: editForm.email.trim()
      })
      setIsEditing(false)
      alert('프로필이 업데이트되었습니다!')
    } catch (error) {
      console.error('프로필 업데이트 실패:', error)
      alert('프로필 업데이트에 실패했습니다.')
    }
  }

  const handleCancelEdit = () => {
    setEditForm({
      name: user?.name || '',
      email: user?.email || ''
    })
    setIsEditing(false)
  }

  const handleDeleteAccount = async () => {
    if (!confirm('정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    try {
      const res = await makeAuthenticatedRequest('/api/profile/delete-account', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '탈퇴 실패')
      alert('계정이 삭제되었습니다. 그동안 이용해주셔서 감사합니다.')
      await logout()
      router.push('/')
    } catch (e) {
      console.error('탈퇴 실패:', e)
      alert(e.message || '탈퇴 중 오류가 발생했습니다')
    }
  }

  // 역할 변경은 관리자 화면에서만 허용

  const calculateUserLevel = () => {
    const orders = user?.orders || []
    const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
    
    if (totalSpent >= 200000) return { level: 'VIP', color: 'text-purple-600', bg: 'bg-purple-100', next: null }
    if (totalSpent >= 100000) return { level: 'Gold', color: 'text-yellow-600', bg: 'bg-yellow-100', next: '200,000원까지 ' + (200000 - totalSpent).toLocaleString() + '원 남음' }
    if (totalSpent >= 50000) return { level: 'Silver', color: 'text-gray-600', bg: 'bg-gray-100', next: '100,000원까지 ' + (100000 - totalSpent).toLocaleString() + '원 남음' }
    return { level: 'Bronze', color: 'text-orange-600', bg: 'bg-orange-100', next: '50,000원까지 ' + (50000 - totalSpent).toLocaleString() + '원 남음' }
  }

  const getUserStats = () => {
    const orders = user?.orders || []
    const wishlist = user?.wishlist || []
    
    return {
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
      wishlistItems: wishlist.length,
      cartItems: getTotalItems(),
      joinDate: user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '정보 없음'
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">프로필을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const userLevel = calculateUserLevel()
  const stats = getUserStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pb-16">
        <div className="container mx-auto px-4">
          {/* 뒤로가기 */}
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>뒤로가기</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 왼쪽: 프로필 정보 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-24">
                {/* 프로필 헤더 */}
                <div className="text-center mb-8">
                  <div className="relative inline-block">
                    <Avatar name={user.name} size={96} className="mx-auto mb-4 border-4 border-indigo-100" />
                    <div className={`absolute -bottom-2 -right-2 ${userLevel.bg} ${userLevel.color} px-2 py-1 rounded-full text-xs font-bold`}>
                      {userLevel.level}
                    </div>
                  </div>
                  
                  {!isEditing ? (
                    <>
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">{user.name}</h2>
                      <p className="text-gray-600 mb-4">{user.email}</p>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center space-x-2 mx-auto text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <Edit3 size={16} />
                        <span>프로필 수정</span>
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          disabled
                        />
                        <p className="text-xs text-gray-500 mt-1">이메일은 변경할 수 없습니다.</p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveProfile}
                          className="flex-1 bg-indigo-500 text-white py-2 rounded-lg font-medium hover:bg-indigo-600 transition-colors"
                        >
                          저장
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 사용자 레벨 정보 */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Trophy className={userLevel.color} size={24} />
                    <div>
                      <h3 className="font-bold text-gray-800">{userLevel.level} 회원</h3>
                      {userLevel.next && (
                        <p className="text-sm text-gray-500">{userLevel.next}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar size={16} />
                      <span>가입일: {stats.joinDate}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ShoppingBag size={16} />
                      <span>총 구매금액: ₩{stats.totalSpent.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 대시보드 */}
            <div className="lg:col-span-2 space-y-8">
              {/* 통계 카드들 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                  <Package className="text-indigo-600 mb-3 mx-auto" size={32} />
                  <p className="text-3xl font-bold text-gray-800">{stats.totalOrders}</p>
                  <p className="text-sm text-gray-600">총 주문</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                  <Heart className="text-red-500 mb-3 mx-auto" size={32} />
                  <p className="text-3xl font-bold text-gray-800">{stats.wishlistItems}</p>
                  <p className="text-sm text-gray-600">위시리스트</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                  <ShoppingBag className="text-green-600 mb-3 mx-auto" size={32} />
                  <p className="text-3xl font-bold text-gray-800">{stats.cartItems}</p>
                  <p className="text-sm text-gray-600">장바구니</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                  <Trophy className={userLevel.color + " mb-3 mx-auto"} size={32} />
                  <p className="text-lg font-bold text-gray-800">{userLevel.level}</p>
                  <p className="text-sm text-gray-600">회원등급</p>
                </div>
              </div>

              {/* 빠른 액션 */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">빠른 액션</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => router.push('/orders')}
                    className="flex items-center space-x-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 text-left"
                  >
                    <div className="bg-indigo-100 p-3 rounded-lg">
                      <Package className="text-indigo-600" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">주문 내역</h4>
                      <p className="text-sm text-gray-600">구매한 상품들을 확인하세요</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => router.push('/wishlist')}
                    className="flex items-center space-x-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 text-left"
                  >
                    <div className="bg-red-100 p-3 rounded-lg">
                      <Heart className="text-red-500" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">위시리스트</h4>
                      <p className="text-sm text-gray-600">찜한 상품들을 확인하세요</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => router.push('/#products')}
                    className="flex items-center space-x-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 text-left"
                  >
                    <div className="bg-green-100 p-3 rounded-lg">
                      <ShoppingBag className="text-green-600" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">쇼핑하기</h4>
                      <p className="text-sm text-gray-600">새로운 교재를 둘러보세요</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => alert('고객센터 준비 중입니다!')}
                    className="flex items-center space-x-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 text-left"
                  >
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <Mail className="text-purple-600" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">고객센터</h4>
                      <p className="text-sm text-gray-600">문의사항이 있으시면 연락주세요</p>
                    </div>
                  </button>

                  {/* 역할 변경 버튼 제거 (관리자 화면으로 이동) */}

                  <button
                    onClick={handleDeleteAccount}
                    className="flex items-center space-x-4 p-4 border border-red-200 rounded-xl hover:bg-red-50 transition-all duration-300 text-left"
                  >
                    <div className="bg-red-100 p-3 rounded-lg">
                      <Trash2 className="text-red-600" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">회원 탈퇴</h4>
                      <p className="text-sm text-gray-600">계정과 데이터가 삭제됩니다</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 최근 주문 */}
              {stats.totalOrders > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">최근 주문</h3>
                    <button
                      onClick={() => router.push('/orders')}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      전체 보기
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {user.orders?.slice(0, 3).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-800">주문번호: #{order.id?.slice(0, 8) || 'N/A'}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-indigo-600">₩{(order.total_amount || 0).toLocaleString()}</p>
                          <p className="text-sm text-gray-600">{order.items?.length || 0}개 상품</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}