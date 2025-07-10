'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X, ShoppingCart, User, LogOut, Heart, Package, Settings, BarChart3 } from 'lucide-react'
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
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const router = useRouter()

  const navItems = [
    { name: '홈', href: '#home' },
    { name: '교재', href: '#products' },
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

  return (
    <>
      <header className="fixed w-full top-0 z-40 backdrop-blur-lg border-b" style={{backgroundColor: '#262627', borderBottomColor: '#404041'}}>
        <nav className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* 로고 섹션 - 이미지 파일 + 텍스트 */}
            <div 
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={handleHomeClick}
            >
              {/* 로고 이미지 */}
              <div className="w-10 h-10 rounded-lg overflow-hidden group-hover:scale-105 transition-transform duration-200">
                <img 
                  src="/images/logo.png" 
                  alt="Pretium Sound Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // 이미지 로드 실패시 기본 음표 아이콘으로 대체
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                {/* 이미지 로드 실패시 보여줄 기본 아이콘 */}
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
              {/* 브랜드 텍스트 */}
              <div className="text-2xl font-bold gradient-text group-hover:text-blue-400 transition-colors duration-200">
                PRETIUM SOUND
              </div>
            </div>

            {/* 데스크톱 네비게이션 */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-gray-300 hover:text-blue-400 font-medium transition-colors duration-200"
                >
                  {item.name}
                </a>
              ))}
              
              {/* 관리자 전용 메뉴 */}
              {isAdmin && (
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
                    className="flex items-center space-x-2 p-2 rounded-lg transition-colors"
                    style={{'&:hover': {backgroundColor: '#3a3a3b'}}}
                  >
                    <Avatar name={user?.name} size={32} className="flex-shrink-0" />
                    <div className="text-left">
                      <span className="text-gray-300 font-medium block">{user?.name || 'User'}</span>
                      {isAdmin && (
                        <span className="text-xs text-blue-400 font-medium">관리자</span>
                      )}
                    </div>
                  </button>

                  {/* 사용자 드롭다운 메뉴 */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg border border-gray-700 py-2 z-50" style={{backgroundColor: '#2a2a2b'}}>
                      <div className="px-4 py-2 border-b border-gray-700">
                        <p className="text-sm font-medium text-gray-200">{user?.name}</p>
                        <p className="text-xs text-gray-400">{user?.email}</p>
                        {isAdmin && (
                          <span className="inline-block mt-1 text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                            관리자
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
                      
                      <button 
                        onClick={() => {
                          router.push('/wishlist')
                          setIsUserMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <Heart size={16} />
                        <span>위시리스트</span>
                        {user?.wishlist?.length > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-auto">
                            {user.wishlist.length}
                          </span>
                        )}
                      </button>
                      
                      <button 
                        onClick={() => {
                          router.push('/orders')
                          setIsUserMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <Package size={16} />
                        <span>주문 내역</span>
                        {user?.orders?.length > 0 && (
                          <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 ml-auto">
                            {user.orders.length}
                          </span>
                        )}
                      </button>
                      
                      {/* 관리자 전용 메뉴 */}
                      {isAdmin && (
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
                  {isAdmin && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
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
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-gray-300 hover:text-blue-400 font-medium py-2 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                ))}
                
                {/* 관리자 전용 모바일 메뉴 */}
                {isAdmin && (
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
                        {isAdmin && (
                          <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                            관리자
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
                    <button 
                      onClick={() => {
                        router.push('/wishlist')
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left text-gray-300 hover:text-blue-400 font-medium py-2 transition-colors flex items-center justify-between"
                    >
                      <span>위시리스트</span>
                      {user?.wishlist?.length > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                          {user.wishlist.length}
                        </span>
                      )}
                    </button>
                    <button 
                      onClick={() => {
                        router.push('/orders')
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left text-gray-300 hover:text-blue-400 font-medium py-2 transition-colors flex items-center justify-between"
                    >
                      <span>주문 내역</span>
                      {user?.orders?.length > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                          {user.orders.length}
                        </span>
                      )}
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