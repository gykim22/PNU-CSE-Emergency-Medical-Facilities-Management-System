const bcrypt = require('bcrypt');
const passport = require('passport');
const db = require(process.cwd() + '/models');
// 수정완료

exports.join = async (req, res, next) => {
    console.log("hello");
    const {
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
        const result = await db.query('SELECT * FROM personal_info WHERE phone_number = $1', [phone_number]);
        if (result.rows.length > 0) {
            return res.redirect('/join?error=exist'); // 이미 존재하는 전화번호
        }
        // 비밀번호 해싱
        const hash = await bcrypt.hash(password, 12);

        // 사용자 데이터 삽입
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

        await db.query('INSERT INTO personal_info (phone_number, password, authority) VALUES ($1, $2, $3)', [phone_number, hash, authority_type]);
        if(user_type === "의사")
            await db.query('INSERT INTO Doctor (Role, Year, Salary, State, Name, Gender, Age, Phone_Number, Department) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [role, year, salary, "출근", name, gender, age, phone_number, department]);
        else
            await db.query('INSERT INTO Nurse (Role, Year, Salary, State, Name, Gender, Age, Phone_Number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [role, year, salary, "출근", name, gender, age, phone_number]);
        return res.redirect('/');
    } catch (err) {
        console.error(err);
        return next(err);
    }
};

exports.joinPatient = async (req, res, next) => {
    const {
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
        await db.query('INSERT INTO personal_info (phone_number, password, authority) VALUES ($1, $2, $3)', [phone_number, hash, 4]);
        if(user_type === "환자")
            await db.query('INSERT INTO patient (name, role, gender, age, phone_number, next_of_kin, acuity_level, disease, hospitalization_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [name, user_type, gender, age, phone_number, null, acuity, disease, admission_date]);
        else {
            const pName = await db.query('SELECT name FROM patient WHERE phone_number = $1', [patient_phone]);
            await db.query('INSERT INTO next_of_kin (name, role, gender, phone_number, age, patient_relationship, patient_name, patient_phonenumber) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [name, user_type, gender, phone_number, age, relationship, pName.rows[0].name, patient_phone]);
            await db.query('UPDATE patient SET next_of_kin = $1 WHERE phone_number = $2',[phone_number, patient_phone]);
        }
        return res.redirect('/');
    } catch (err) {
        console.error(err);
        return next(err);
    }
};

exports.login = (req, res, next) => {
    passport.authenticate('local', (authErr, user, info) => {
        if (authErr) {
            console.error(authErr);
            return next(authErr);
        }
        if (!user) {
            return res.redirect(`/?loginError=${info.message}`);
        }
        return req.login(user, (loginErr) => {
            if (loginErr) {
                console.error(loginErr);
                return next(loginErr);
            }
            return res.redirect('/');
        });
    })(req, res, next);
};

exports.logout = (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
};