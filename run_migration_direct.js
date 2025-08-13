const { createClient } = require('@supabase/supabase-js');

// 환경 변수 확인
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('🚀 attendance_records 테이블에 숨김 처리 컬럼 추가 마이그레이션을 시작합니다...');
    
    // 1. is_hidden 컬럼 추가
    console.log('📝 is_hidden 컬럼 추가 중...');
    const { error: error1 } = await supabase
      .from('attendance_records')
      .select('is_hidden')
      .limit(1);
    
    if (error1 && error1.code === '42703') {
      // 컬럼이 존재하지 않으면 추가
      console.log('is_hidden 컬럼이 존재하지 않습니다. 추가합니다...');
      // 직접 SQL 실행을 위해 raw query 사용
      const { error: addError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE attendance_records ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;'
      });
      
      if (addError) {
        console.error('❌ is_hidden 컬럼 추가 실패:', addError);
        console.log('Supabase Dashboard에서 직접 SQL을 실행해주세요:');
        console.log('ALTER TABLE attendance_records ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;');
        return;
      }
    }
    console.log('✅ is_hidden 컬럼 확인/추가 완료');
    
    // 2. hidden_reason 컬럼 추가
    console.log('📝 hidden_reason 컬럼 추가 중...');
    const { error: error2 } = await supabase
      .from('attendance_records')
      .select('hidden_reason')
      .limit(1);
    
    if (error2 && error2.code === '42703') {
      console.log('hidden_reason 컬럼이 존재하지 않습니다. 추가합니다...');
      const { error: addError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE attendance_records ADD COLUMN hidden_reason TEXT;'
      });
      
      if (addError) {
        console.error('❌ hidden_reason 컬럼 추가 실패:', addError);
        console.log('Supabase Dashboard에서 직접 SQL을 실행해주세요:');
        console.log('ALTER TABLE attendance_records ADD COLUMN hidden_reason TEXT;');
        return;
      }
    }
    console.log('✅ hidden_reason 컬럼 확인/추가 완료');
    
    // 3. hidden_at 컬럼 추가
    console.log('📝 hidden_at 컬럼 추가 중...');
    const { error: error3 } = await supabase
      .from('attendance_records')
      .select('hidden_at')
      .limit(1);
    
    if (error3 && error3.code === '42703') {
      console.log('hidden_at 컬럼이 존재하지 않습니다. 추가합니다...');
      const { error: addError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE attendance_records ADD COLUMN hidden_at TIMESTAMP WITH TIME ZONE;'
      });
      
      if (addError) {
        console.error('❌ hidden_at 컬럼 추가 실패:', addError);
        console.log('Supabase Dashboard에서 직접 SQL을 실행해주세요:');
        console.log('ALTER TABLE attendance_records ADD COLUMN hidden_at TIMESTAMP WITH TIME ZONE;');
        return;
      }
    }
    console.log('✅ hidden_at 컬럼 확인/추가 완료');
    
    console.log('🎉 마이그레이션이 성공적으로 완료되었습니다!');
    console.log('이제 결제 완료 시 출석 기록 숨김 처리 기능이 활성화됩니다.');
    
  } catch (error) {
    console.error('❌ 마이그레이션 실행 중 오류 발생:', error);
    console.log('\n📋 수동으로 Supabase Dashboard에서 다음 SQL을 실행해주세요:');
    console.log(`
-- attendance_records 테이블에 숨김 처리 관련 컬럼 추가
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS hidden_reason TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;
    `);
  }
}

runMigration(); 