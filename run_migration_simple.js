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
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;'
    });
    
    if (error1) {
      console.error('❌ is_hidden 컬럼 추가 실패:', error1);
      return;
    }
    console.log('✅ is_hidden 컬럼 추가 완료');
    
    // 2. hidden_reason 컬럼 추가
    console.log('📝 hidden_reason 컬럼 추가 중...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS hidden_reason TEXT;'
    });
    
    if (error2) {
      console.error('❌ hidden_reason 컬럼 추가 실패:', error2);
      return;
    }
    console.log('✅ hidden_reason 컬럼 추가 완료');
    
    // 3. hidden_at 컬럼 추가
    console.log('📝 hidden_at 컬럼 추가 중...');
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;'
    });
    
    if (error3) {
      console.error('❌ hidden_at 컬럼 추가 실패:', error3);
      return;
    }
    console.log('✅ hidden_at 컬럼 추가 완료');
    
    // 4. 테이블 구조 확인
    console.log('🔍 테이블 구조 확인 중...');
    const { data: columns, error: error4 } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'attendance_records'
        ORDER BY ordinal_position;
      `
    });
    
    if (error4) {
      console.error('❌ 테이블 구조 확인 실패:', error4);
    } else {
      console.log('📊 attendance_records 테이블 구조:');
      console.table(columns);
    }
    
    console.log('🎉 마이그레이션이 성공적으로 완료되었습니다!');
    console.log('이제 결제 완료 시 출석 기록 숨김 처리 기능이 활성화됩니다.');
    
  } catch (error) {
    console.error('❌ 마이그레이션 실행 중 오류 발생:', error);
  }
}

runMigration(); 