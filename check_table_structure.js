require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableStructure() {
  try {
    console.log('🔍 schedule_change_requests 테이블 구조 확인 중...');
    
    // 1. enrollment_id 컬럼 존재 확인
    console.log('\n1️⃣ enrollment_id 컬럼 확인...');
    try {
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('schedule_change_requests')
        .select('enrollment_id')
        .limit(1);
      
      if (enrollmentError) {
        console.log('❌ enrollment_id 컬럼 오류:', enrollmentError.message);
      } else {
        console.log('✅ enrollment_id 컬럼 존재');
      }
    } catch (e) {
      console.log('❌ enrollment_id 컬럼 확인 실패:', e.message);
    }
    
    // 2. class_student_id 컬럼 존재 확인
    console.log('\n2️⃣ class_student_id 컬럼 확인...');
    try {
      const { data: classStudentData, error: classStudentError } = await supabase
        .from('schedule_change_requests')
        .select('class_student_id')
        .limit(1);
      
      if (classStudentError) {
        console.log('❌ class_student_id 컬럼 오류:', classStudentError.message);
      } else {
        console.log('✅ class_student_id 컬럼 존재');
      }
    } catch (e) {
      console.log('❌ class_student_id 컬럼 확인 실패:', e.message);
    }
    
    // 3. 전체 테이블 구조 확인 (모든 컬럼 조회)
    console.log('\n3️⃣ 전체 테이블 구조 확인...');
    try {
      const { data: allData, error: allError } = await supabase
        .from('schedule_change_requests')
        .select('*')
        .limit(1);
      
      if (allError) {
        console.log('❌ 전체 테이블 조회 오류:', allError.message);
      } else {
        console.log('✅ 전체 테이블 조회 성공');
        if (allData.length > 0) {
          console.log('📊 컬럼들:', Object.keys(allData[0]));
        } else {
          console.log('📊 테이블이 비어있음 (컬럼 구조만 확인)');
        }
      }
    } catch (e) {
      console.log('❌ 전체 테이블 조회 실패:', e.message);
    }
    
    // 4. 다른 관련 테이블들 확인
    console.log('\n4️⃣ 관련 테이블들 확인...');
    const relatedTables = ['class_students', 'classes', 'user_profiles'];
    
    for (const table of relatedTables) {
      try {
        const { data: tableData, error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (tableError) {
          console.log(`❌ ${table}: ${tableError.message}`);
        } else {
          console.log(`✅ ${table}: ${tableData.length > 0 ? Object.keys(tableData[0]).join(', ') : '비어있음'}`);
        }
      } catch (e) {
        console.log(`❌ ${table}: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 전체 오류:', error);
  }
}

checkTableStructure(); 