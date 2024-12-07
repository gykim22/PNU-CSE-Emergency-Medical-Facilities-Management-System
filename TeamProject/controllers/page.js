const db = require(process.cwd() + '/models');
// 수정완료
exports.renderProfile = async (req, res, next) => {
    const {
        mySort = 'pt.name',
        myOrder = 'asc',
    } = req.query; // 기본값 설정

    const staffPhoneNumber = req.user.phone_number;
    let count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
    count = count.rows.length;

    let prescriptionQuery = `SELECT 
            pt.name AS "PatientName",
            p.phone_number AS "patientPhoneNumber",
            pt.age AS "PatientAge",
            d.name AS "DoctorName",
            pt.gender AS "PatientGender",
            pt.disease AS "PatientDisease",
            pt.acuity_level AS "PatientAcuityLevel",
            p.prescription AS "PatientPrescription"
        FROM 
            prescription p
        JOIN 
            patient pt ON p.phone_number = pt.phone_number
        LEFT JOIN 
            doctor d ON p.doctor_in_charge = d.phone_number
        WHERE 
            p.doctor_in_charge = $1
        ORDER BY ${mySort} ${myOrder}`;
    try {
        const prescriptionResult = await db.query(prescriptionQuery, [staffPhoneNumber]);
        const patientResult = await db.query(`
            SELECT 
                p.prescription AS prescription, 
                p.doctor_in_charge, 
                d.name AS doctor_name,
                pt.name AS patient_name,
                pt.age AS patient_age,
                pt.gender AS patient_gender,
                pt.disease AS patient_disease,
                TO_CHAR(pt.hospitalization_date, 'YYYY-MM-DD') AS patient_hospitalization_date
            FROM 
                prescription p
            LEFT JOIN 
                doctor d ON p.doctor_in_charge = d.phone_number
            LEFT JOIN 
                patient pt ON p.phone_number = pt.phone_number
            WHERE 
                p.phone_number = $1
        `, [staffPhoneNumber]);

        const kinResult = await db.query(`
            SELECT 
                pt.name AS patient_name,
                pt.age AS patient_age,
                pt.gender AS patient_gender,
                pt.disease AS patient_disease,
                TO_CHAR(pt.hospitalization_date, 'YYYY-MM-DD') AS patient_hospitalization_date
            FROM 
                patient pt
            WHERE 
                pt.next_of_kin = $1
        `, [staffPhoneNumber]);
        const prescription = prescriptionResult.rows;
        const pre = patientResult.rows;
        const kin = kinResult.rows;
        res.render('profile', {
            title: '내 정보',
            prescription,
            pre,
            kin,
            count,
            currentmySort: mySort,
            currentmyOrder: myOrder
        });
    } catch (err) {
        console.error(err);
        next(err);
    }


};

