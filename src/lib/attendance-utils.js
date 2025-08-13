import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// is_hidden 컬럼이 존재하는지 확인하는 함수
export async function checkHiddenColumnExists() {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('is_hidden')
      .limit(1);
    
    return !error;
  } catch (error) {
    return false;
  }
}

// 숨겨진 기록을 제외한 출석 기록 조회 (일반적인 경우)
export async function getAttendanceRecordsWithoutHidden(classId, studentId) {
  const hasHiddenColumn = await checkHiddenColumnExists();
  
  if (hasHiddenColumn) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        classes(title, subject)
      `)
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .eq('is_hidden', false)
      .order('attendance_date', { ascending: false });
    
    return { data, error };
  } else {
    // is_hidden 컬럼이 없으면 모든 기록 조회
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        classes(title, subject)
      `)
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .order('attendance_date', { ascending: false });
    
    return { data, error };
  }
}

// 결제 완료된 수업의 경우 모든 출석 기록 조회 (숨겨진 기록 포함)
export async function getAttendanceRecordsForPaidClass(classId, studentId) {
  const hasHiddenColumn = await checkHiddenColumnExists();
  
  if (hasHiddenColumn) {
    // 결제 완료된 수업의 경우 모든 기록 조회 (숨겨진 기록 포함)
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        classes(title, subject)
      `)
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .order('attendance_date', { ascending: false });
    
    return { data, error };
  } else {
    // is_hidden 컬럼이 없으면 모든 기록 조회
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        classes(title, subject)
      `)
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .order('attendance_date', { ascending: false });
    
    return { data, error };
  }
}

// 4회 미만 출석 목록을 위한 모든 출석 기록 조회 (숨겨진 기록 포함)
export async function getAllAttendanceRecords(classId, studentId) {
  const hasHiddenColumn = await checkHiddenColumnExists();
  
  if (hasHiddenColumn) {
    // 모든 기록 조회 (숨겨진 기록 포함)
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        classes(title, subject)
      `)
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .order('attendance_date', { ascending: false });
    
    return { data, error };
  } else {
    // is_hidden 컬럼이 없으면 모든 기록 조회
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        classes(title, subject)
      `)
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .order('attendance_date', { ascending: false });
    
    return { data, error };
  }
}

// 출석 기록 숨김 처리
export async function hideAttendanceRecords(recordIds, reason) {
  const hasHiddenColumn = await checkHiddenColumnExists();
  
  if (!hasHiddenColumn) {
    console.log('is_hidden 컬럼이 아직 존재하지 않습니다. 마이그레이션을 실행해주세요.');
    return { success: false, error: 'Column not exists' };
  }
  
  const { error } = await supabase
    .from('attendance_records')
    .update({ 
      is_hidden: true,
      hidden_reason: reason,
      hidden_at: new Date().toISOString()
    })
    .in('id', recordIds);
  
  return { success: !error, error };
}

// 숨겨진 출석 기록 복원
export async function showAttendanceRecords(recordIds) {
  const hasHiddenColumn = await checkHiddenColumnExists();
  
  if (!hasHiddenColumn) {
    console.log('is_hidden 컬럼이 아직 존재하지 않습니다. 마이그레이션을 실행해주세요.');
    return { success: false, error: 'Column not exists' };
  }
  
  const { error } = await supabase
    .from('attendance_records')
    .update({ 
      is_hidden: false,
      hidden_reason: null,
      hidden_at: null
    })
    .in('id', recordIds);
  
  return { success: !error, error };
} 