// src/app/resources/page.js
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import { Download, FileText, Music, Archive, Search, Filter, Calendar, User } from 'lucide-react'

export default function ResourcesPage() {
  const { user, isTeacher, isAdmin, loading, makeAuthenticatedRequest } = useAuth()
  const router = useRouter()
  const [resources, setResources] = useState([])
  const [filteredResources, setFilteredResources] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [downloadingFiles, setDownloadingFiles] = useState(new Set())
  const [loadingResources, setLoadingResources] = useState(false)

  // 데이터베이스에서 자료 목록 로드 (타임아웃 설정) - useCallback으로 메모이제이션
  const loadResources = useCallback(async () => {
    if (!user || (!isTeacher() && !isAdmin())) return

    setLoadingResources(true)
    try {
      console.log('📋 자료 목록 요청 시작')
      
      // 5초 타임아웃 설정
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await makeAuthenticatedRequest('/api/resources', {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '자료 목록을 불러오는데 실패했습니다.')
      }

      const data = await response.json()
      console.log('📚 받은 자료 수:', data.resources?.length || 0)
      
      setResources(data.resources || [])
      setFilteredResources(data.resources || [])
    } catch (error) {
      console.error('자료 목록 로드 실패:', error)
      
      let errorMessage = '자료 목록을 불러오는데 실패했습니다.'
      if (error.name === 'AbortError') {
        errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      alert(errorMessage)
    } finally {
      setLoadingResources(false)
    }
  }, [user, isTeacher, isAdmin, makeAuthenticatedRequest])

  useEffect(() => {
    // 강사가 아닌 경우 홈으로 리다이렉트
    if (!loading && !isTeacher() && !isAdmin()) {
      router.push('/')
      return
    }

    // 인증된 사용자인 경우 자료 목록 로드
    if (!loading && (isTeacher() || isAdmin()) && user) {
      loadResources()
    }
  }, [loading, isTeacher, isAdmin, router, user, loadResources])

  // 검색 및 필터링
  useEffect(() => {
    if (!resources.length) return
    
    let filtered = resources.filter(resource => {
      const matchesSearch = 
        resource.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.productTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
    
    setFilteredResources(filtered)
  }, [searchTerm, selectedCategory, resources])

  // 파일 다운로드 핸들러 (API를 통한 안전한 다운로드) - useCallback으로 메모이제이션
  const handleDownload = useCallback(async (resource) => {
    if (downloadingFiles.has(resource.id)) return

    try {
      setDownloadingFiles(prev => new Set(prev).add(resource.id))
      
      // API를 통한 다운로드로 변경 (Storage 접근 문제 해결)
      const response = await makeAuthenticatedRequest(
        `/api/download/resource/${resource.fileId}?productId=${resource.productId}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/octet-stream'
          }
        }
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '다운로드 실패')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = resource.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log('✅ API 다운로드 성공:', resource.filename)
      
    } catch (error) {
      console.error('다운로드 에러:', error)
      alert(`다운로드 중 오류가 발생했습니다: ${error.message}`)
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(resource.id)
        return newSet
      })
    }
  }, [downloadingFiles, makeAuthenticatedRequest])

  // 파일 타입별 아이콘
  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />
      case 'audio': return <Music className="w-8 h-8 text-purple-500" />
      case 'archive': return <Archive className="w-8 h-8 text-yellow-500" />
      default: return <FileText className="w-8 h-8 text-gray-500" />
    }
  }

  // 파일 타입별 배경색
  const getTypeColor = (type) => {
    switch (type) {
      case 'pdf': return 'bg-red-50 border-red-200'
      case 'audio': return 'bg-purple-50 border-purple-200'
      case 'archive': return 'bg-yellow-50 border-yellow-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  // 카테고리 목록 (실제 데이터베이스 기준)
  const categories = ['all', '드럼', '음악이론', '찬양악보집', '미디', '피아노', '통기타']

  if (loading || loadingResources) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              {loading ? '로딩 중...' : '자료 목록을 불러오는 중...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!isTeacher() && !isAdmin()) {
    return null // 리다이렉트 처리됨
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          {/* 헤더 섹션 */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">강사 자료실</h1>
              <p className="text-gray-600">
                판매 중인 교재의 PDF 파일과 음원 자료를 다운로드할 수 있습니다.
              </p>
            </div>
            
            <button
              onClick={loadResources}
              disabled={loadingResources}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <svg 
                className={`w-4 h-4 ${loadingResources ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>새로고침</span>
            </button>
          </div>

          {/* 검색 및 필터 섹션 */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              {/* 검색 */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="파일명, 교재명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* 카테고리 필터 */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? '전체 카테고리' : category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* 검색 결과 요약 */}
            <div className="mt-4 text-sm text-gray-600">
              총 {filteredResources.length}개의 자료가 있습니다.
            </div>
          </div>

          {/* 자료 목록 */}
          {filteredResources.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <div className="text-gray-400 mb-4">
                <FileText className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">자료가 없습니다</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategory !== 'all' 
                  ? '검색 조건에 맞는 자료가 없습니다.' 
                  : '아직 등록된 자료가 없습니다.'}
              </p>
              {!searchTerm && selectedCategory === 'all' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-blue-800 text-sm">
                    📁 관리자가 교재 파일을 업로드하면 여기에 표시됩니다.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map((resource) => (
                  <div 
                    key={resource.id}
                    className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${getTypeColor(resource.fileType)}`}
                  >
                    <div className="p-6">
                      {/* 파일 정보 헤더 */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(resource.fileType)}
                          <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {resource.productTitle}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {resource.filename}
                          </p>
                          </div>
                        </div>
                      </div>

                      {/* 파일 설명 */}
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {resource.description}
                      </p>

                      {/* 파일 메타 정보 */}
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {resource.category}
                        </span>
                        <span className="font-medium">
                          {resource.fileSize}
                        </span>
                      </div>

                      {/* 다운로드 버튼 */}
                      <button
                        onClick={() => handleDownload(resource)}
                        disabled={downloadingFiles.has(resource.id)}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        {downloadingFiles.has(resource.id) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>다운로드 중...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>다운로드</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 데이터베이스 연동 안내 */}
              <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900 mb-1">데이터베이스 연동</h3>
                    <p className="text-sm text-green-800">
                      모든 PDF 파일은 Supabase Storage에 안전하게 저장되어 있으며, 
                      강사 권한으로 직접 다운로드할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 안내 메시지 */}
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">강사 전용 자료실 이용 안내</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 이 자료실은 강사 계정으로 로그인한 사용자만 접근할 수 있습니다.</li>
                  <li>• 모든 교재의 PDF 파일과 관련 음원을 자유롭게 다운로드할 수 있습니다.</li>
                  <li>• 다운로드한 자료는 교육 목적으로만 사용해주세요.</li>
                  <li>• 자료에 대한 문의사항은 관리자에게 연락해주세요.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}