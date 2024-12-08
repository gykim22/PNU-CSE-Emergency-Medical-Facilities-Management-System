const { Pool } = require('pg') // postgreSQL DB 활용

const pool = new Pool( // DB 정보
    {
        host: 'localhost', // localhost:8001
        user: 'gykim', // 필요 시 수정
        password: '2387', // 필요 시 수정
        port: 5432, // 수정 금지
        database: 'hospital' // 필요 시 수정
    }
)

pool.connect() // DB와 연결되었다면,
    .then(() => console.log("hospital DB와 연결되었습니다."))
    .catch(err => console.error("hospital DB 연결이 실패했습니다.", err.stack));

module.exports = pool;
