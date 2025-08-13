# 출석 기록 숨김 처리 기능 마이그레이션

## 개요
결제 완료 시 출석 기록을 숨기는 기능을 위해 `attendance_records` 테이블에 새로운 컬럼을 추가해야 합니다.

## 추가할 컬럼
- `is_hidden`: BOOLEAN (기본값: false) - 숨김 처리 여부
- `hidden_reason`: TEXT - 숨김 처리 사유
- `hidden_at`: TIMESTAMP WITH TIME ZONE - 숨김 처리 시간

## 마이그레이션 실행 방법

### 방법 1: Supabase Dashboard에서 직접 실행
1. Supabase Dashboard에 로그인
2. 프로젝트 선택
3. SQL Editor로 이동
4. 다음 SQL을 실행:

```sql
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
```

### 방법 2: Supabase CLI 사용
```bash
# Supabase CLI 설치 (아직 설치하지 않은 경우)
npm install -g supabase

# 로그인
supabase login

# 마이그레이션 실행
supabase db push
```

### 방법 3: 간단한 Node.js 스크립트 사용 (권장)
```bash
# 환경 변수 설정 확인
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# 마이그레이션 실행
node run_migration_simple.js
```

### 방법 4: 기존 Node.js 스크립트 사용
```bash
# 환경 변수 설정 확인
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# 마이그레이션 실행
node execute_attendance_hidden_migration.js
```

## 마이그레이션 완료 후

마이그레이션이 완료되면 다음 기능들이 활성화됩니다:

1. **결제 완료 시**: 가장 날짜가 빠른 출석 기록부터 결제된 횟수만큼 자동으로 숨김 처리
2. **결제 취소 시**: 숨겨진 출석 기록이 자동으로 복원
3. **출석 내역 조회 시**: 숨겨진 기록은 제외하고 표시

## 확인 방법

마이그레이션이 성공적으로 완료되었는지 확인:

```sql
-- 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position;
```

다음 컬럼들이 추가되어 있어야 합니다:
- `is_hidden`
- `hidden_reason` 
- `hidden_at` 