const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 6543, // MCP 서버 포트
  user: 'postgres', // Supabase 대시보드에서 확인한 DB 유저명
  password: '여기에_비밀번호_입력', // Supabase 대시보드에서 확인한 비밀번호
  database: 'postgres', // 기본 DB명
  ssl: false
});

async function main() {
  try {
    // 예시: public 스키마의 아무 테이블이나 조회
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5");
    console.log('테이블 목록:', res.rows);

    // 예시: 실제 데이터 조회 (users 테이블이 있다고 가정)
    // const res2 = await pool.query('SELECT * FROM users LIMIT 5');
    // console.log('users 테이블 일부:', res2.rows);

    await pool.end();
  } catch (err) {
    console.error('쿼리 에러:', err);
  }
}

main();
