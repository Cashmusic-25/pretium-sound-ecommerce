const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeMigration() {
  try {
    console.log('attendance_records 테이블에 숨김 처리 컬럼 추가 마이그레이션을 시작합니다...');
    
    // 마이그레이션 SQL 파일 읽기
    const migrationSQL = fs.readFileSync('./add_attendance_hidden_columns.sql', 'utf8');
    
    // SQL 실행
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('마이그레이션 실행 중 오류 발생:', error);
      return;
    }
    
    console.log('마이그레이션이 성공적으로 완료되었습니다!');
    console.log('추가된 컬럼:');
    console.log('- is_hidden: BOOLEAN (기본값: false)');
    console.log('- hidden_reason: TEXT');
    console.log('- hidden_at: TIMESTAMP WITH TIME ZONE');
    
  } catch (error) {
    console.error('마이그레이션 실행 중 예외 발생:', error);
  }
}

// 환경 변수 확인
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.');
  process.exit(1);
}

executeMigration(); 