const bcrypt = require('bcrypt');
const passport = require('passport');
const db = require(process.cwd() + '/models');

// 직원등록 모듈
exports.join = async (req, res, next) => {
    const { // 등록하려는 직원의 정보를 쿼리에서 받아옴
        phone_number,
        password,
        authority_type,
        user_type,
        year,
        salary,
        name,
        gender,
        age,
        department
    } = req.body;

    try {
        // 이미 등록된 직원이라면
        const result = await db.query('SELECT * FROM personal_info WHERE phone_number = $1', [phone_number]);
        if (result.rows.length > 0) {
            return res.redirect('/join?error=exist'); // 이미 존재하는 전화번호
        }
        // 비밀번호 해싱 처리
        const hash = await bcrypt.hash(password, 12);

        // 권한에 따른 role 부여
        let role;
        if(authority_type === "1")
            role = "전공교수";
        else if (authority_type === "2")
            role = "수간호사";
        else if (authority_type === "3") {
            if(user_type === "의사")
                role = "의사";
            else
                role = "간호사";
        }

        //personal_info 테이블에 데이터 입력
        await db.query('INSERT INTO personal_info (phone_number, password, authority) VALUES ($1, $2, $3)', [phone_number, hash, authority_type]);
        if(user_type === "의사") // 의사라면
            // 의사 테이블에 해당 인물 정보 작성
            await db.query('INSERT INTO Doctor (Role, Year, Salary, State, Name, Gender, Age, Phone_Number, Department) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [role, year, salary, "출근", name, gender, age, phone_number, department]);
        else // 간호사라면
            // 간호사 테이블에 해당 인물 정보 작성
            await db.query('INSERT INTO Nurse (Role, Year, Salary, State, Name, Gender, Age, Phone_Number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [role, year, salary, "출근", name, gender, age, phone_number]);

        //성공 시 메인 페이지로 리디렉션
        return res.redirect('/');
    } catch (err) {
        console.error(err);
        return next(err);
    }
};

// 환자 | 보호자 등록 모듈
exports.joinPatient = async (req, res, next) => {
    const { // 등록하려는 환자 정보를 쿼리로부터 받아옴.
        user_type,
        gender,
        name,
        age,
        acuity,
        disease,
        admission_date,
        relationship,
        patient_phone,
        phone_number,
        password
    } = req.body;

    try {
        // 이미 등록된 환자 | 보호자일 경우
        const result = await db.query('SELECT * FROM personal_info WHERE phone_number = $1', [phone_number]);
        if (result.rows.length > 0) {
            return res.redirect('/join-patient?error=exist'); // 이미 존재하는 전화번호
        }
        // 비밀번호 해싱
        const hash = await bcrypt.hash(password, 12);
        // 사용자 데이터 삽입
        const check = await db.query('SELECT * FROM personal_info WHERE phone_number = $1', [patient_phone]);
        if (user_type !== "환자" && check.rows.length === 0) {
            return res.redirect('/join-patient?error=none'); // 환자 정보 없음
        }

        // personal_info 테이블에 환자 | 보호자 정보 입력
        await db.query('INSERT INTO personal_info (phone_number, password, authority) VALUES ($1, $2, $3)', [phone_number, hash, 4]);
        if(user_type === "환자") // 환자라면
            // 환자 테이블에 데이터 입력
            await db.query('INSERT INTO patient (name, role, gender, age, phone_number, next_of_kin, acuity_level, disease, hospitalization_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [name, user_type, gender, age, phone_number, null, acuity, disease, admission_date]);
        else { // 보호자라면
            // 보호자 테이블에 정보 입력
            const pName = await db.query('SELECT name FROM patient WHERE phone_number = $1', [patient_phone]);
            await db.query('INSERT INTO next_of_kin (name, role, gender, phone_number, age, patient_relationship, patient_name, patient_phonenumber) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [name, user_type, gender, phone_number, age, relationship, pName.rows[0].name, patient_phone]);
            await db.query('UPDATE patient SET next_of_kin = $1 WHERE phone_number = $2',[phone_number, patient_phone]);
        }

        //성공 시 메인 페이지로 리디렉션
        return res.redirect('/');
    } catch (err) {
        console.error(err);
        return next(err);
    }
};

// 로그인 모듈
exports.login = (req, res, next) => {
    passport.authenticate('local', (authErr, user, info) => {
        if (authErr) {
            console.error(authErr);
            return next(authErr);
        }
        if (!user) { // 사용자 정보가 없을 시 오류 페이지 리디렉션
            return res.redirect(`/?loginError=${info.message}`);
        }
        return req.login(user, (loginErr) => {
            if (loginErr) {
                console.error(loginErr);
                return next(loginErr);
            }

            // 로그인 성공 시 메인 페이지로 리디렉션
            return res.redirect('/');
        });
    })(req, res, next);
};

// 로그아웃 모듈
exports.logout = (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
};