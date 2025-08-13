// src/app/admin/resources/page.js (새로 생성)
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Header from '../../components/Header'
import { 
  Download, 
  FileText, 
  Users, 
  TrendingUp, 
  Calendar,
  BarChart3,
  Eye,
  RefreshCw
} from 'lucide-react'

export default function AdminResourcesPage() {
  const { user, isAdmin, loading, getResourcesStats } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('7days')

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/')
      return
    }
    
    if (isAdmin) {
      loadStats()
    }
  }, [loading, isAdmin, router])

  const loadStats = async () => {
    setLoadingStats(true)
    try {
      const statsData = await getResourcesStats()
      setStats(statsData)
    } catch (error) {
      console.error('통계 로드 실패:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          {/* 페이지 헤더 */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">자료실 관리</h1>
              <p className="text-gray-600">강사 자료실 이용 현황 및 통계</p>
            </div>
            
            <button
              onClick={loadStats}
              disabled={loadingStats}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>
          </div>

          {/* 통계 카드들 */}
          {stats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* 총 다운로드 수 */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">총 다운로드</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalDownloads.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Download className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* 오늘 다운로드 */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">오늘 다운로드</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.todayDownloads.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* 활성 강사 수 */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">활성 강사 (30일)</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeTeachers}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>

                {/* 인기 파일 수 */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">인기 파일</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.popularFiles.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 인기 파일 목록 */}
              <div className="bg-white rounded-lg shadow-sm border mb-8">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">인기 자료 TOP 5</h2>
                  <p className="text-sm text-gray-600 mt-1">다운로드 횟수가 많은 자료들</p>
                </div>
                
                <div className="p-6">
                  {stats.popularFiles.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">아직 다운로드된 자료가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stats.popularFiles.map((file, index) => (
                        <div key={`${file.product_id}_${file.file_id}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{file.filename}</h3>
                              <p className="text-sm text-gray-600">Product ID: {file.product_id}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Download className="w-4 h-4" />
                                <span>{file.download_count}회</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="w-4 h-4" />
                                <span>{file.unique_users}명</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              최근: {new Date(file.last_downloaded).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 빠른 액션 버튼들 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => router.push('/resources')}
                  className="bg-white border border-gray-300 rounded-lg p-6 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <Eye className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">자료실 보기</h3>
                      <p className="text-sm text-gray-600">강사 자료실 이용해보기</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/admin/users')}
                  className="bg-white border border-gray-300 rounded-lg p-6 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <Users className="w-8 h-8 text-green-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">사용자 관리</h3>
                      <p className="text-sm text-gray-600">강사 계정 관리</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/admin')}
                  className="bg-white border border-gray-300 rounded-lg p-6 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="w-8 h-8 text-purple-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">대시보드</h3>
                      <p className="text-sm text-gray-600">전체 관리 화면</p>
                    </div>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">통계를 불러오는 중...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}