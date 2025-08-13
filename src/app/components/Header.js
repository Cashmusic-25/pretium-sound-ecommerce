// src/components/Header.js - 자료실 메뉴 추가 버전
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X, ShoppingCart, User, LogOut, Heart, Package, Settings, BarChart3, Calendar, MapPin, FolderOpen, Users, Clock, BookOpen } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import CartSidebar from './CartSidebar'
import AuthModal from './AuthModal'
import Avatar from './Avatar'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('login')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  
  const { getTotalItems } = useCart()
  const { user, userProfile, isAuthenticated, isAdmin, isTeacher, isStudent, logout } = useAuth()
  const router = useRouter()

    // 프로필 생성 함수 - AuthContext를 통해 안전하게 처리
  const createProfile = async () => {
    try {
      if (!user) {
        alert('로그인이 필요합니다.')
        return
      }

      // AuthContext의 기존 signup 로직을 활용하여 프로필 생성
      const confirmed = confirm('학생 프로필을 생성하시겠습니까? 이 작업은 되돌릴 수 없습니다.')
      if (!confirmed) return

      console.log('📝 프로필 생성 시도 - 사용자:', user.id)

      // AuthContext에서 supabase 인스턴스 가져오기
      const { getSupabase } = await import('../../lib/supabase')
      const supabase = getSupabase()
      
      if (!supabase) {
        alert('시스템 오류가 발생했습니다. 페이지를 새로고침해주세요.')
        return
      }

      // 1단계: 먼저 기존 프로필이 있는지 한 번 더 확인
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('프로필 확인 오류:', checkError)
        alert('프로필 확인 중 오류가 발생했습니다.')
        return
      }

      if (existingProfile) {
        console.log('이미 프로필이 존재함:', existingProfile)
        alert('이미 프로필이 존재합니다. 페이지를 새로고침해주세요.')
        window.location.reload()
        return
      }

      // 2단계: 새 프로필 생성 (최소 필드만)
      const profileData = {
        user_id: user.id,
        name: user.user_metadata?.name || user.name || '사용자',
        email: user.email,
        role: 'student'
      }

      console.log('📝 프로필 데이터:', profileData)

      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert([profileData])
        .select()
        .single()

      if (createError) {
        console.error('프로필 생성 실패:', createError)
        console.error('에러 세부사항:', {
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          code: createError.code
        })
        
        // 일반적인 에러 메시지들 처리
        let errorMessage = '프로필 생성에 실패했습니다.'
        if (createError.message?.includes('duplicate')) {
          errorMessage = '이미 프로필이 존재합니다. 페이지를 새로고침해주세요.'
        } else if (createError.message?.includes('permission')) {
          errorMessage = '권한이 없습니다. 관리자에게 문의해주세요.'
        } else if (createError.message) {
          errorMessage = `오류: ${createError.message}`
        }
        
        alert(errorMessage)
        return
      }

      console.log('✅ 프로필 생성 성공:', newProfile)

      // 3단계: 학생 기본 정보 생성 (오류가 있어도 계속 진행)
      try {
        const studentData = {
          user_id: user.id,
          student_type: '성인',
          music_experience: '초급',
          selected_subject: '피아노'
        }

        const { error: studentError } = await supabase
          .from('students')
          .insert([studentData])

        if (studentError) {
          console.error('학생 정보 생성 실패:', studentError)
        } else {
          console.log('✅ 학생 정보 생성 성공')
        }
      } catch (studentErr) {
        console.error('학생 정보 생성 중 오류:', studentErr)
      }

      // 4단계: 성공 메시지 및 새로고침
      alert('프로필이 성공적으로 생성되었습니다!')
      window.location.reload()
      
    } catch (error) {
      console.error('프로필 생성 중 전체 오류:', error)
      alert(`프로필 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`)
    }
  }



  // 역할별 메뉴가 추가된 네비게이션 아이템
  const navItems = [
    { name: '홈', href: '#home' },
    { name: '교재', href: '#products' },
    // 학생이 아닌 경우에만 방 예약 메뉴 표시 (강사, 관리자)
    ...(userProfile?.role !== 'student' ? [{ name: '방 예약', href: '/rooms' }] : []),
    // 학생이 아닌 경우에만 일정 메뉴 표시 (강사, 관리자)
    ...(userProfile?.role !== 'student' ? [{ name: '일정', href: '/schedule' }] : []),
    // 강사에게만 자료실 메뉴 표시
    ...(isTeacher() ? [{ name: '자료실', href: '/resources' }] : []),
    // 학생에게만 내 수업 메뉴 표시
    ...(userProfile?.role === 'student' ? [{ name: '내 수업', href: '/student/lessons' }] : []),
    { name: '소개', href: '#about' },
    { name: '문의', href: '#contact' }
  ]

  const handleCartClick = () => {
    setIsCartOpen(true)
    setIsMenuOpen(false)
  }

  const handleAuthClick = (mode) => {
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
    setIsMenuOpen(false)
  }

  const handleLogout = () => {
    logout()
    setIsUserMenuOpen(false)
    setIsMenuOpen(false)
    // 관리자 페이지에서 로그아웃 시 홈으로 이동
    if (window.location.pathname.startsWith('/admin')) {
      router.push('/')
    }
  }

  const handleHomeClick = () => {
    router.push('/')
    setIsMenuOpen(false)
  }

  // 네비게이션 클릭 핸들러
  const handleNavClick = (href) => {
    if (href.startsWith('#')) {
      // 앵커 링크인 경우 기존 동작 유지
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      // 페이지 라우팅
      router.push(href)
    }
    setIsMenuOpen(false)
  }

  return (
    <>
      <header className="fixed w-full top-0 z-40 backdrop-blur-lg border-b" style={{backgroundColor: '#262627', borderBottomColor: '#404041'}}>
        <nav className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* 로고 섹션 */}
            <div 
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={handleHomeClick}
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden group-hover:scale-105 transition-transform duration-200">
                <img 
                  src="/images/logo.png" 
                  alt="Pretium Sound Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center" style={{display: 'none'}}>
                  <svg 
                    className="w-6 h-6 text-white" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold gradient-text group-hover:text-blue-400 transition-colors duration-200">
                PRETIUM SOUND Edu CENTER
              </div>
            </div>

            {/* 데스크톱 네비게이션 */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className="text-gray-300 hover:text-blue-400 font-medium transition-colors duration-200 flex items-center space-x-1"
                >
                  {item.name === '방 예약' && <MapPin size={18} />}
                  {item.name === '일정' && <Calendar size={18} />}
                  {item.name === '자료실' && <FolderOpen size={18} />}
                  <span>{item.name}</span>
                </button>
              ))}
              
              {/* 관리자 전용 메뉴 */}
              {isAdmin() && (
                <button
                  onClick={() => router.push('/admin')}
                  className="flex items-center space-x-2 text-gray-300 hover:text-blue-400 font-medium transition-colors duration-200 bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-500/30"
                >
                  <BarChart3 size={18} />
                  <span>관리자</span>
                </button>
              )}
              
              {/* 장바구니 아이콘 */}
              <button 
                onClick={handleCartClick}
                className="relative p-2 text-gray-300 hover:text-blue-400 transition-colors duration-200"
              >
                <ShoppingCart size={24} />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {getTotalItems()}
                  </span>
                )}
              </button>

              {/* 사용자 메뉴 */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg transition-colors relative"
                    style={{'&:hover': {backgroundColor: '#3a3a3b'}}}
                  >
                    <Avatar name={user?.name} size={32} className="flex-shrink-0" />
                    <div className="text-left">
                      <span className="text-gray-300 font-medium block">{user?.name || 'User'}</span>
                      {!userProfile && (
                        <span className="text-xs text-red-400 font-medium">프로필 설정 필요</span>
                      )}
                      {isAdmin() && (
                        <span className="text-xs text-blue-400 font-medium">관리자</span>
                      )}
                      {isTeacher() && !isAdmin() && (
                        <span className="text-xs text-green-400 font-medium">강사</span>
                      )}
                    </div>
                    {/* 프로필 없음 알림 점 */}
                    {!userProfile && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
                    )}
                  </button>

                  {/* 사용자 드롭다운 메뉴 */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg border border-gray-700 py-2 z-50" style={{backgroundColor: '#2a2a2b'}}>
                      <div className="px-4 py-2 border-b border-gray-700">
                        <p className="text-sm font-medium text-gray-200">{user?.name}</p>
                        <p className="text-xs text-gray-400">{user?.email}</p>
                        
                        {/* 프로필이 없는 경우 생성 버튼 */}
                        {!userProfile && (
                          <button
                            onClick={createProfile}
                            className="mt-2 w-full text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                          >
                            프로필 생성하기
                          </button>
                        )}

                        {isAdmin() && (
                          <span className="inline-block mt-1 text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                            관리자
                          </span>
                        )}
                        {isTeacher() && !isAdmin() && (
                          <span className="inline-block mt-1 text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full border border-green-500/30">
                            강사
                          </span>
                        )}
                        {userProfile?.role === 'student' && (
                          <span className="inline-block mt-1 text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                            학생
                          </span>
                        )}
                      </div>
                      
                      {/* 일반 사용자 메뉴 */}
                      <button 
                        onClick={() => {
                          router.push('/profile')
                          setIsUserMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <User size={16} />
                        <span>내 프로필</span>
                      </button>

                      {/* 학생 전용 메뉴 */}
                      {userProfile?.role === 'student' && (
                        <button 
                          onClick={() => {
                            router.push('/student/lessons')
                            setIsUserMenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <BookOpen size={16} />
                          <span>내 수업</span>
                        </button>
                      )}
                      
                      <button 
                        onClick={() => {
                          router.push('/wishlist')
                          setIsUserMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <Heart size={16} />
                        <span>위시리스트</span>
                      </button>
                      
                      {/* 주문 내역 메뉴 - 모든 사용자에게 표시 */}
                      <button 
                        onClick={() => {
                          router.push('/orders')
                          setIsUserMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <Package size={16} />
                        <span>주문 내역</span>
                      </button>

                      {/* 강사 전용 자료실 메뉴 */}
                      {isTeacher() && (
                        <button 
                          onClick={() => {
                            router.push('/resources')
                            setIsUserMenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <FolderOpen size={16} />
                          <span>자료실</span>
                        </button>
                      )}

                      {/* 강사 전용 수업관리 메뉴 */}
                      {isTeacher() && (
                        <>
                          <button 
                            onClick={() => {
                              router.push('/manage-classes')
                              setIsUserMenuOpen(false)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <Users size={16} />
                            <span>수업관리</span>
                          </button>
                          

                        </>
                      )}
                      
                      {/* 관리자 전용 메뉴 */}
                      {isAdmin() && (
                        <>
                          <hr className="my-2 border-gray-700" />
                          <div className="px-4 py-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">관리자 메뉴</p>
                          </div>
                          
                          <button 
                            onClick={() => {
                              router.push('/admin')
                              setIsUserMenuOpen(false)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-blue-300 hover:bg-blue-900/30 flex items-center space-x-2"
                          >
                            <BarChart3 size={16} />
                            <span>관리자 대시보드</span>
                          </button>
                          
                          <button 
                            onClick={() => {
                              router.push('/admin/products')
                              setIsUserMenuOpen(false)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-blue-300 hover:bg-blue-900/30 flex items-center space-x-2"
                          >
                            <Package size={16} />
                            <span>상품 관리</span>
                          </button>
                          
                          <button 
                            onClick={() => {
                              router.push('/admin/orders')
                              setIsUserMenuOpen(false)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-blue-300 hover:bg-blue-900/30 flex items-center space-x-2"
                          >
                            <ShoppingCart size={16} />
                            <span>주문 관리</span>
                          </button>

                          <button 
                            onClick={() => {
                              router.push('/admin/rooms')
                              setIsUserMenuOpen(false)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-blue-300 hover:bg-blue-900/30 flex items-center space-x-2"
                          >
                            <MapPin size={16} />
                            <span>방 관리</span>
                          </button>

                          <button 
                            onClick={() => {
                              router.push('/admin/classes')
                              setIsUserMenuOpen(false)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-blue-300 hover:bg-blue-900/30 flex items-center space-x-2"
                          >
                            <Calendar size={16} />
                            <span>수업 관리</span>
                          </button>
                        </>
                      )}
                      
                      <hr className="my-2 border-gray-700" />
                      
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 flex items-center space-x-2"
                      >
                        <LogOut size={16} />
                        <span>로그아웃</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleAuthClick('login')}
                    className="text-gray-300 hover:text-blue-400 font-medium transition-colors"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => handleAuthClick('signup')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    회원가입
                  </button>
                </div>
              )}
            </div>

            {/* 모바일 메뉴 버튼과 장바구니 */}
            <div className="md:hidden flex items-center space-x-2">
              <button 
                onClick={handleCartClick}
                className="relative p-2 text-gray-300"
              >
                <ShoppingCart size={24} />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {getTotalItems()}
                  </span>
                )}
              </button>
              
              {isAuthenticated && (
                <button className="p-2 relative">
                  <Avatar name={user?.name} size={24} />
                  {isAdmin() && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                  )}
                  {isTeacher() && !isAdmin() && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                  )}
                </button>
              )}
              
              <button
                className="p-2 text-gray-300"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* 모바일 메뉴 */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-700">
              <div className="flex flex-col space-y-2 pt-4">
                {navItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.href)}
                    className="text-left text-gray-300 hover:text-blue-400 font-medium py-2 transition-colors duration-200 flex items-center space-x-2"
                  >
                    {item.name === '방 예약' && <MapPin size={18} />}
                    {item.name === '일정' && <Calendar size={18} />}
                    {item.name === '자료실' && <FolderOpen size={18} />}
                    <span>{item.name}</span>
                  </button>
                ))}
                
                {/* 관리자 전용 모바일 메뉴 */}
                {isAdmin() && (
                  <>
                    <button
                      onClick={() => {
                        router.push('/admin')
                        setIsMenuOpen(false)
                      }}
                      className="text-left text-blue-400 hover:text-blue-300 font-medium py-2 transition-colors flex items-center space-x-2"
                    >
                      <BarChart3 size={18} />
                      <span>관리자 대시보드</span>
                    </button>

                    <button
                      onClick={() => {
                        router.push('/admin/rooms')
                        setIsMenuOpen(false)
                      }}
                      className="text-left text-blue-400 hover:text-blue-300 font-medium py-2 transition-colors flex items-center space-x-2"
                    >
                      <MapPin size={18} />
                      <span>방 관리</span>
                    </button>
                  </>
                )}
                
                {/* 모바일 인증 버튼 */}
                {!isAuthenticated ? (
                  <>
                    <button
                      onClick={() => handleAuthClick('login')}
                      className="text-left text-gray-300 hover:text-blue-400 font-medium py-2 transition-colors"
                    >
                      로그인
                    </button>
                    <button
                      onClick={() => handleAuthClick('signup')}
                      className="text-left bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors mt-2"
                    >
                      회원가입
                    </button>
                  </>
                ) : (
                  <div className="border-t border-gray-700 pt-4 mt-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <Avatar name={user?.name} size={40} />
                      <div>
                        <p className="font-medium text-gray-200">{user?.name}</p>
                        <p className="text-sm text-gray-400">{user?.email}</p>
                        {isAdmin() && (
                          <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                            관리자
                          </span>
                        )}
                        {isTeacher() && !isAdmin() && (
                          <span className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full border border-green-500/30">
                            강사
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        router.push('/profile')
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left text-gray-300 hover:text-blue-400 font-medium py-2 transition-colors"
                    >
                      내 프로필
                    </button>

                    {/* 모바일 강사 전용 자료실 메뉴 */}
                    {isTeacher() && (
                      <button 
                        onClick={() => {
                          router.push('/resources')
                          setIsMenuOpen(false)
                        }}
                        className="w-full text-left text-green-300 hover:text-green-400 font-medium py-2 transition-colors flex items-center space-x-2"
                      >
                        <FolderOpen size={16} />
                        <span>자료실</span>
                      </button>
                    )}

                    {/* 모바일 학생 전용 내 수업 메뉴 */}
                    {userProfile?.role === 'student' && (
                      <button 
                        onClick={() => {
                          router.push('/student/lessons')
                          setIsMenuOpen(false)
                        }}
                        className="w-full text-left text-blue-300 hover:text-blue-400 font-medium py-2 transition-colors flex items-center space-x-2"
                      >
                        <BookOpen size={16} />
                        <span>내 수업</span>
                      </button>
                    )}

                    {/* 모바일 강사 전용 수업관리 메뉴 */}
                    {isTeacher() && (
                      <>
                        <button 
                          onClick={() => {
                            router.push('/manage-classes')
                            setIsMenuOpen(false)
                          }}
                          className="w-full text-left text-green-300 hover:text-green-400 font-medium py-2 transition-colors flex items-center space-x-2"
                        >
                          <Users size={16} />
                          <span>수업관리</span>
                        </button>
                        

                      </>
                    )}

                    <button 
                      onClick={() => {
                        router.push('/wishlist')
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left text-gray-300 hover:text-blue-400 font-medium py-2 transition-colors"
                    >
                      위시리스트
                    </button>
                    <button 
                      onClick={() => {
                        router.push('/orders')
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left text-gray-300 hover:text-blue-400 font-medium py-2 transition-colors"
                    >
                      주문 내역
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left text-red-400 hover:text-red-300 font-medium py-2 transition-colors"
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* 외부 클릭시 사용자 메뉴 닫기 */}
        {isUserMenuOpen && (
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setIsUserMenuOpen(false)}
          />
        )}
      </header>

      {/* 장바구니 사이드바 */}
      <CartSidebar 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />

      {/* 인증 모달 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </>
  )
}