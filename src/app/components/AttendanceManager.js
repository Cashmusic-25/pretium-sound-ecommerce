'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Users, CheckCircle, XCircle, Clock, Edit, Save, X } from 'lucide-react';

export default function AttendanceManager({ classId, date = new Date().toISOString().split('T')[0] }) {
  const { user, makeAuthenticatedRequest } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [absentStudents, setAbsentStudents] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(date);
  const [classInfo, setClassInfo] = useState(null);
  const [invalidDate, setInvalidDate] = useState(false);

  // 수업 정보 로드
  const loadClassInfo = async () => {
    try {
      const response = await makeAuthenticatedRequest(`/api/teacher/classes/${classId}`);
      if (response.ok) {
        const data = await response.json();
        setClassInfo(data);
        
        // 선택된 날짜가 수업 요일과 일치하는지 확인
        const selectedDayOfWeek = new Date(selectedDate).getDay();
        const isValidDate = selectedDayOfWeek === data.day_of_week;
        setInvalidDate(!isValidDate);
        
        // 유효하지 않은 날짜라면 가장 가까운 수업 날짜로 자동 설정
        if (!isValidDate) {
          const today = new Date();
          const todayDayOfWeek = today.getDay();
          const daysUntilClass = (data.day_of_week - todayDayOfWeek + 7) % 7;
          const nextClassDate = new Date(today);
          nextClassDate.setDate(today.getDate() + daysUntilClass);
          setSelectedDate(nextClassDate.toISOString().split('T')[0]);
        }
      } else {
        console.error('수업 정보 로드 실패');
      }
    } catch (error) {
      console.error('수업 정보 로드 오류:', error);
    }
  };

  // 출결 데이터 로드
  const loadAttendance = async () => {
    try {
      const response = await makeAuthenticatedRequest(`/api/attendance?classId=${classId}&date=${selectedDate}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // 모든 학생 목록 (출결 기록이 있든 없든)
        const allStudents = data.attendance || [];
        setAttendance(allStudents);
        setSummary(data.summary?.[0] || null);
        
        // 결석자 목록 초기화 (출결 기록이 있는 학생만)
        const absentList = allStudents
          ?.filter(student => student.status === 'absent')
          .map(student => student.student_id) || [];
        setAbsentStudents(absentList);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('출결 데이터 로드 실패:', response.status, errorData);
      }
    } catch (error) {
      console.error('출결 데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 결석자 체크 처리
  const handleMarkAbsent = async () => {
    setSaving(true);
    try {
      const response = await makeAuthenticatedRequest('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          classId,
          absentStudentIds: absentStudents,
          date: selectedDate,
          notes
        })
      });

      if (response.ok) {
        alert('출결이 성공적으로 기록되었습니다.');
        loadAttendance(); // 데이터 새로고침
      } else {
        const error = await response.json();
        alert(`출결 기록 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('출결 기록 오류:', error);
      alert('출결 기록 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 개별 학생 출석 상태 변경
  const handleStatusChange = async (studentId, newStatus) => {
    try {
      const response = await makeAuthenticatedRequest('/api/attendance/update', {
        method: 'POST',
        body: JSON.stringify({
          classId,
          studentId,
          status: newStatus,
          date: selectedDate,
          notes: ''
        })
      });

      if (response.ok) {
        loadAttendance(); // 데이터 새로고침
      } else {
        const error = await response.json();
        alert(`상태 변경 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('상태 변경 오류:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 결석자 체크박스 토글
  const toggleAbsentStudent = (studentId) => {
    setAbsentStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  useEffect(() => {
    if (classId) {
      loadClassInfo();
    }
  }, [classId]);

  useEffect(() => {
    if (classId && !invalidDate) {
      loadAttendance();
    }
  }, [classId, selectedDate, invalidDate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 날짜 선택 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">출결 날짜 선택</h3>
          </div>
          {classInfo && (
            <div className="text-sm text-gray-600">
              {classInfo.day_of_week === 1 ? '월요일' :
               classInfo.day_of_week === 2 ? '화요일' :
               classInfo.day_of_week === 3 ? '수요일' :
               classInfo.day_of_week === 4 ? '목요일' :
               classInfo.day_of_week === 5 ? '금요일' :
               classInfo.day_of_week === 6 ? '토요일' : '일요일'} 수업
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              const newDate = e.target.value;
              const newDayOfWeek = new Date(newDate).getDay();
              const isValidDate = classInfo && newDayOfWeek === classInfo.day_of_week;
              setInvalidDate(!isValidDate);
              setSelectedDate(newDate);
            }}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              if (classInfo) {
                const today = new Date();
                const todayDayOfWeek = today.getDay();
                const daysUntilClass = (classInfo.day_of_week - todayDayOfWeek + 7) % 7;
                const nextClassDate = new Date(today);
                nextClassDate.setDate(today.getDate() + daysUntilClass);
                setSelectedDate(nextClassDate.toISOString().split('T')[0]);
                setInvalidDate(false);
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            다음 수업일
          </button>
        </div>
        
        {invalidDate && classInfo && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm">
              ⚠️ 선택한 날짜는 {classInfo.day_of_week === 1 ? '월요일' :
                               classInfo.day_of_week === 2 ? '화요일' :
                               classInfo.day_of_week === 3 ? '수요일' :
                               classInfo.day_of_week === 4 ? '목요일' :
                               classInfo.day_of_week === 5 ? '금요일' :
                               classInfo.day_of_week === 6 ? '토요일' : '일요일'} 수업이 아닙니다.
            </p>
          </div>
        )}
      </div>

      {/* 출결 요약 */}
      {summary && !invalidDate && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            출결 요약
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{summary.total_students}</div>
              <div className="text-sm text-gray-600">전체</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.present_count}</div>
              <div className="text-sm text-gray-600">출석</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.absent_count}</div>
              <div className="text-sm text-gray-600">결석</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{summary.late_count}</div>
              <div className="text-sm text-gray-600">지각</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.attendance_rate}%</div>
              <div className="text-sm text-gray-600">출석률</div>
            </div>
          </div>
        </div>
      )}

      {/* 출결 데이터가 없을 때 안내 메시지 */}
      {!invalidDate && attendance.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              학생 정보를 불러올 수 없습니다
            </h3>
            <p className="text-gray-600">
              수업에 등록된 학생 정보를 확인할 수 없습니다.
            </p>
          </div>
        </div>
      )}

      {/* 결석자 체크 섹션 */}
      {!invalidDate && (
        <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">결석자 체크</h3>
        <div className="space-y-3 mb-4">
          {attendance.map((student) => (
            <div key={student.student_id} className="flex items-center space-x-3">
              <input
                type="checkbox"
                id={`absent-${student.student_id}`}
                checked={absentStudents.includes(student.student_id)}
                onChange={() => toggleAbsentStudent(student.student_id)}
                disabled={!student.is_current_student}
                className={`w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 ${
                  !student.is_current_student ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
              <label htmlFor={`absent-${student.student_id}`} className="flex-1">
                {student.student_name}
              </label>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  student.status === 'present' ? 'bg-green-100 text-green-800' :
                  student.status === 'absent' ? 'bg-red-100 text-red-800' :
                  student.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {student.status === 'present' ? '출석' :
                   student.status === 'absent' ? '결석' :
                   student.status === 'late' ? '지각' : 
                   student.status === null ? '미기록' : '기타'}
                </span>
                {!student.is_current_student && (
                  <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
                    이전 학생
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            메모 (선택사항)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="출결 관련 메모를 입력하세요..."
          />
        </div>

        <button
          onClick={handleMarkAbsent}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              출결 기록
            </>
          )}
        </button>
        </div>
      )}

      {/* 상세 출결 테이블 */}
      {!invalidDate && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">상세 출결 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  학생명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  기록 시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  메모
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendance.map((student) => (
                <tr key={student.student_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center space-x-2">
                      <span>{student.student_name}</span>
                      {!student.is_current_student && (
                        <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
                          이전 학생
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.status === 'present' ? 'bg-green-100 text-green-800' :
                      student.status === 'absent' ? 'bg-red-100 text-red-800' :
                      student.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                      student.status === null ? 'bg-gray-100 text-gray-600' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {student.status === 'present' ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          출석
                        </>
                      ) : student.status === 'absent' ? (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          결석
                        </>
                      ) : student.status === 'late' ? (
                        <>
                          <Clock className="w-3 h-3 mr-1" />
                          지각
                        </>
                      ) : student.status === null ? (
                        <>
                          <Edit className="w-3 h-3 mr-1" />
                          미기록
                        </>
                      ) : (
                        <>
                          <Edit className="w-3 h-3 mr-1" />
                          기타
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.marked_at ? new Date(student.marked_at).toLocaleString('ko-KR') : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {student.notes || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {student.is_current_student ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStatusChange(student.student_id, 'present')}
                          className="text-green-600 hover:text-green-900"
                          title="출석으로 변경"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(student.student_id, 'absent')}
                          className="text-red-600 hover:text-red-900"
                          title="결석으로 변경"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(student.student_id, 'late')}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="지각으로 변경"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">수정 불가</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
} 