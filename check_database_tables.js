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

async function checkDatabase() {
  try {
    console.log('🔍 데이터베이스 테이블 구조와 데이터를 확인합니다...\n');
    
    // 1. class_payments 테이블 구조 확인
    console.log('📋 class_payments 테이블 구조:');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'class_payments')
      .order('ordinal_position');
    
    if (columnsError) {
      console.error('❌ class_payments 테이블 구조 조회 실패:', columnsError);
    } else {
      console.table(columns);
    }
    
    // 2. class_payments 테이블 데이터 확인
    console.log('\n📊 class_payments 테이블 데이터:');
    const { data: payments, error: paymentsError } = await supabase
      .from('class_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (paymentsError) {
      console.error('❌ class_payments 데이터 조회 실패:', paymentsError);
    } else {
      if (payments && payments.length > 0) {
        console.log(`총 ${payments.length}개의 결제 기록이 있습니다:`);
        console.table(payments.map(p => ({
          id: p.id,
          class_id: p.class_id,
          student_id: p.student_id,
          payment_status: p.payment_status,
          attendance_count: p.attendance_count,
          payment_completed_date: p.payment_completed_date,
          created_at: p.created_at
        })));
      } else {
        console.log('⚠️ class_payments 테이블에 데이터가 없습니다.');
      }
    }
    
    // 3. attendance_records 테이블 구조 확인
    console.log('\n📋 attendance_records 테이블 구조:');
    const { data: attendanceColumns, error: attendanceColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'attendance_records')
      .order('ordinal_position');
    
    if (attendanceColumnsError) {
      console.error('❌ attendance_records 테이블 구조 조회 실패:', attendanceColumnsError);
    } else {
      console.table(attendanceColumns);
    }
    
    // 4. attendance_records 테이블 데이터 확인
    console.log('\n📊 attendance_records 테이블 데이터:');
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .order('attendance_date', { ascending: false })
      .limit(10);
    
    if (attendanceError) {
      console.error('❌ attendance_records 데이터 조회 실패:', attendanceError);
    } else {
      if (attendanceRecords && attendanceRecords.length > 0) {
        console.log(`총 ${attendanceRecords.length}개의 출석 기록이 있습니다:`);
        console.table(attendanceRecords.map(a => ({
          id: a.id,
          class_id: a.class_id,
          student_id: a.student_id,
          status: a.status,
          attendance_date: a.attendance_date,
          is_hidden: a.is_hidden,
          created_at: a.created_at
        })));
      } else {
        console.log('⚠️ attendance_records 테이블에 데이터가 없습니다.');
      }
    }
    
    // 5. 테이블 존재 여부 확인
    console.log('\n🔍 테이블 존재 여부 확인:');
    const tables = ['class_payments', 'attendance_records', 'classes', 'user_profiles'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', table)
        .eq('table_schema', 'public');
      
      if (error) {
        console.error(`❌ ${table} 테이블 확인 실패:`, error);
      } else {
        if (data && data.length > 0) {
          console.log(`✅ ${table} 테이블이 존재합니다.`);
        } else {
          console.log(`❌ ${table} 테이블이 존재하지 않습니다.`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 데이터베이스 확인 중 오류 발생:', error);
  }
}

checkDatabase(); 