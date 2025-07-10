'use client'

import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

// 토스트 타입
const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
}

// 토스트 아이콘
const ToastIcon = ({ type }) => {
  switch (type) {
    case TOAST_TYPES.SUCCESS:
      return (
        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )
    case TOAST_TYPES.ERROR:
      return (
        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )
    case TOAST_TYPES.WARNING:
      return (
        <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
      )
    case TOAST_TYPES.INFO:
      return (
        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
    default:
      return null
  }
}

// 개별 토스트 컴포넌트
const ToastItem = ({ toast, onRemove }) => {
  return (
    <div 
      className={`
        transform transition-all duration-300 ease-in-out
        bg-white border border-gray-200 rounded-lg shadow-lg p-4 mb-3
        hover:shadow-xl
        ${toast.removing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div className="flex items-start space-x-3">
        <ToastIcon type={toast.type} />
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="text-gray-900 font-semibold text-sm mb-1">
              {toast.title}
            </p>
          )}
          <p className="text-gray-700 text-sm leading-relaxed">
            {toast.message}
          </p>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// 토스트 컨테이너
const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-24 right-4 z-50 max-w-sm w-full space-y-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

// 토스트 프로바이더
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = TOAST_TYPES.INFO, title = null, duration = 4000) => {
    const id = Date.now() + Math.random()
    const newToast = {
      id,
      message,
      type,
      title,
      removing: false
    }

    setToasts(prev => [...prev, newToast])

    // 자동 제거
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id) => {
    // 제거 애니메이션 시작
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id ? { ...toast, removing: true } : toast
      )
    )

    // 300ms 후 실제 제거
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 300)
  }, [])

  const removeAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  // 편의 함수들
  const showSuccess = useCallback((message, title) => {
    return addToast(message, TOAST_TYPES.SUCCESS, title)
  }, [addToast])

  const showError = useCallback((message, title) => {
    return addToast(message, TOAST_TYPES.ERROR, title, 6000) // 에러는 더 오래 표시
  }, [addToast])

  const showWarning = useCallback((message, title) => {
    return addToast(message, TOAST_TYPES.WARNING, title, 5000)
  }, [addToast])

  const showInfo = useCallback((message, title) => {
    return addToast(message, TOAST_TYPES.INFO, title)
  }, [addToast])

  const value = {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

// 커스텀 훅
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast는 ToastProvider 내부에서 사용되어야 합니다')
  }
  return context
}

// 타입 상수 내보내기
export { TOAST_TYPES }