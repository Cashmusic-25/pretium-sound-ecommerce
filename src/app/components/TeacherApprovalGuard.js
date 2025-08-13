// src/components/TeacherApprovalGuard.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Clock, CheckCircle, XCircle, AlertTriangle, Mail, BookOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function TeacherApprovalGuard({ children }) {
  const { user, userProfile, isTeacher, logout } = useAuth()
  const [approvalStatus, setApprovalStatus] = useState('checking')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // 승인 상태 확인이 필요하지 않은 페이지들
  const allowedPaths = [
    '/login', // 로그인 페이지
    '/signup', // 회원가입 페이지
    '/auth', // 인증 관련 페이지
    '/api', // API 엔드포인트
    '/_next', // Next.js 내부 페이지
    '/favicon.ico', // 파비콘
  ]

  // 현재 경로가 허용된 경로인지 확인
  const isAllowedPath = () => {
    return allowedPaths.some(path => pathname.startsWith(path))
  }

  useEffect(() => {
    const checkStatus = async () => {
      if (!user || !userProfile) {
        setLoading(false)
        return
      }
      
      // 허용된 경로이면 통과
      if (isAllowedPath()) {
        setLoading(false)
        return
      }
      
      // 강사가 아니면 통과
      if (!isTeacher()) {
        setLoading(false)
        return
      }
      
      try {
        // userProfile에서 status 직접 확인
        const status = userProfile.status
        if (status === 'approved') {
          setApprovalStatus('approved')
        } else if (status === 'rejected') {
          setApprovalStatus('rejected')
        } else {
          setApprovalStatus('pending')
        }
      } catch (error) {
        console.error('강사 승인 상태 확인 실패:', error)
        setApprovalStatus('error')
      } finally {
        setLoading(false)
      }
    }
    checkStatus()
  }, [user, userProfile, isTeacher, pathname])

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">승인 상태를 확인하는 중...</p>
        </div>
      </div>
    )
  }

  // 허용된 경로이거나 강사가 아니거나 승인된 강사면 정상 렌더링
  if (isAllowedPath() || !isTeacher() || approvalStatus === 'approved') {
    return children
  }

  // 승인되지 않은 강사를 위한 대기 화면
  const getStatusDisplay = () => {
    switch (approvalStatus) {
      case 'pending':
        return {
          icon: Clock,
          color: 'yellow',
          title: '승인 대기 중',
          message: '강사 승인이 진행 중입니다.',
          description: '관리자가 회원님의 자격을 검토하고 있습니다. 승인이 완료되면 이메일로 알려드리겠습니다.'
        }
      case 'rejected':
        return {
          icon: XCircle,
          color: 'red',
          title: '승인 거부됨',
          message: '강사 승인이 거부되었습니다.',
          description: '승인 거부 사유에 대해서는 관리자에게 직접 문의해주세요.'
        }
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'red',
          title: '오류 발생',
          message: '승인 상태를 확인할 수 없습니다.',
          description: '시스템 오류가 발생했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해주세요.'
        }
      default:
        return {
          icon: Clock,
          color: 'gray',
          title: '상태 확인 중',
          message: '승인 상태를 확인하는 중입니다.',
          description: '잠시만 기다려주세요.'
        }
    }
  }

  const statusDisplay = getStatusDisplay()
  const IconComponent = statusDisplay.icon

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {/* 아이콘 */}
        <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-${statusDisplay.color}-100 flex items-center justify-center`}>
          <IconComponent className={`text-${statusDisplay.color}-600`} size={40} />
        </div>

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {statusDisplay.title}
        </h1>

        {/* 메시지 */}
        <p className={`text-lg text-${statusDisplay.color}-600 mb-4`}>
          {statusDisplay.message}
        </p>

        {/* 설명 */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          {statusDisplay.description}
        </p>

        {/* 사용자 정보 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <BookOpen className="text-indigo-600" size={20} />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">{user?.user_metadata?.name || user?.email}</p>
              <p className="text-sm text-gray-600">강사 지원자</p>
            </div>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="space-y-3">
          {approvalStatus === 'pending' && (
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mb-4">
              <Clock size={16} />
              <span>평균 승인 시간: 1-3일</span>
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            상태 새로고침
          </button>

          {approvalStatus === 'rejected' && (
            <a
              href="mailto:admin@pretiumsound.com"
              className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors inline-flex items-center justify-center space-x-2"
            >
              <Mail size={16} />
              <span>관리자에게 문의</span>
            </a>
          )}

          <button
            onClick={logout}
            className="w-full text-gray-600 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* 안내 메시지 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            승인 관련 문의: admin@pretiumsound.com
          </p>
        </div>
      </div>
    </div>
  )
}