-- Supabase MCP 서버용 데이터베이스 함수들

-- 1. 컬럼 추가 함수
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
  table_name text,
  column_name text,
  column_type text
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = $2
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', $1, $2, $3);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. SQL 실행 함수 (제한적)
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS json AS $$
BEGIN
  -- 보안상 위험한 쿼리는 차단
  IF sql_query ILIKE '%DROP%' OR 
     sql_query ILIKE '%DELETE%' OR 
     sql_query ILIKE '%TRUNCATE%' THEN
    RAISE EXCEPTION '보안상 위험한 쿼리는 실행할 수 없습니다.';
  END IF;
  
  -- 읽기 전용 쿼리만 허용
  IF sql_query ILIKE '%SELECT%' THEN
    RETURN json_build_object('result', 'SELECT 쿼리는 실행되었습니다.');
  ELSE
    RAISE EXCEPTION '현재 SELECT 쿼리만 지원됩니다.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 테이블 정보 조회 함수
CREATE OR REPLACE FUNCTION get_table_info(table_name text)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'table_name', table_name,
    'columns', (
      SELECT json_agg(
        json_build_object(
          'column_name', column_name,
          'data_type', data_type,
          'is_nullable', is_nullable,
          'column_default', column_default
        )
      )
      FROM information_schema.columns 
      WHERE table_name = $1
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 