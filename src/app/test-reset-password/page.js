'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function TestResetPassword() {
  const [email, setEmail] = useState('s2@test.ccom')
  const [newPassword, setNewPassword] = useState('testtest')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleResetPassword = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Supabase Admin API를 직접 호출 (서비스 롤 키 필요)
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.getSession()?.access_token}`
        },
        body: JSON.stringify({
          email: email,
          newPassword: newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ 성공: ${data.message}`)
      } else {
        setMessage(`❌ 실패: ${data.error}`)
      }
    } catch (error) {
      console.error('비밀번호 재설정 오류:', error)
      setMessage(`❌ 오류: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">비밀번호 재설정 테스트</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="s2@test.ccom"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              새 비밀번호
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="testtest"
            />
          </div>
          
          <button
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? '처리 중...' : '비밀번호 변경'}
          </button>
        </div>
        
        {message && (
          <div className={`mt-4 p-3 rounded-md ${
            message.includes('성공') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}
        
        <div className="mt-6 text-sm text-gray-600">
          <p><strong>주의:</strong> 이 페이지는 테스트용입니다.</p>
          <p>실제 운영에서는 보안을 위해 제거해야 합니다.</p>
        </div>
      </div>
    </div>
  )
} 