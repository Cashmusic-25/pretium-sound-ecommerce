-- attendance_records 테이블에 숨김 처리 관련 컬럼 추가
-- 결제 완료 시 출석 기록을 숨기기 위한 기능

-- is_hidden 컬럼 추가 (기본값: false)
ALTER TABLE attendance_records 
ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;

-- hidden_reason 컬럼 추가 (숨김 처리 사유)
ALTER TABLE attendance_records 
ADD COLUMN hidden_reason TEXT;

-- hidden_at 컬럼 추가 (숨김 처리 시간)
ALTER TABLE attendance_records 
ADD COLUMN hidden_at TIMESTAMP WITH TIME ZONE;

-- 변경 후 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position; 