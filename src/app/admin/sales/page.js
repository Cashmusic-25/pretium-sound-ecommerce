'use client';

import { useState, useEffect } from 'react';
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

export default function SalesStatistics() {
  const [salesData, setSalesData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30days');
  const [sortBy, setSortBy] = useState('revenue');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const { makeAuthenticatedRequest } = useAuth();

  useEffect(() => {
    fetchSalesStatistics();
  }, [timeRange, sortBy, sortOrder]);

  const fetchSalesStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await makeAuthenticatedRequest(
        `/api/admin/sales-statistics?timeRange=${timeRange}&sortBy=${sortBy}&sortOrder=${sortOrder}`
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
              기간 선택
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="7days">최근 7일</option>
              <option value="30days">최근 30일</option>
              <option value="90days">최근 90일</option>
              <option value="1year">최근 1년</option>
              <option value="all">전체 기간</option>
            </select>
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

      {/* 요약 통계 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <DollarSign className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">총 매출액</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(summary.totalRevenue)}원
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
                  {formatPrice(summary.totalQuantity)}개
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
                  {formatPrice(summary.totalOrders)}건
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
                  {formatPrice(summary.averageOrderValue)}원
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 교재별 상세 통계 테이블 */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              교재별 상세 통계 ({getTimeRangeLabel(timeRange)})
            </h3>
            <p className="text-sm text-gray-600">
              총 {salesData.length}개 상품 • {getSortLabel(sortBy)} 기준 정렬
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