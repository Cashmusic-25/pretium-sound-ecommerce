require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// 환경변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 환경변수 확인:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '설정됨' : '설정되지 않음')
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '설정됨' : '설정되지 않음')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 마이그레이션 시작...')
    
    // 1. 현재 테이블 구조 확인
    console.log('📋 현재 테이블 구조 확인 중...')
    
    // 2. enrollment_id 컬럼이 존재하는지 확인
    console.log('🔍 enrollment_id 컬럼 존재 여부 확인...')
    const { data: checkResult, error: checkError } = await supabase
      .from('schedule_change_requests')
      .select('enrollment_id')
      .limit(1)
    
    if (checkError) {
      console.log('enrollment_id 컬럼이 이미 변경되었거나 존재하지 않습니다.')
      console.log('에러:', checkError.message)
      
      // class_student_id 컬럼 확인
      const { data: newCheckResult, error: newCheckError } = await supabase
        .from('schedule_change_requests')
        .select('class_student_id')
        .limit(1)
      
      if (!newCheckError) {
        console.log('✅ class_student_id 컬럼이 이미 존재합니다. 마이그레이션이 완료되었습니다.')
        return
      }
    } else {
      console.log('✅ enrollment_id 컬럼이 존재합니다. 변경을 진행합니다.')
    }
    
    // 3. 컬럼명 변경 실행 (직접 SQL 실행)
    console.log('🔄 enrollment_id → class_student_id로 컬럼명 변경 중...')
    
    // Supabase에서는 직접 ALTER TABLE을 실행할 수 없으므로
    // 대신 테이블을 새로 만들거나 다른 방법을 사용해야 합니다.
    console.log('⚠️ Supabase에서는 직접 ALTER TABLE을 실행할 수 없습니다.')
    console.log('💡 Supabase Dashboard에서 수동으로 실행해주세요:')
    console.log('   ALTER TABLE schedule_change_requests RENAME COLUMN enrollment_id TO class_student_id;')
    
    // 대안: 새 컬럼 추가 후 데이터 복사
    console.log('🔄 대안 방법: 새 컬럼 추가 후 데이터 복사...')
    
    // 1) 새 컬럼 추가
    console.log('1단계: class_student_id 컬럼 추가...')
    const { error: addError } = await supabase
      .rpc('add_column_if_not_exists', {
        table_name: 'schedule_change_requests',
        column_name: 'class_student_id',
        column_type: 'integer'
      })
    
    if (addError) {
      console.log('컬럼 추가 실패 (이미 존재할 수 있음):', addError.message)
    } else {
      console.log('✅ class_student_id 컬럼 추가 완료')
    }
    
    // 2) 데이터 복사
    console.log('2단계: enrollment_id 데이터를 class_student_id로 복사...')
    const { data: allRequests, error: fetchError } = await supabase
      .from('schedule_change_requests')
      .select('id, enrollment_id')
    
    if (fetchError) {
      console.error('데이터 조회 실패:', fetchError)
      return
    }
    
    console.log(`📊 ${allRequests.length}개의 요청 데이터를 복사합니다...`)
    
    for (const request of allRequests) {
      if (request.enrollment_id) {
        const { error: updateError } = await supabase
          .from('schedule_change_requests')
          .update({ class_student_id: request.enrollment_id })
          .eq('id', request.id)
        
        if (updateError) {
          console.error(`요청 ID ${request.id} 업데이트 실패:`, updateError)
        }
      }
    }
    
    console.log('✅ 데이터 복사 완료!')
    console.log('💡 이제 Supabase Dashboard에서 enrollment_id 컬럼을 삭제해주세요.')
    
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error)
  }
}

runMigration() 