'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AttendanceManager from '@/app/components/AttendanceManager';
import { ArrowLeft, Users } from 'lucide-react';
import { use } from 'react';

export default function TeacherClassAttendancePage({ params }) {
  const { user, isTeacher, makeAuthenticatedRequest } = useAuth();
  const router = useRouter();
  const [classInfo, setClassInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // params를 React.use()로 unwrap
  const resolvedParams = use(params);
  const classId = resolvedParams.id;

  useEffect(() => {
    if (!user || !isTeacher()) {
      router.push('/');
      return;
    }

    const loadClassInfo = async () => {
      try {
        const response = await makeAuthenticatedRequest(`/api/teacher/classes/${classId}`);
        if (response.ok) {
          const data = await response.json();
          setClassInfo(data);
        } else {
          console.error('수업 정보 로드 실패');
          router.push('/manage-classes');
        }
      } catch (error) {
        console.error('수업 정보 로드 오류:', error);
        router.push('/manage-classes');
      } finally {
        setLoading(false);
      }
    };

    loadClassInfo();
  }, [classId, user, isTeacher, router, makeAuthenticatedRequest]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">수업을 찾을 수 없습니다.</p>
          <button
            onClick={() => router.push('/manage-classes')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            수업 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/manage-classes')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            수업 목록으로 돌아가기
          </button>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Users className="w-6 h-6 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                {classInfo.title} - 출결 관리
              </h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">과목:</span> {classInfo.subject}
              </div>
              <div>
                <span className="font-medium">요일:</span> {classInfo.day_of_week === 1 ? '월요일' :
                                                          classInfo.day_of_week === 2 ? '화요일' :
                                                          classInfo.day_of_week === 3 ? '수요일' :
                                                          classInfo.day_of_week === 4 ? '목요일' :
                                                          classInfo.day_of_week === 5 ? '금요일' :
                                                          classInfo.day_of_week === 6 ? '토요일' : '일요일'}
              </div>
              <div>
                <span className="font-medium">시간:</span> {classInfo.start_time} ({classInfo.duration}분)
              </div>
            </div>
            
            {classInfo.description && (
              <div className="mt-4 text-sm text-gray-600">
                <span className="font-medium">설명:</span> {classInfo.description}
              </div>
            )}
          </div>
        </div>

        {/* 출결 관리 컴포넌트 */}
        <AttendanceManager classId={classId} />
      </div>
    </div>
  );
} 