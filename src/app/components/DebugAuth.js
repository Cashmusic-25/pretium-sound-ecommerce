'use client'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function DebugAuth() {
  const { user, loading, error, supabaseReady, retry } = useAuth()
  const [clientInfo, setClientInfo] = useState({})

  useEffect(() => {
    // 클라이언트 사이드 정보 수집
    setClientInfo({
      isClient: typeof window !== 'undefined',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      localStorage: typeof window !== 'undefined' && !!window.localStorage,
      timestamp: new Date().toISOString()
    })
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: 15,
      borderRadius: 8,
      fontSize: 11,
      zIndex: 9999,
      maxWidth: 350,
      fontFamily: 'monospace',
      border: '1px solid #333'
    }}>
      <div style={{fontWeight: 'bold', marginBottom: 10, color: '#00ff00'}}>🐛 DEBUG AUTH</div>
      
      <div><strong>Auth Status:</strong></div>
      <div>• Loading: <span style={{color: loading ? '#ff6b6b' : '#51cf66'}}>{loading ? 'Yes' : 'No'}</span></div>
      <div>• User: <span style={{color: user ? '#51cf66' : '#ff6b6b'}}>{user ? user.email : 'None'}</span></div>
      <div>• Supabase Ready: <span style={{color: supabaseReady ? '#51cf66' : '#ff6b6b'}}>{supabaseReady ? 'Yes' : 'No'}</span></div>
      <div>• Error: <span style={{color: error ? '#ff6b6b' : '#51cf66'}}>{error || 'None'}</span></div>
      
      <div style={{marginTop: 10}}><strong>Environment:</strong></div>
      <div>• URL Set: <span style={{color: process.env.NEXT_PUBLIC_SUPABASE_URL ? '#51cf66' : '#ff6b6b'}}>{process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Yes' : 'No'}</span></div>
      <div>• Key Set: <span style={{color: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '#51cf66' : '#ff6b6b'}}>{process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Yes' : 'No'}</span></div>
      
      <div style={{marginTop: 10}}><strong>Client Info:</strong></div>
      <div>• Is Client: <span style={{color: clientInfo.isClient ? '#51cf66' : '#ff6b6b'}}>{clientInfo.isClient ? 'Yes' : 'No'}</span></div>
      <div>• LocalStorage: <span style={{color: clientInfo.localStorage ? '#51cf66' : '#ff6b6b'}}>{clientInfo.localStorage ? 'Yes' : 'No'}</span></div>
      <div style={{fontSize: 10, opacity: 0.7}}>• Time: {clientInfo.timestamp}</div>
      
      {error && (
        <button 
          onClick={retry} 
          style={{
            marginTop: 10, 
            padding: '5px 10px', 
            background: '#339af0', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 10
          }}
        >
          🔄 Retry
        </button>
      )}
      
      <div style={{
        marginTop: 10, 
        fontSize: 9, 
        opacity: 0.5,
        borderTop: '1px solid #333',
        paddingTop: 5
      }}>
        Node ENV: {process.env.NODE_ENV || 'unknown'}
      </div>
    </div>
  )
}