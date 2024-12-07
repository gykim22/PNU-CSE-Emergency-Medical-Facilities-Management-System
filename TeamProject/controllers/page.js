const db = require(process.cwd() + '/models');
// 수정완료
exports.renderProfile = (req, res) => {
    res.render('profile', {title: '내 정보 - TODO'});
};

exports.renderState = async (req, res, next) => {
    const { state } = req.body; // 클라이언트에서 받은 출퇴근 상태
    const phoneNumber = req.user.phone_number; // 로그인된 사용자 ID
    try {
        // doctor 테이블에서 존재 여부 확인
        const doctorResult = await db.query('SELECT * FROM doctor WHERE phone_number = $1', [phoneNumber]);
        if (doctorResult.rows.length > 0) {
            // doctor 테이블에서 업데이트
            await db.query('UPDATE doctor SET state = $1 WHERE phone_number = $2', [state, phoneNumber]);
        } else
            await db.query('UPDATE nurse SET state = $1 WHERE phone_number = $2', [state, phoneNumber]);

        // 상태 업데이트 후 성공 페이지로 리다이렉트
        res.redirect('/profile');
    } catch (error) {
        console.error(error);
        next(error); // 오류 발생 시 에러 핸들링 미들웨어로 전달
    }
};

exports.renderJoin = (req, res) => {
    res.render('join', { title: '직원 등록 - TODO' });
};

exports.renderJoinPatient = (req, res) => {
    res.render('joinPatient', { title: '환자 등록 - TODO' });
};

