const { Pool } = require('pg')
//수정완료
const pool = new Pool(
    {
        host: 'localhost',
        user: 'mireutale',
        password: 'mireutale',
        port: 5432,
        database: 'hospital'
    }
)

pool.connect() // 연결되었다면,
    .then(() => console.log("hospital DB와 연결되었습니다."))
    .catch(err => console.error("hospital DB 연결이 실패했습니다.", err.stack));

module.exports = pool;
