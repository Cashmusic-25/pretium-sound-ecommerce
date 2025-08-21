'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { 
  DollarSign, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Mail,
  ArrowLeft,
  Eye,
  EyeOff,
  X,
  Calendar,
  TrendingUp
} from 'lucide-react';

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user, isAdmin, makeAuthenticatedRequest, loading: authLoading } = useAuth();
  
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [showLowAttendance, setShowLowAttendance] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentCount, setPaymentCount] = useState(1);
  const [attendanceHistory, setAttendanceHistory] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [paidSearchTerm, setPaidSearchTerm] = useState('');
  const [lowAttendanceSearchTerm, setLowAttendanceSearchTerm] = useState('');

  // loadPayments 함수를 useCallback으로 메모이제이션
  const loadPayments = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // 강제 새로고침을 위한 캐시 방지 헤더 추가
      const headers = forceRefresh ? { 'Cache-Control': 'no-cache' } : {};
      
      const response = await makeAuthenticatedRequest('/api/admin/payments', {
        method: 'GET',
        headers: {
          ...headers,
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
        
        // 강제 새로고침인 경우 성공 메시지 표시
        if (forceRefresh) {
          setMessage('데이터가 새로고침되었습니다.');
          setTimeout(() => setMessage(''), 3000);
        }
      } else {
        console.error('결제 데이터 로드 실패');
        setMessage('결제 데이터를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('결제 데이터 로드 오류:', error);
      setMessage('결제 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  useEffect(() => {
    // AuthContext가 로딩 중이면 대기
    if (authLoading) {
      return;
    }

    // 관리자가 아니면 홈으로 리다이렉트
    if (!isAdmin()) {
      router.push('/');
      return;
    }

    // 사용자가 로그인되어 있고 관리자인 경우에만 데이터 로드
    if (user && isAdmin()) {
      loadPayments(true); // 강제 새로고침으로 데이터 로드
    }
  }, [user, authLoading, isAdmin, router, loadPayments]);

  // 페이지 포커스 시 데이터 새로고침
  useEffect(() => {
    const handleFocus = () => {
      if (user && isAdmin() && !loading) {
        loadPayments(true);
      }
    };

    // 페이지가 포커스될 때 이벤트 리스너 추가
    window.addEventListener('focus', handleFocus);
    
    // 페이지가 보일 때 이벤트 리스너 추가 (탭 전환 시)
    const handleVisibilityChange = () => {
      if (!document.hidden && user && isAdmin() && !loading) {
        loadPayments(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 키보드 단축키 이벤트 리스너 추가
    const handleKeyDown = (e) => {
      // Ctrl+R 또는 F5로 새로고침
      if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
        e.preventDefault();
        if (user && isAdmin() && !loading) {
          loadPayments(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, isAdmin, loading, loadPayments]);

  // 수동 새로고침 함수
  const handleManualRefresh = () => {
    loadPayments(true);
  };

  const loadAttendanceHistory = async (paymentId) => {
    try {
      setLoadingAttendance(true);
      const response = await makeAuthenticatedRequest(`/api/admin/payments/${paymentId}/attendance-history`);
      if (response.ok) {
        const data = await response.json();
        setAttendanceHistory(data);
        setShowAttendanceModal(true);
      } else {
        const error = await response.json();
        setMessage(`출석 내역 로드 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('출석 내역 로드 오류:', error);
      setMessage('출석 내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const updatePaymentStatus = async () => {
    setUpdating(true);
    setMessage('');
    
    try {
      const response = await makeAuthenticatedRequest('/api/admin/payments/update-status', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessage(data.message || '결제 상태가 업데이트되었습니다.');
        loadPayments(); // 데이터 새로고침
      } else {
        const error = await response.json();
        setMessage(`오류: ${error.error}`);
      }
    } catch (error) {
      console.error('결제 상태 업데이트 오류:', error);
      setMessage('결제 상태 업데이트 중 오류가 발생했습니다.');
    } finally {
      setUpdating(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const openPaymentModal = (payment) => {
    setSelectedPayment(payment);
    setPaymentCount(1);
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedPayment(null);
    setPaymentCount(1);
  };

  const closeAttendanceModal = () => {
    setShowAttendanceModal(false);
    setAttendanceHistory(null);
  };

  const markAsPaid = async () => {
    if (!selectedPayment || paymentCount <= 0) {
      setMessage('결제할 출석 횟수를 입력해주세요.');
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(`/api/admin/payments/${selectedPayment.id}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({ attendanceCount: paymentCount })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessage(data.message);
        closePaymentModal();
        loadPayments(); // 데이터 새로고침
      } else {
        const error = await response.json();
        setMessage(`오류: ${error.error}`);
      }
    } catch (error) {
      console.error('결제 완료 처리 오류:', error);
      setMessage('결제 완료 처리 중 오류가 발생했습니다.');
    } finally {
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const cancelPayment = async (paymentId) => {
    if (!confirm('결제를 취소하시겠습니까? 출석 횟수가 복원됩니다.')) {
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(`/api/admin/payments/${paymentId}/mark-paid`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessage(data.message);
        loadPayments(); // 데이터 새로고침
      } else {
        const error = await response.json();
        setMessage(`오류: ${error.error}`);
      }
    } catch (error) {
      console.error('결제 취소 오류:', error);
      setMessage('결제 취소 중 오류가 발생했습니다.');
    } finally {
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            결제 필요
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            결제 완료
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            미납
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getAttendanceStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            출석
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            결석
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            지각
          </span>
        );
      case 'excused':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            사유결석
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getRemaining = (payment) => {
    const unpaid = typeof payment.unpaid_present_count === 'number' ? payment.unpaid_present_count : null;
    const legacy = typeof payment.remaining_attendance === 'number' ? payment.remaining_attendance : null;
    if (unpaid !== null) return unpaid;
    return legacy ?? 0;
  };

  // 결제 분류 - 결제 발생(부분/완납), 출석 4회 이상 대기, 4회 미만 대기
  const getPaymentCategories = () => {
    // 결제가 1회 이상 발생한 항목(부분 결제 포함)
    const paidPayments = payments.filter(payment => (payment.total_paid_amount ?? 0) > 0);

    // 남은 출석 4회 이상이면서 아직 완납되지 않은 항목
    const highAttendancePending = payments.filter(payment => {
      const rem = getRemaining(payment);
      return rem >= 4;
    });

    // 남은 출석 1~3회이면서 아직 완납되지 않은 항목 (부분 결제 포함)
    const lowAttendance = payments.filter(payment => {
      const rem = getRemaining(payment);
      return rem > 0 && rem < 4;
    });

    return { highAttendancePending, paidPayments, lowAttendance };
  };

  const { highAttendancePending, paidPayments, lowAttendance } = getPaymentCategories();

  // 검색 필터 함수
  const filterPayments = (paymentsList, searchTerm) => {
    if (!searchTerm) return paymentsList;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return paymentsList.filter(payment => 
      payment.student_name?.toLowerCase().includes(lowerSearchTerm) ||
      payment.teacher_name?.toLowerCase().includes(lowerSearchTerm) ||
      payment.class_title?.toLowerCase().includes(lowerSearchTerm)
    );
  };

  // 필터링된 데이터
  const filteredPaidPayments = filterPayments(paidPayments, paidSearchTerm);
  const filteredLowAttendance = filterPayments(lowAttendance, lowAttendanceSearchTerm);

  // 디버깅용 로그
  console.log('All payments:', payments);
  console.log('High attendance pending:', highAttendancePending);
  console.log('Paid payments:', paidPayments);
  console.log('Low attendance:', lowAttendance);

  const getStatusCounts = (paymentsList) => {
    const counts = {
      pending: 0,
      paid: 0,
      overdue: 0,
      total: paymentsList.length
    };
    
    paymentsList.forEach(payment => {
      counts[payment.payment_status]++;
    });
    
    return counts;
  };

  // 결제분 표시 함수
  const getPaymentAmount = (payment) => {
    if (payment.total_paid_amount > 0) {
      // 결제 완료된 경우 total_paid_amount 사용
      return `${payment.total_paid_amount}주분`;
    } else {
      // 미결제인 경우 남은 출석 횟수에 따라 표시
      if (payment.remaining_attendance >= 4) {
        return `${payment.remaining_attendance}주분`;
      } else {
        return `${payment.remaining_attendance}회`;
      }
    }
  };

  const highAttendancePendingCounts = getStatusCounts(highAttendancePending);
  const paidPaymentsCounts = getStatusCounts(filteredPaidPayments);
  const lowAttendanceCounts = getStatusCounts(filteredLowAttendance);

  // AuthContext 로딩 중이거나 페이지 로딩 중일 때
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">
            {authLoading ? '인증 정보를 확인하는 중...' : '결제 데이터를 불러오는 중...'}
          </div>
        </div>
      </div>
    );
  }

  // 관리자가 아닌 경우
  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600 mb-4">관리자 권한이 필요합니다.</div>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-20">
      <div className="container mx-auto px-4 py-8">
        
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm hover:shadow-md transition-all"
            >
              <ArrowLeft size={16} />
              <span>관리자 대시보드</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">수업 결제 관리</h1>
              <p className="text-gray-600">출석 기반 자동 결제 관리 시스템</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? '업데이트 중...' : '데이터 새로고침'}</span>
            </button>
          </div>
        </div>

        {/* 메시지 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('오류') 
              ? 'bg-red-100 text-red-700 border border-red-200' 
              : 'bg-green-100 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* 통계 카드 - 출석 4회 이상 결제 대기 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">결제 대기 (4회 이상)</p>
                <p className="text-2xl font-semibold text-yellow-600">{highAttendancePendingCounts.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">결제 완료</p>
                <p className="text-2xl font-semibold text-green-600">{paidPaymentsCounts.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">4회 미만 대기</p>
                <p className="text-2xl font-semibold text-blue-600">{lowAttendanceCounts.total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 출석 4회 이상 결제 대기 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-yellow-700">
              출석 4회 이상 결제 대기 목록
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              출석 횟수가 4회 이상이지만 아직 결제되지 않은 수업입니다. ({highAttendancePendingCounts.total}건)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    학생명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    강사명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수업명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    출석 횟수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    마지막 출석일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {highAttendancePending.length > 0 ? (
                  highAttendancePending.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.student_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.teacher_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.class_title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => loadAttendanceHistory(payment.id)}
                          disabled={loadingAttendance}
                          className="font-semibold text-green-600 hover:text-green-800 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {getRemaining(payment)}회
                          {loadingAttendance && <span className="ml-1">...</span>}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(payment.payment_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.last_attendance_date ? new Date(payment.last_attendance_date).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {payment.payment_status !== 'paid' && (
                            <button
                              onClick={() => openPaymentModal(payment)}
                              className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded-md transition-colors"
                            >
                              결제 완료 적용
                            </button>
                          )}
                          {payment.payment_status === 'paid' && (
                            <button
                              onClick={() => cancelPayment(payment.id)}
                              className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md transition-colors"
                            >
                              결제 완료 취소
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      출석 4회 이상인 결제 대기 대상이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 결제 완료된 수업 목록 */}
        {paidPayments.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-green-700">
                    결제 완료된 수업 목록
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    결제가 완료된 수업들입니다. ({paidPaymentsCounts.total}건)
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="학생명, 강사명, 수업명으로 검색..."
                    value={paidSearchTerm}
                    onChange={(e) => setPaidSearchTerm(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {paidSearchTerm && (
                    <button
                      onClick={() => setPaidSearchTerm('')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      학생명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      강사명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      수업명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      결제분
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      결제 완료일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPaidPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.student_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.teacher_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.class_title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => loadAttendanceHistory(payment.id)}
                          disabled={loadingAttendance}
                          className="font-semibold text-green-600 hover:text-green-800 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {getPaymentAmount(payment)}
                          {loadingAttendance && <span className="ml-1">...</span>}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge('paid')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.payment_completed_date ? new Date(payment.payment_completed_date).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => cancelPayment(payment.id)}
                          className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md transition-colors"
                        >
                          결제 취소
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 종료/비진행 수업 미결제 관리 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-semibold text-gray-900">종료/비진행 수업 미결제 관리</h2>
            </div>
            <button onClick={handleManualRefresh} className="text-sm text-blue-600 hover:text-blue-800">새로고침</button>
          </div>
          <NonContinuingPaymentsSection makeAuthenticatedRequest={makeAuthenticatedRequest} />
        </div>

        {/* 4회 미만 출석 목록 (토글 가능) */}
        {lowAttendance.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-700">
                    4회 미만 출석 목록
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    출석 횟수가 4회 미만이고 결제 완료되지 않은 수업입니다. ({lowAttendanceCounts.total}건)
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="학생명, 강사명, 수업명으로 검색..."
                    value={lowAttendanceSearchTerm}
                    onChange={(e) => setLowAttendanceSearchTerm(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {lowAttendanceSearchTerm && (
                    <button
                      onClick={() => setLowAttendanceSearchTerm('')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowLowAttendance(!showLowAttendance)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md border border-gray-300 bg-gray-50 hover:bg-gray-100 transition-all"
                  >
                    {showLowAttendance ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>숨기기</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>보기</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {showLowAttendance && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        학생명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        강사명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        수업명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        출석 횟수
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        마지막 출석일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLowAttendance.map((payment) => (
                      <tr key={payment.id} className="bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.student_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.teacher_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.class_title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => loadAttendanceHistory(payment.id)}
                            disabled={loadingAttendance}
                            className="font-semibold text-orange-600 hover:text-orange-800 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {getRemaining(payment)}회
                            {loadingAttendance && <span className="ml-1">...</span>}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <Clock className="w-3 h-3 mr-1" />
                            대기 중
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.last_attendance_date ? new Date(payment.last_attendance_date).toLocaleDateString('ko-KR') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className="text-gray-400">4회 미만</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 결제 완료 모달 */}
        {showPaymentModal && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">결제 완료 적용</h3>
                <button
                  onClick={closePaymentModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>{selectedPayment.student_name}</strong> - {selectedPayment.class_title}
                </p>
                <p className="text-sm text-gray-600">
                  현재 출석 횟수: <span className="font-semibold text-green-600">{getRemaining(selectedPayment)}회</span>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  결제할 출석 횟수
                </label>
                <input
                  type="number"
                  min="1"
                  max={getRemaining(selectedPayment)}
                  value={paymentCount}
                  onChange={(e) => setPaymentCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  최대 {getRemaining(selectedPayment)}회까지 결제 가능
                </p>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  결제 후 남은 출석: <span className="font-semibold">{Math.max(0, getRemaining(selectedPayment) - paymentCount)}회</span>
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={closePaymentModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={markAsPaid}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  결제 완료 적용
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 출석 내역 모달 */}
        {showAttendanceModal && attendanceHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-semibold">출석 내역</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {attendanceHistory.payment?.student_name} - {attendanceHistory.attendanceRecords[0]?.class_title}
                  </p>
                </div>
                <button
                  onClick={closeAttendanceModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* 출석 통계 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm text-blue-600">전체</p>
                      <p className="text-xl font-semibold text-blue-800">{attendanceHistory.statistics.totalRecords}회</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm text-green-600">출석</p>
                      <p className="text-xl font-semibold text-green-800">{attendanceHistory.statistics.presentCount}회</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                    <div>
                      <p className="text-sm text-red-600">결석</p>
                      <p className="text-xl font-semibold text-red-800">{attendanceHistory.statistics.absentCount}회</p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                    <div>
                      <p className="text-sm text-yellow-600">지각</p>
                      <p className="text-xl font-semibold text-yellow-800">{attendanceHistory.statistics.lateCount}회</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
                    <div>
                      <p className="text-sm text-purple-600">출석률</p>
                      <p className="text-xl font-semibold text-purple-800">{attendanceHistory.statistics.attendanceRate}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 결제 정보 표시 */}
              {attendanceHistory.payment?.payment_status === 'paid' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-800">결제 완료</p>
                      <p className="text-sm text-green-600">
                        {attendanceHistory.payment.notes && attendanceHistory.payment.notes.includes('결제 완료:') 
                          ? attendanceHistory.payment.notes.split('결제 완료:')[1]?.split('(')[0]?.trim() || '결제 완료'
                          : '결제 완료'
                        }
                        {attendanceHistory.payment.payment_completed_date && (
                          <span className="ml-2">
                            ({new Date(attendanceHistory.payment.payment_completed_date).toLocaleDateString('ko-KR')})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 출석 기록 목록 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-medium mb-4">상세 출석 기록</h4>
                <div className="space-y-3">
                  {(() => {
                    // 결제된 회수 기준으로 가장 이른 출석부터 결제 완료 매핑
                    const paidCount = attendanceHistory.payment?.total_paid_amount || 0;
                    const presentSortedAsc = [...attendanceHistory.attendanceRecords]
                      .filter(r => r.status === 'present')
                      .sort((a, b) => new Date(a.attendance_date) - new Date(b.attendance_date));
                    const paidRecordIdsByQuota = new Set(presentSortedAsc.slice(0, paidCount).map(r => r.id));

                    return attendanceHistory.attendanceRecords.map((record) => {
                      const totalPaid = attendanceHistory.payment?.total_paid_amount || 0;
                      const isHidden = record.is_hidden;
                      const isPaidByQuota = paidRecordIdsByQuota.has(record.id);

                      // 결제 완료 표시: 결제 회수 할당에 포함된 출석
                      const shouldShowAsPaid = isPaidByQuota;
                      // 미결제 태그는 결제가 0회일 때만 표시
                      const shouldShowAsUnpaid = totalPaid === 0 && !isHidden && record.status === 'present';

                    return (
                      <div key={record.id} className={`p-4 rounded-lg shadow-sm ${shouldShowAsPaid ? 'bg-green-50 border border-green-200' : 'bg-white'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(record.attendance_date).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long'
                              })}
                            </div>
                            <div className="flex items-center space-x-2">
                              {shouldShowAsPaid ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  결제 완료
                                </span>
                              ) : (
                                getAttendanceStatusBadge(record.status)
                              )}
                              {shouldShowAsUnpaid && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <DollarSign className="w-3 h-3 mr-1" />
                                  미결제
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.marked_at && new Date(record.marked_at).toLocaleString('ko-KR')}
                          </div>
                        </div>
                        {record.notes && !shouldShowAsPaid && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">메모:</span> {record.notes}
                          </div>
                        )}
                        {shouldShowAsPaid && (
                          <div className="mt-2 text-sm text-green-600">
                            <span className="font-medium">결제 완료 처리 분</span>
                          </div>
                        )}
                      </div>
                    );
                  });})()}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeAttendanceModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 새로고침 안내 */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 text-blue-800">
            <RefreshCw className="w-5 h-5" />
            <span className="font-medium">새로고침 방법</span>
          </div>
          <div className="mt-2 text-sm text-blue-700 space-y-1">
            <p>• <strong>버튼 클릭:</strong> 상단의 "데이터 새로고침" 버튼</p>
            <p>• <strong>키보드:</strong> Ctrl+R 또는 F5 키</p>
            <p>• <strong>자동:</strong> 페이지 포커스 시 자동 새로고침</p>
            <p>• <strong>탭 전환:</strong> 다른 탭에서 돌아올 때 자동 새로고침</p>
          </div>
        </div>
      </div>
    </div>
  );
} 

function NonContinuingPaymentsSection({ makeAuthenticatedRequest }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await makeAuthenticatedRequest('/api/admin/payments/non-continuing', { method: 'GET' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || '데이터 로드 실패');
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pending = items.filter(i => (i.remaining_attendance ?? 0) > 0);

  return (
    <div>
      {error && <div className="px-6 py-3 text-sm text-red-600">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학생</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수업명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">마지막 출석일</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">누적 출석</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결제됨</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">남은 출석</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="7" className="px-6 py-6 text-center text-gray-500">불러오는 중…</td></tr>
            ) : pending.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-6 text-center text-gray-500">표시할 항목이 없습니다.</td></tr>
            ) : pending.map(item => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.student_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.class_title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.last_attendance_date ? new Date(item.last_attendance_date).toLocaleDateString('ko-KR') : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.attendance_count ?? 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.total_paid_amount ?? 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-amber-700">{item.remaining_attendance ?? 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1 rounded"
                    onClick={() => {
                      // 기존 결제 모달 흐름 재사용: 남은 출석을 기본값으로 채우고 모달 오픈
                      const count = Math.max(1, item.remaining_attendance || 1);
                      // 단순히 페이지 상단 메시지로 안내
                      alert(`${item.student_name} - ${item.class_title}: 남은 ${count}회 결제는 상단 목록에서 해당 학생 항목의 결제 버튼으로 진행해주세요.`);
                    }}
                  >결제 안내</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}