exports.renderMain = async (req, res, next) => {
    try {
        // 게시글 데이터 조회
        const postsResult = await db.query(`
            SELECT p.*, u.id AS userId, u.nick AS userNick, COUNT(pl.postId) AS likes
            FROM posts p
            JOIN users u ON p.userId = u.id
            LEFT JOIN postlikes pl ON p.id = pl.postId
            GROUP BY p.id, u.id
            ORDER BY p.createdAt DESC
        `);
        const posts = postsResult.rows;

        // 각 게시글의 좋아요를 누른 사용자 ID 조회
        const likedUsersPromises = posts.map(async (post) => {
            const likedUsersResult = await db.query(
                'SELECT pl.userId FROM postlikes pl WHERE pl.postId = $1',
                [post.id]
            );
            return likedUsersResult.rows.map((user) => user.userid); // PostgreSQL에서는 컬럼 이름이 소문자로 반환됨
        });

        const likedUsersLists = await Promise.all(likedUsersPromises);

        // 좋아요 정보를 게시글에 추가
        const twits = posts.map((post, index) => ({
            ...post,
            likedusers: likedUsersLists[index],
        }));

        res.render('main', {
            title: 'TODO',
            twits,
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};


exports.renderList = async (req, res, next) => {
    const {
        doctorSort = 'id',
        doctorOrder = 'asc',
        nurseSort = 'id',
        nurseOrder = 'asc',
    } = req.query; // 기본값 설정

    const validSortFields = ['id', 'role', 'year', 'salary', 'state', 'name', 'gender', 'age', 'phone_number', 'department'];
    const validOrders = ['asc', 'desc'];

    try {
        // 잘못된 값 방지
        if (
            !validSortFields.includes(doctorSort) || !validOrders.includes(doctorOrder) ||
            !validSortFields.includes(nurseSort) || !validOrders.includes(nurseOrder)
        ) {
            throw new Error('Invalid sort or order value');
        }

        // 사용자 권한 확인 (병원장만 salary를 볼 수 있음)
        const isAdmin = req.user && req.user.authority === "병원장";
        console.log(isAdmin);
        let doctorQuery;
        let nurseQuery;
        if(isAdmin) {
            doctorQuery =`SELECT
                id AS "ID",
                role AS "Role",
                year AS "Year",
                salary AS "Salary",
                state AS "State",
                name AS "Name",
                gender AS "Gender",
                age AS "Age",
                phone_number AS "PhoneNumber",
                department AS "Department"
            FROM Doctor
            ORDER BY ${doctorSort} ${doctorOrder}`;
            nurseQuery = `SELECT
                id AS "ID",
                role AS "Role",
                year AS "Year",
                salary AS "Salary",
                state AS "State",
                name AS "Name",
                gender AS "Gender",
                age AS "Age",
                phone_number AS "PhoneNumber"
            FROM Nurse
            ORDER BY ${nurseSort} ${nurseOrder}`;
        } else {
            doctorQuery =`SELECT
                id AS "ID",
                role AS "Role",
                year AS "Year",
                state AS "State",
                name AS "Name",
                gender AS "Gender",
                age AS "Age",
                phone_number AS "PhoneNumber",
                department AS "Department"
            FROM Doctor
            ORDER BY ${doctorSort} ${doctorOrder}`;
            nurseQuery = `SELECT
                id AS "ID",
                role AS "Role",
                year AS "Year",
                state AS "State",
                name AS "Name",
                gender AS "Gender",
                age AS "Age",
                phone_number AS "PhoneNumber"
            FROM Nurse
            ORDER BY ${nurseSort} ${nurseOrder}`;
        }

        // Doctor 테이블 정렬
        const doctorResult = await db.query(doctorQuery);

        // Nurse 테이블 정렬
        const nurseResult = await db.query(nurseQuery);

        const doctor = doctorResult.rows;
        const nurse = nurseResult.rows;
        res.render('list', {
            title: '직원 목록',
            doctor,
            nurse,
            currentDoctorSort: doctorSort,
            currentDoctorOrder: doctorOrder,
            currentNurseSort: nurseSort,
            currentNurseOrder: nurseOrder,
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

exports.renderListPatient = async (req, res, next) => {
    const {
        patientSort = 'name',
        patientOrder = 'asc',
        kinSort = 'nok_name',
        kinOrder = 'asc',
    } = req.query; // 기본값 설정

    const validSortFields = ['name', 'nok_name', 'gender', 'age', 'phone_number', 'next_of_kin', 'acuity_level',
        'disease', 'hospitalization_date', 'patient_relationship', 'patient_name', 'patient_phonenumber'];
    const validOrders = ['asc', 'desc'];

    try {
        // 잘못된 값 방지
        if (
            !validSortFields.includes(patientSort) || !validOrders.includes(patientOrder) ||
            !validSortFields.includes(kinSort) || !validOrders.includes(kinOrder)
        ) {
            throw new Error('Invalid sort or order value');
        }

        let patientQuery;
        let kinQuery;

        patientQuery =`SELECT
            name AS "Name",
            gender AS "Gender",
            age AS "Age",
            phone_number AS "PhoneNumber",
            next_of_kin AS "KinNumber",
            acuity_level AS "Acuity",
            disease AS "Disease",
            TO_CHAR(hospitalization_date, 'YYYY-MM-DD') AS "HospitalizationDate"
        FROM patient
        ORDER BY ${patientSort} ${patientOrder}`;

        kinQuery = `SELECT
            nok_name AS "Name",
            gender AS "Gender",
            age AS "Age",
            phone_number AS "PhoneNumber",
            patient_relationship AS "relation",
            patient_name AS "PatientName",
            patient_phonenumber AS "PatientPhoneNumber"
        FROM next_of_kin
        ORDER BY ${kinSort} ${kinOrder}`;

        // patient 테이블 정렬
        const patientResult = await db.query(patientQuery);

        // next_of_kin 테이블 정렬
        const kinResult = await db.query(kinQuery);

        const patient = patientResult.rows;
        const kin = kinResult.rows;
        res.render('listPatient', {
            title: '환자|보호자 목록',
            patient,
            kin,
            currentpatientSort: patientSort,
            currentpatientOrder: patientOrder,
            currentkinSort: kinSort,
            currentkinOrder: kinOrder,
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

exports.renderDeleteStaff = async (req, res, next) => {
    const { phone_number } = req.query; // phone_number 파라미터를 쿼리에서 가져옵니다.

    if (!phone_number)
        return res.status(400).send("전화번호가 제공되지 않았습니다.");

    try {
        const Result = await db.query('SELECT * FROM doctor WHERE phone_number = $1', [phone_number]);
        if (Result.rows.length > 0) {
            await db.query('DELETE FROM doctor WHERE phone_number = $1', [phone_number]);
        } else {
            await db.query('DELETE FROM nurse WHERE phone_number = $1', [phone_number]);
        }

        await db.query('DELETE FROM personal_info WHERE phone_number = $1', [phone_number]);

        // 삭제 후 직원 목록 페이지로 리디렉션
        res.redirect('/list');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

exports.renderDeletePatient = async (req, res, next) => {
    const { phone_number } = req.query; // phone_number 파라미터를 쿼리에서 가져옵니다.

    if (!phone_number)
        return res.status(400).send("전화번호가 제공되지 않았습니다.");

    try {
        const Result = await db.query('SELECT * FROM patient WHERE phone_number = $1', [phone_number]);
        if (Result.rows.length > 0) {
            await db.query('DELETE FROM patient WHERE phone_number = $1', [phone_number]);
        } else {
            await db.query('UPDATE patient SET next_of_kin = $1 WHERE next_of_kin = $2', [null, phone_number]);
            await db.query('DELETE FROM next_of_kin WHERE phone_number = $1', [phone_number]);
        }

        await db.query('DELETE FROM personal_info WHERE phone_number = $1', [phone_number]);

        // 삭제 후 환자 목록 페이지로 리디렉션
        res.redirect('/list-patient');
    } catch (err) {
        console.error(err);
        next(err);
    }
};