exports.renderState = async (req, res, next) => {
    const {state} = req.body; // 클라이언트에서 받은 출퇴근 상태
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

exports.renderJoin = async (req, res) => {
    let staffPhoneNumber;
    let count;
    if(req.user) {
        staffPhoneNumber = req.user.phone_number;
        count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
        count = count.rows.length;
    }
    res.render('join', {title: '직원 등록 - TODO', count});
};

exports.renderJoinPatient = async (req, res) => {
    let staffPhoneNumber;
    let count;
    if(req.user) {
        staffPhoneNumber = req.user.phone_number;
        count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
        count = count.rows.length;
    }
    res.render('joinPatient', {title: '환자 등록 - TODO',
        count});
};

exports.renderMain = async (req, res, next) => {
    try {
        let staffPhoneNumber;
        let count;
        if(req.user) {
            staffPhoneNumber = req.user.phone_number;
            count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
            count = count.rows.length;
        }
        res.render('main', {
            title: 'TODO',
            count
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

    let staffPhoneNumber;
    let count;
    if(req.user) {
        staffPhoneNumber = req.user.phone_number;
        count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
        count = count.rows.length;
    }

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
        if (isAdmin) {
            doctorQuery = `SELECT
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
            doctorQuery = `SELECT
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
            count,
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
        kinSort = 'name',
        kinOrder = 'asc',
    } = req.query; // 기본값 설정

    let staffPhoneNumber;
    let count;
    if(req.user) {
        staffPhoneNumber = req.user.phone_number;
        count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
        count = count.rows.length;
    }

    const validSortFields = ['name', 'name', 'gender', 'age', 'phone_number', 'next_of_kin', 'acuity_level',
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

        patientQuery = `SELECT
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
            name AS "Name",
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
            count,
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
    const {phone_number} = req.query; // phone_number 파라미터를 쿼리에서 가져옵니다.

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
    const {phone_number} = req.query; // phone_number 파라미터를 쿼리에서 가져옵니다.

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

exports.renderUpdateStaff = async (req, res, next) => {
    const {
        phone_number,
        user_type,
        authority_type,
        gender,
        year,
        salary,
        name,
        age,
        department // nurse는 제외.
    } = req.body;

    if (!phone_number || !authority_type || !gender || !year || !salary || !name || !age) {
        return res.status(400).send('필수 항목이 누락되었습니다.');
    }

    try {
        let role;
        if (authority_type === "0")
            role = "병원장";
        else if (authority_type === "1")
            role = "전공교수";
        else if (authority_type === "2")
            role = "수간호사";
        else if (authority_type === "3") {
            if (user_type === "의사")
                role = "의사";
            else
                role = "간호사";
        }
        if (user_type === "의사" || user_type === "전공교수" || user_type === "병원장") {
            await db.query(`UPDATE doctor 
                SET 
                    role = $1, 
                    year = $2, 
                    salary = $3, 
                    state = $4, 
                    name = $5, 
                    gender = $6, 
                    age = $7,
                    phone_number = $8,
                    department = $9  
                WHERE phone_number = $10
                `,
                [role, year, salary, "출근", name, gender, age, phone_number, department, phone_number]
            );
        } else {
            await db.query(`UPDATE nurse
                SET 
                    role = $1, 
                    year = $2, 
                    salary = $3, 
                    state = $4, 
                    name = $5, 
                    gender = $6, 
                    age = $7,
                    phone_number = $8
                WHERE phone_number = $9
                `,
                [role, year, salary, "출근", name, gender, age, phone_number, phone_number]
            );
        }
        await db.query('UPDATE personal_info SET authority = $1 WHERE phone_number = $2', [authority_type, phone_number]);
        return res.redirect('/list');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

exports.renderUpdatePatient = async (req, res, next) => {
    const {
        phone_number,
        name,
        age,
        gender,
        acuity, // 환자
        disease, // 환자
        admission_date, // 환자
        relationship, // 보호자
        patient_phone, // 보호자
    } = req.body;

    if (!phone_number || !gender || !name || !age) {
        return res.status(400).send('필수 항목이 누락되었습니다.');
    }

    try {
        const Result = await db.query('SELECT * FROM patient WHERE phone_number = $1', [phone_number]);
        if (Result.rows.length > 0) {
            await db.query(`UPDATE patient 
                SET 
                    name= $1, 
                    gender = $2, 
                    age = $3, 
                    acuity_level = $4, 
                    disease = $5, 
                    hospitalization_date = $6  
                WHERE phone_number = $7
                `,
                [name, gender, age, acuity, disease, admission_date, phone_number]
            );
        } else {
            const p_name = await db.query('SELECT name FROM patient WHERE phone_number = $1', [patient_phone]);
            if (p_name.rows.length === 0) {
                return res.status(400).send('본 병원에 해당 환자는 없습니다.');
            }
            const tmp = await db.query('SELECT name FROM patient WHERE next_of_kin = $1', [phone_number]);
            if (tmp.rows.length === 1) {
                await db.query(`UPDATE patient 
                SET next_of_kin = $1 
                WHERE next_of_kin = $2`, [null, phone_number]);
            }

            await db.query(`UPDATE next_of_kin 
                SET 
                    name= $1, 
                    gender = $2, 
                    age = $3, 
                    patient_relationship = $4, 
                    patient_name = $5,
                    patient_phonenumber = $6 
                WHERE phone_number = $7
                `,
                [name, gender, age, relationship, p_name.rows[0].name, patient_phone, phone_number]
            );
            await db.query(`UPDATE patient 
                SET 
                    next_of_kin = $1 WHERE phone_number = $2
                `,
                [phone_number, patient_phone]
            );
        }
        return res.redirect('/list-patient');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

exports.renderPrescriptionPatient = async (req, res, next) => {
    const {
        patientSort = 'name',
        patientOrder = 'asc',
        mySort = 'pt.name',
        myOrder = 'asc',
    } = req.query; // 기본값 설정

    const staffPhoneNumber = req.user.phone_number;


    let count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
    count = count.rows.length;


    const validSortFields = ['name', 'gender', 'age', 'phone_number', 'next_of_kin', 'acuity_level',
        'disease', 'hospitalization_date'];
    const validOrders = ['asc', 'desc'];

    try {
        // 잘못된 값 방지
        if (
            !validSortFields.includes(patientSort) || !validOrders.includes(patientOrder)
        ) {
            throw new Error('Invalid sort or order value');
        }

        let patientQuery;
        let prescriptionQuery;

        patientQuery = `SELECT
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

        prescriptionQuery = `SELECT 
            pt.name AS "PatientName",
            pt.age AS "PatientAge",
            pt.gender AS "PatientGender",
            pt.disease AS "PatientDisease",
            pt.acuity_level AS "PatientAcuityLevel",
            d.name AS "DoctorName",
            p.phone_number As "PhoneNumber",
            p.prescription AS "Prescription"
        FROM 
            prescription p
        JOIN 
            patient pt ON p.phone_number = pt.phone_number
        LEFT JOIN 
            doctor d ON p.doctor_in_charge = d.phone_number
        WHERE 
            p.doctor_in_charge = $1
        ORDER BY ${mySort} ${myOrder}`;

        // patient 테이블 정렬
        const patientResult = await db.query(patientQuery);
        // prescription 테이블 정렬
        const prescriptionResult = await db.query(prescriptionQuery, [staffPhoneNumber]);

        const patient = patientResult.rows;
        const prescription = prescriptionResult.rows;

        res.render('prescription', {
            title: '처방 목록',
            patient,
            prescription,
            count,
            currentpatientSort: patientSort,
            currentpatientOrder: patientOrder,
            currentmySort: mySort,
            currentmyOrder: myOrder
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

exports.renderGetPatient = async (req, res, next) => {
    const {phone_number} = req.query;
    const staffPhoneNumber = req.user.phone_number;
    try {
        const isHere = await db.query('SELECT * FROM prescription WHERE phone_number = $1', [phone_number]);
        const isMax = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
        if (isHere.rows.length === 0 && isMax.rows.length <= 5) {
            await db.query('INSERT INTO prescription (phone_number, doctor_in_charge, prescription) VALUES ($1, $2, $3)', [phone_number, staffPhoneNumber, "내용 없음."]);
        }
        return res.redirect('/prescription');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

exports.renderWritePrescription = async (req, res, next) => {
    const {
        phone_number,
        prescriptionField
    } = req.body;
    try {
        await db.query('UPDATE prescription SET prescription = $1 WHERE phone_number = $2', [prescriptionField, phone_number]);
        return res.redirect('/prescription');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

exports.renderDeletePrescription = async (req, res, next) => {
    const {phone_number} = req.query;
    try {
        await db.query('DELETE FROM prescription WHERE phone_number = $1', [phone_number]);
        return res.redirect('/prescription');
    } catch (err) {
        console.error(err);
        next(err);
    }
};