-- schedule_change_requests 테이블의 필드명 변경
-- enrollment_id → class_student_id로 변경하여 현재 데이터베이스 구조에 맞춤

ALTER TABLE schedule_change_requests 
RENAME COLUMN enrollment_id TO class_student_id;

-- 변경 후 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'schedule_change_requests'
ORDER BY ordinal_position; 