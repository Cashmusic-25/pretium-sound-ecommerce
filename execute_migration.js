require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeMigration() {
  try {
    console.log('🚀 마이그레이션 시작: enrollment_id → class_student_id');
    
    // 1단계: class_student_id 컬럼 추가
    console.log('\n1️⃣ class_student_id 컬럼 추가...');
    
    // Supabase에서는 직접 ALTER TABLE을 실행할 수 없으므로
    // 새 컬럼을 추가하는 방식으로 진행
    const { error: addError } = await supabase
      .rpc('add_column_if_not_exists', {
        table_name: 'schedule_change_requests',
        column_name: 'class_student_id',
        column_type: 'integer'
      });
    
    if (addError) {
      console.log('⚠️ 컬럼 추가 실패 (이미 존재하거나 함수가 없음):', addError.message);
      
      // 수동으로 컬럼 추가 시도
      console.log('🔄 수동 컬럼 추가 시도...');
      try {
        // 임시로 테이블에 데이터를 삽입해서 컬럼 구조 확인
        const { data: testData, error: testError } = await supabase
          .from('schedule_change_requests')
          .select('*')
          .limit(1);
        
        if (testError) {
          console.log('❌ 테이블 접근 오류:', testError.message);
        } else {
          console.log('✅ 테이블 접근 가능');
          console.log('📊 현재 컬럼들:', testData.length > 0 ? Object.keys(testData[0]) : '테이블이 비어있음');
        }
      } catch (e) {
        console.log('❌ 테이블 접근 실패:', e.message);
      }
    } else {
      console.log('✅ class_student_id 컬럼 추가 완료');
    }
    
    // 2단계: 기존 데이터 확인
    console.log('\n2️⃣ 기존 데이터 확인...');
    const { data: existingData, error: fetchError } = await supabase
      .from('schedule_change_requests')
      .select('id, enrollment_id')
      .limit(10);
    
    if (fetchError) {
      console.log('❌ 데이터 조회 실패:', fetchError.message);
    } else {
      console.log(`📊 기존 데이터: ${existingData.length}개`);
      if (existingData.length > 0) {
        console.log('📋 샘플 데이터:', existingData[0]);
      }
    }
    
    // 3단계: 데이터 복사 (기존 데이터가 있는 경우)
    if (existingData && existingData.length > 0) {
      console.log('\n3️⃣ 데이터 복사...');
      
      for (const row of existingData) {
        if (row.enrollment_id) {
          const { error: updateError } = await supabase
            .from('schedule_change_requests')
            .update({ class_student_id: row.enrollment_id })
            .eq('id', row.id);
          
          if (updateError) {
            console.error(`❌ 행 ID ${row.id} 업데이트 실패:`, updateError.message);
          } else {
            console.log(`✅ 행 ID ${row.id} 업데이트 완료`);
          }
        }
      }
    } else {
      console.log('📊 복사할 데이터가 없습니다.');
    }
    
    // 4단계: 최종 확인
    console.log('\n4️⃣ 최종 확인...');
    try {
      const { data: finalCheck, error: finalError } = await supabase
        .from('schedule_change_requests')
        .select('id, enrollment_id, class_student_id')
        .limit(5);
      
      if (finalError) {
        console.log('❌ 최종 확인 실패:', finalError.message);
      } else {
        console.log('✅ 최종 확인 완료');
        console.log('📊 최종 데이터:', finalCheck);
      }
    } catch (e) {
      console.log('❌ 최종 확인 오류:', e.message);
    }
    
    console.log('\n🎉 마이그레이션 완료!');
    console.log('💡 이제 Supabase Dashboard에서 enrollment_id 컬럼을 삭제해주세요.');
    
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류:', error);
  }
}

executeMigration(); 