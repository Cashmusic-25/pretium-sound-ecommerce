

'use client';
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  DollarSign, 
  ShoppingCart,
  Calendar,
  ArrowUpDown,
  Download,
  RefreshCw
} from 'lucide-react';

function SalesStatisticsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [salesData, setSalesData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30days');
  const [periodKind, setPeriodKind] = useState('month'); // month | quarter
  const [periodValue, setPeriodValue] = useState(''); // e.g., 2025-12 or 2025-Q4
  const [sortBy, setSortBy] = useState('revenue');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filtersReady, setFiltersReady] = useState(false);

  const { makeAuthenticatedRequest, isAuthenticated, isAdmin, supabaseReady } = useAuth();

  useEffect(() => {
    // Supabase 준비/인증/관리자 권한 확인 후 호출
    if (!supabaseReady) return;
    if (!isAuthenticated) {
      setError('로그인이 필요합니다');
      router.push('/');
      return;
    }
    if (!isAdmin) {
      setError('관리자 권한이 필요합니다');
      router.push('/');
      return;
    }
    if (!filtersReady) return;
    fetchSalesStatistics();
  }, [timeRange, sortBy, sortOrder, isAuthenticated, isAdmin, supabaseReady, filtersReady, router]);

  // 초기 로딩 시 URL 쿼리에서 필터 복원
  useEffect(() => {
    try {
      const spPeriod = searchParams?.get('period');
      const spSortBy = searchParams?.get('sortBy');
      const spSortOrder = searchParams?.get('sortOrder');

      if (spPeriod && spPeriod.includes(':')) {
        const [k, v] = spPeriod.split(':');
        if ((k === 'month' && /^\d{4}-\d{2}$/.test(v)) || (k === 'quarter' && /^\d{4}-Q[1-4]$/.test(v))) {
          setPeriodKind(k);
          setPeriodValue(v);
        }
      }
      if (spSortBy && ['revenue','quantity','orders','title'].includes(spSortBy)) setSortBy(spSortBy);
      if (spSortOrder && ['asc','desc'].includes(spSortOrder)) setSortOrder(spSortOrder);
    } catch {}
    setFiltersReady(true);
  }, [searchParams]);

  const fetchSalesStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const isValidPeriod = !!periodValue && ((periodKind === 'month' && /^\d{4}-\d{2}$/.test(periodValue)) || (periodKind === 'quarter' && /^\d{4}-Q[1-4]$/.test(periodValue)));
      const periodParam = isValidPeriod ? `&period=${encodeURIComponent(`${periodKind}:${periodValue}`)}` : '';
      const response = await makeAuthenticatedRequest(
        `/api/admin/sales-statistics?timeRange=${timeRange}&sortBy=${sortBy}&sortOrder=${sortOrder}${periodParam}`
      );

      if (response.ok) {
        const data = await response.json();
        setSalesData(data.statistics || []);
        setSummary(data.summary || null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '매출 통계 조회 실패');
      }
    } catch (error) {
      console.error('매출 통계 조회 오류:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getTimeRangeLabel = (range) => {
    const labels = {
      '7days': '최근 7일',
      '30days': '최근 30일',
      '90days': '최근 90일',
      '1year': '최근 1년',
      'all': '전체 기간'
    };
    return labels[range] || '최근 30일';
  };

  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (thisYear - i).toString());
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  const getSortLabel = (sort) => {
    const labels = {
      'revenue': '매출액',
      'quantity': '판매량',
      'orders': '주문수',
      'title': '상품명'
    };
    return labels[sort] || '매출액';
  };

  const exportToCSV = () => {
    if (salesData.length === 0) return;

    const headers = ['순위', '상품명', '카테고리', '총 매출액', '판매량', '주문수', '평균 단가'];
    const csvContent = [
      headers.join(','),
      ...salesData.map((item, index) => [
        index + 1,
        `"${item.productTitle}"`,
        `"${item.category}"`,
        item.totalRevenue,
        item.totalQuantity,
        item.orderCount,
        item.averagePrice
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `교재별_매출통계_${getTimeRangeLabel(timeRange)}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const isValidPeriod = !!periodValue && (
    (periodKind === 'month' && /^\d{4}-\d{2}$/.test(periodValue)) ||
    (periodKind === 'quarter' && /^\d{4}-Q[1-4]$/.test(periodValue))
  );

  const applyFilters = async () => {
    try {
      // URL에 선택값 반영 (유지용)
      const params = new URLSearchParams();
      if (isValidPeriod) params.set('period', `${periodKind}:${periodValue}`);
      if (sortBy) params.set('sortBy', sortBy);
      if (sortOrder) params.set('sortOrder', sortOrder);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : '?');
      // 데이터 갱신
      await fetchSalesStatistics();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-4"></div>
          <p className="text-gray-600">매출 통계를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">데이터 로드 실패</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchSalesStatistics}
            className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors flex items-center space-x-2 mx-auto"
          >
            <RefreshCw size={16} />
            <span>다시 시도</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 및 컨트롤 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">교재별 매출 통계</h2>
            <p className="text-gray-600">상품별 판매 성과를 분석해보세요</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
            <button
              onClick={exportToCSV}
              disabled={salesData.length === 0}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              <span>CSV 다운로드</span>
            </button>
            
            <button
              onClick={fetchSalesStatistics}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
            >
              <RefreshCw size={16} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* 필터 컨트롤 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-1" />
              기간 선택 (월/분기)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={periodKind}
                onChange={(e) => { setPeriodKind(e.target.value); setPeriodValue(''); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="month">월</option>
                <option value="quarter">분기</option>
              </select>

              {periodKind === 'month' ? (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    onChange={(e) => {
                      const y = e.target.value;
                      setPeriodValue(y && periodValue ? `${y}-${periodValue.split('-')[1] || ''}` : y ? `${y}-` : '');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={periodValue.split('-')[0] || ''}
                  >
                    <option value="" disabled>연도</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select
                    onChange={(e) => {
                      const m = e.target.value;
                      const y = (periodValue.split('-')[0] || '');
                      setPeriodValue(y ? `${y}-${m}` : `-${m}`);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={periodValue.split('-')[1] || ''}
                  >
                    <option value="" disabled>월</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    onChange={(e) => {
                      const y = e.target.value;
                      setPeriodValue(y && periodValue ? `${y}-${periodValue.split('-')[1] || ''}` : y ? `${y}-` : '');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={periodValue.split('-')[0] || ''}
                  >
                    <option value="" disabled>연도</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select
                    onChange={(e) => {
                      const q = e.target.value; // Q1..Q4
                      const y = (periodValue.split('-')[0] || '');
                      setPeriodValue(y ? `${y}-${q}` : `-${q}`);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={periodValue.split('-')[1] || ''}
                  >
                    <option value="" disabled>분기</option>
                    {quarters.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
              )}
            <div className="mt-3">
              <button
                onClick={applyFilters}
                disabled={!isValidPeriod}
                className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                적용하기
              </button>
            </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ArrowUpDown size={16} className="inline mr-1" />
              정렬 기준
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="revenue">매출액순</option>
              <option value="quantity">판매량순</option>
              <option value="orders">주문수순</option>
              <option value="title">상품명순</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              정렬 순서
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="desc">높은순</option>
              <option value="asc">낮은순</option>
            </select>
          </div>
        </div>
      </div>

      {/* 요약 통계 (데이터 없을 때도 0으로 표시) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <DollarSign className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">총 매출액</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice((summary?.totalRevenue) || 0)}원
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <Package className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">총 판매량</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice((summary?.totalQuantity) || 0)}개
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-full mr-4">
                <ShoppingCart className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">총 주문수</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice((summary?.totalOrders) || 0)}건
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="bg-orange-100 p-3 rounded-full mr-4">
                <TrendingUp className="text-orange-600" size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">평균 주문액</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice((summary?.averageOrderValue) || 0)}원
                </p>
              </div>
            </div>
          </div>
      </div>

      {/* 교재별 상세 통계 테이블 */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              교재별 상세 통계 ({getTimeRangeLabel(timeRange)})
            </h3>
            <p className="text-sm text-gray-600">
              총 {salesData.length}개 상품 • {getSortLabel(sortBy)} 기준 정렬
              {periodValue && (
                <span className="ml-2 text-gray-500">(기간: {periodKind === 'month' ? periodValue.replace('-', '년 ') + '월' : periodValue.replace('-', '년 ')})</span>
              )}
            </p>
          </div>
        </div>

        {salesData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    순위
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상품명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총 매출액
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    판매량
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    주문수
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    평균 단가
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesData.map((item, index) => (
                  <tr key={item.productId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.productTitle}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-gray-900">
                        {formatPrice(item.totalRevenue)}원
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {formatPrice(item.totalQuantity)}개
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {formatPrice(item.orderCount)}건
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {formatPrice(item.averagePrice)}원
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">데이터가 없습니다</h3>
            <p className="text-gray-600">
              선택한 기간에 매출 데이터가 없습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SalesStatistics() {
  return (
    <Suspense fallback={<div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-600">로딩 중...</div>}>
      <SalesStatisticsInner />
    </Suspense>
  )
}