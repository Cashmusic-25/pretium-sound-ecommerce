'use client'

import { useState } from 'react'
import { X, Loader, Chrome } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthModal({ isOpen, onClose }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { loginWithGoogle } = useAuth()

  const handleGoogle = async () => {
    try {
      setIsLoading(true)
      setError('')
      await loginWithGoogle()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    setIsLoading(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        {/* 모달 컨테이너 */}
        <div 
          className="bg-white rounded-2xl w-full max-w-md p-8 relative"
          onClick={e => e.stopPropagation()}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>

          {/* 헤더 */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              로그인/회원가입
            </h2>
            <p className="text-gray-600">
              Google 계정으로 계속 진행하세요.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* 소셜 로그인 - Google만 */}
          <div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={isLoading}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span>처리 중...</span>
                </>
              ) : (
                <>
                  <Chrome size={20} />
                  <span>Google로 계속하기</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}