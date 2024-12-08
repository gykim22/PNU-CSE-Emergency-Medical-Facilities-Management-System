const db = require(process.cwd() + '/models');

// 프로필 페이지를 랜더링하는 모듈
exports.renderProfile = async (req, res, next) => {
    const { // 정렬 기준
        mySort = 'pt.name',     // 기본 정렬 필드 기준 == 이름
        myOrder = 'asc',        // 오름차순
    } = req.query;                      // 기본값 설정

    const staffPhoneNumber = req.user.phone_number; // 랜더링을 요청하는 로그인 된 사용자의 전화번호 데이터
    // [의사직군] 처방 테이블로부터 자신이 담당하는 환자 row를 가져오기 위한 query.
    let count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
    count = count.rows.length; // [의사직군] 자신이 담당하는 환자의 수

    // [의사직군] 자신이 담당하는 환자의 정보를 프로필에 띄우기 위해 데이터를 가져오는 쿼리
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
            p.doctor_in_charge = $1  -- [의사직군] 자신이 담당하는 환자의 정보를 가져오기 위해 비교
        ORDER BY ${mySort} ${myOrder}`;
    try {
        const prescriptionResult = await db.query(prescriptionQuery, [staffPhoneNumber]); // [의사직군] 자신이 담당하는 환자의 정보를 가져오기 위해 비교
        // [환자] 프로필 페이지 랜더링 요청이 환자로부터 들어올 경우, 자신의 프로필 및 전담의, 처방전을 확인할 수 있도록
        // 정보를 요청하는 쿼리
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
        `, [staffPhoneNumber]); // [환자] 여기서의 staffPhoneNumber에는 프로필 페이지 랜더링을 요청한 환자의 번호가 들어있음.

        // [보호자] 프로필 페이지 랜더링 요청이 환자로부터 들어올 경우, 자신의 환자 프로필을 확인할 수 있도록 정보를 요청하는 쿼리
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
            prescription,   // 보호자용 처방 데이터
            pre,            // 의사 | 환자 용 프로필 데이터
            kin,            // 보호자 용 프로필 데이터
            count,          // 의사 용 전담 환자 명수
            currentmySort: mySort,  // 현재 sorting 정보
            currentmyOrder: myOrder // 현재 정렬 방법 정보 asc, desc
        });
    } catch (err) {
        console.error(err);
        next(err);
    }


};

// 레이아웃에 출퇴근 상태를 출력하는 모듈
exports.renderState = async (req, res, next) => {
    const {state} = req.body; // 클라이언트에서 받은 출퇴근 상태
    const phoneNumber = req.user.phone_number; // 현재 로그인된 사용자 ID
    try {
        // doctor 테이블에서 해당 전화번호 존재 여부 확인
        const doctorResult = await db.query('SELECT * FROM doctor WHERE phone_number = $1', [phoneNumber]);
        if (doctorResult.rows.length > 0) { // 있다면,
            // doctor 테이블에서 해당 인물을 찾아 출근 정보(state) 업데이트
            await db.query('UPDATE doctor SET state = $1 WHERE phone_number = $2', [state, phoneNumber]);
        } else // 없다면 해당 사용자는 의사가 아닌, 간호사 직군이므로, nurse 테이블에서 해당 인물을 찾아 출근 정보(state)를 업데이트 함
            await db.query('UPDATE nurse SET state = $1 WHERE phone_number = $2', [state, phoneNumber]);

        // 상태 업데이트 후 기존 프로필 페이지로 리다이렉트
        res.redirect('/profile');
    } catch (error) {
        console.error(error);
        next(error); // 오류 발생 시 에러 핸들링 미들웨어로 전달
    }
};

// 직원 등록 페이지 랜더링 모듈
exports.renderJoin = async (req, res) => {
    let staffPhoneNumber;
    let count;
    if(req.user) {  // [의사직군] 로그인 된 상태라면, 레이아웃의 담당 환자 수에 환자 명수를 출력하기 위한 데이터를 요청하는 쿼리
                    // join페이지와 실질적인 관계는 없으나, layout 페이지가 항상 표시되므로, 해당 레이아웃에 담당 환자 명수 출력을 위한 코드.
        staffPhoneNumber = req.user.phone_number;   // 해당 인물 전화번호
        count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
        count = count.rows.length;  // 해당 사용자(의사)가 돌보고 있는 환자 수
    }
    res.render('join', {title: '직원 등록', count});
};

// 환자 등록 페이지 랜더링 모듈
exports.renderJoinPatient = async (req, res) => {
    let staffPhoneNumber;
    let count;
    if(req.user) {  // [의사직군] 로그인 된 상태라면, 레이아웃의 담당 환자 수에 환자 명수를 출력하기 위한 데이터를 요청하는 쿼리
                    // join-patient 페이지와 실질적인 관계는 없으나, layout 페이지가 항상 표시되므로, 해당 레이아웃에 담당 환자 명수 출력을 위한 코드.
        staffPhoneNumber = req.user.phone_number;
        count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
        count = count.rows.length;
    }
    res.render('joinPatient', {title: '환자 등록',
        count});
};

// 메인 페이지 랜더링 모듈
exports.renderMain = async (req, res, next) => {
    try {
        let staffPhoneNumber;
        let count;
        if(req.user) {  // [의사직군] 로그인 된 상태라면, 레이아웃의 담당 환자 수에 환자 명수를 출력하기 위한 데이터를 요청하는 쿼리
                        // main 페이지와 실질적인 관계는 없으나, layout 페이지가 항상 표시되므로, 해당 레이아웃에 담당 환자 명수 출력을 위한 코드.
            staffPhoneNumber = req.user.phone_number;
            count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
            count = count.rows.length;
        }
        res.render('main', { // 메인 페이지 랜더링
            title: '메인 페이지',
            count
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 직원 리스트 페이지 랜더링 모듈
exports.renderList = async (req, res, next) => {
    const {     // 헤더 클릭 시 정렬 기능을 위한 변수모음.
        doctorSort = 'id',
        doctorOrder = 'asc',
        nurseSort = 'id',
        nurseOrder = 'asc',
    } = req.query; // 쿼리로 부터 정렬 기준 및 방식 assign.

    const validSortFields = ['id', 'role', 'year', 'salary', 'state', 'name', 'gender', 'age', 'phone_number', 'department'];
    const validOrders = ['asc', 'desc'];

    let staffPhoneNumber;
    let count;
    if(req.user) {  // [의사직군] 로그인 된 상태라면, 레이아웃의 담당 환자 수에 환자 명수를 출력하기 위한 데이터를 요청하는 쿼리
                    // 직원 리스트 페이지와 실질적인 관계는 없으나, layout 페이지가 항상 표시되므로, 해당 레이아웃에 담당 환자 명수 출력을 위한 코드.
        staffPhoneNumber = req.user.phone_number;
        count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
        count = count.rows.length;
    }

    try {
        // 잘못된 기준 값 assign 방지
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
        if (isAdmin) { // 직원 리스트 페이지를 열람하는 사용자가 "병원장"일 경우, 아래 쿼리 활용
            // 의사 리스트 쿼리. salary를 포함한 모든 데이터를 가져옴.
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
            // 간호사 리스트 쿼리. salary를 포함한 모든 데이터를 가져옴.
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

        } else { // 직원 페이지를 열람하는 사용자가 "병원장"이 아닌, "의사 | 간호사 | 전공교수 | 수간호사"일 경우
            // 의사 리스트 쿼리. salary를 제외한 모든 데이터를 가져옴.
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

            // 간호사 리스트 쿼리. salary를 제외한 모든 데이터를 가져옴.
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
        res.render('list', { // 리스트 페이지 랜더링
            title: '직원 목록',
            doctor,     // 의사 리스트 데이터
            nurse,      // 간호사 리스트 데이터
            count,      // [의사]레이아웃에 표시될 담담 환자 수
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

// 환자 리스트 페이지 랜더링
exports.renderListPatient = async (req, res, next) => {
    const {         // 헤더 클릭 시 정렬 기능을 위한 변수모음.
        patientSort = 'acuity_level', // 위험도 기준으로 선정렬
        patientOrder = 'desc',
        kinSort = 'name',
        kinOrder = 'asc',
    } = req.query; // 쿼리로 부터 정렬 기준 및 방식 assign.

    let staffPhoneNumber;
    let count;
    if(req.user) {  // [의사직군] 로그인 된 상태라면, 레이아웃의 담당 환자 수에 환자 명수를 출력하기 위한 데이터를 요청하는 쿼리
                    // 직원 리스트 페이지와 실질적인 관계는 없으나, layout 페이지가 항상 표시되므로, 해당 레이아웃에 담당 환자 명수 출력을 위한 코드.
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
        // 환자 리스트 데이터를 요청하기 위한 쿼리
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

        // 보호자 리스트 데이터를 요청하기 위한 쿼리
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
            patient,    // 환자 리스트 데이터
            kin,        // 보호자 리스트 데이터
            count,      // [의사]레이아웃에 표시될 담담 환자 수
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

// 직원 삭제 기능 모듈
exports.renderDeleteStaff = async (req, res, next) => {
    const {phone_number} = req.query; // 삭제하고자 하는 직원의 번호를 파라미터로부터 가져옴.

    if (!phone_number)
        return res.status(400).send("전화번호가 제공되지 않았습니다.");

    try {       // 해당 직원이 의사인지, 간호사인지 판별하는 구문
        const Result = await db.query('SELECT * FROM doctor WHERE phone_number = $1', [phone_number]);
        if (Result.rows.length > 0) { // 만약 의사라면,
            await db.query('DELETE FROM doctor WHERE phone_number = $1', [phone_number]); // 의사 테이블에서 해당인물 삭제
        } else {    // 간호사라면,
            await db.query('DELETE FROM nurse WHERE phone_number = $1', [phone_number]); // 간호사 테이블에서 해당인물 삭제
        }
        // personal_info 테이블에서 최종적으로 해당인물 삭제
        await db.query('DELETE FROM personal_info WHERE phone_number = $1', [phone_number]);

        // 삭제 후 직원 목록 페이지로 리디렉션
        res.redirect('/list');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

//환자 삭제 기능 모듈
exports.renderDeletePatient = async (req, res, next) => {
    const {phone_number} = req.query; // 삭제할 환자의 전화번호를 쿼리에서 가져옴.

    if (!phone_number)
        return res.status(400).send("전화번호가 제공되지 않았습니다.");

    try {   // 해당 인물이 환자인지, 보호자인지 판별하는 구문.
        const Result = await db.query('SELECT * FROM patient WHERE phone_number = $1', [phone_number]);
        let kinNum;
        if (Result.rows.length > 0) {   // 환자라면,
            kinNum = await db.query('SELECT next_of_kin FROM patient WHERE phone_number = $1', [phone_number]);
            kinNum = kinNum.rows[0].next_of_kin;    // 환자에게 연결된 보호자가 있다면, 해당 보호자의 전화번호 저장
            await db.query('DELETE FROM patient WHERE phone_number = $1', [phone_number]); // 환자 테이블에서 해당인물 삭제
        } else {    // 보호자라면,
            await db.query('UPDATE patient SET next_of_kin = $1 WHERE next_of_kin = $2', [null, phone_number]); // 환자 테이블에서 보호자 전화번호 삭제
            await db.query('DELETE FROM next_of_kin WHERE phone_number = $1', [phone_number]); // 보호자 테이블에서 해당인물 삭제
        }
        if(kinNum)  // 환자 삭제 시, 해당 환자에게 등록된 보호자가 존재한다면,
            await db.query('DELETE FROM personal_info WHERE phone_number = $1', [kinNum]);  // personal_info에서 보호자 정보 삭제
        await db.query('DELETE FROM personal_info WHERE phone_number = $1', [phone_number]); // personal_info에서 해당 인물 삭제.

        // 삭제 후 환자 목록 페이지로 리디렉션
        res.redirect('/list-patient');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 직원 정보 수정 기능 모듈
exports.renderUpdateStaff = async (req, res, next) => {
    let {   // 쿼리로부터 해당 인물의 수정된 데이터 정보를 받아옴.
        phone_number,
        user_type,
        authority_type,
        gender,
        year,
        salary,
        name,
        age,
        department // nurse는 해당 필드가 없으므로 제외함.
    } = req.body;

    if (!phone_number || !authority_type || !gender || !year || !name || !age) {
        return res.status(400).send('필수 항목이 누락되었습니다.');
    }

    if(!salary){    // 병원장이 아닌 사람이 수정했을 시, 연봉 필드가 누락되어 입력되므로
        let salaryData = await db.query(`SELECT salary FROM doctor WHERE phone_number = $1`, [phone_number]);
        if(salaryData.rows.length > 0) {
            salary = salaryData.rows[0].salary; // 해당 인물이 의사라면, 해당 인물의 연봉 정보를 DB에서 읽어와 기존 그대로 적용
        } else {
            salaryData = await db.query(`SELECT salary FROM nurse WHERE phone_number = $1`, [phone_number]);
            salary = salaryData.rows[0].salary; // 해당 인물이 간호사라면, 해당 인물의 연봉 정보를 DB에서 읽어와 기존 그대로 적용
        }
    }

    try {   // 권한에 따른 role 정보 부여
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

        // 수정하고자 하는 인물이 의사 직군이라면,
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
            );  // 수정된 데이터를 DB에 적용.

        } else { // 간호사 직군이라면,
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
            );// 수정된 데이터를 DB에 적용.
        }

        // 권한 레벨이 달라졌을 경우, 해당 정보를 personal_info 테이블에 업데이트
        await db.query('UPDATE personal_info SET authority = $1 WHERE phone_number = $2', [authority_type, phone_number]);
        // 기존 list 페이지로 리디렉션
        return res.redirect('/list');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 환자 | 보호자 정보 수정 기능 모듈
exports.renderUpdatePatient = async (req, res, next) => {
    const { // 쿼리로 부터 수정된 데이터를 받아옴.
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

    try { // 환자 | 보호자 판별
        const Result = await db.query('SELECT * FROM patient WHERE phone_number = $1', [phone_number]);
        if (Result.rows.length > 0) { // 수정할 인물이 환자라면,
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
            ); // 수정된 정보를 환자 테이블의 해당 인물에게 업데이트

            let isKin = await db.query(`SELECT * FROM next_of_kin WHERE patient_phonenumber = $1`, [phone_number]);
            if(isKin.rows.length > 0) {
                await db.query(`UPDATE next_of_kin SET patient_name = $1 WHERE patient_phonenumber = $2`, [name, phone_number]);
            }

        } else { // 보호자라면,
            const p_name = await db.query('SELECT name FROM patient WHERE phone_number = $1', [patient_phone]);

            // 만약 보호자가 환자 전화번호를 잘못 기재했을 시,
            if (p_name.rows.length === 0) {
                return res.status(400).send('본 병원에 해당 환자는 없습니다.');
            }

            // 만약 보호자가 환자 전화번호를 변경했을 시,
            const tmp = await db.query('SELECT name FROM patient WHERE next_of_kin = $1', [phone_number]);
            if (tmp.rows.length === 1) { // 이전 환자에게 등록되었던 보호자의 전화번호를 삭제함.
                await db.query(`UPDATE patient 
                SET next_of_kin = $1 
                WHERE next_of_kin = $2`, [null, phone_number]);
            }

            // 보호자 정보 갱신
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

            // 새로 바뀐 환자 전화번호에 따라, 해당 환자에게 보호자 전화번호를 새로 삽입.
            await db.query(`UPDATE patient 
                SET 
                    next_of_kin = $1 WHERE phone_number = $2
                `,
                [phone_number, patient_phone]
            );
        }

        //성공 시 list-patient 페이지로 리디렉션
        return res.redirect('/list-patient');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 환자 처방 페이지 랜더링 모듈
exports.renderPrescriptionPatient = async (req, res, next) => {
    const { // 테이블 정렬을 위한 데이터를 쿼리로부터 받아옴.
        patientSort = 'acuity_level', // 위험도 기준으로 선정렬
        patientOrder = 'desc',
        mySort = 'pt.acuity_level', // 위험도 기준으로 선정렬
        myOrder = 'desc',
    } = req.query; // 기본값 설정

    const staffPhoneNumber = req.user.phone_number; // 해당 페이지 랜더링을 요청한 사용자의 전화번호

    let count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
    count = count.rows.length; // [의사] 처방 페이지와는 관계 없으나, 레이아웃의 담당 환자 수 표시를 위한 데이터.

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

        let patientQuery; // 담당의가 미배정 된 환자 리스트
        let prescriptionQuery; // [의사] 본인이 담당 중인 환자의 리스트 | [간호사] 담담의가 배정된 전체 환자의 리스트

        //담당의가 미배정 된 환자 데이터를 prescription 테이블, patient 테이블로부터 가져오기 위한 쿼리
        patientQuery = `SELECT
            name AS "Name",
            gender AS "Gender",
            age AS "Age",
            phone_number AS "PhoneNumber",
            next_of_kin AS "KinNumber",
            acuity_level AS "Acuity",
            disease AS "Disease",
            TO_CHAR(hospitalization_date, 'YYYY-MM-DD') AS "HospitalizationDate"
        FROM patient p
        WHERE NOT EXISTS ( --담당의가 배정된 환자는 제외함.
            SELECT *
            FROM prescription
            WHERE prescription.phone_number = p.phone_number
        )
        ORDER BY ${patientSort} ${patientOrder}`;

        // 만약 해당 페이지 랜더링을 요청한 인물이 간호사 직군일 경우
        // 담당의가 배정된 전체 환자 데이터를 prescription 테이블로부터 불러오는 쿼리
        if(req.user.authority === "간호사" || req.user.authority === "수간호사") {
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
            ORDER BY ${mySort} ${myOrder}`;

        } else {
            // 만약 해당 페이지 랜더링을 요청한 인물이 의사 직군일 경우
            // 본인이 담당하는 환자 데이터를 prescription 테이블로부터 불러오는 쿼리
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
        } // prescription 테이블의 의사 전화번호와 페이지 랜더링을 요청한 인물의 전화번호를 비교함.


        // patient 테이블 정렬
        const patientResult = await db.query(patientQuery);
        let prescriptionResult;
        // prescription 테이블 정렬
        if(req.user.authority === "간호사" || req.user.authority === "수간호사")
            prescriptionResult = await db.query(prescriptionQuery);
            // 담당의가 배정된 모든 환자 데이터를 prescription 테이블로부터 불러오는 쿼리
        else
            prescriptionResult = await db.query(prescriptionQuery, [staffPhoneNumber]);
            // 본인이 담당하는 환자의 정보를 prescription 테이블로부터 불러오는 쿼리

        const patient = patientResult.rows;
        const prescription = prescriptionResult.rows;

        res.render('prescription', {
            title: '처방 목록',
            patient,        // 담당의가 미배정된 환자 리스트 데이터
            prescription,   // [의사] 본인이 담당하는 환자 리스트 데이터 | [간호사] 담당의가 배정된 모든 환자 리스트 데이터
            count,          // [의사] 레이아웃에 담당 환자수 출력을 위한 데이터
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

//[의사] 담당 환자 선택 기능 모듈
exports.renderGetPatient = async (req, res, next) => {
    const {phone_number} = req.query;   // 담당할 환자의 전화번호
    const staffPhoneNumber = req.user.phone_number; // 담당의 전화번호
    try {
        // 만약 이미 전공의가 배정된 환자인지
        const isHere = await db.query('SELECT * FROM prescription WHERE phone_number = $1', [phone_number]);
        // 해당 의사가 담당할 수 있는 환자 수를 초과했는지
        const isMax = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
        if (isHere.rows.length === 0 && isMax.rows.length < 5) { // 어떤 제한 기준에도 걸리지 않았다면,
            // 해당 환자에게 담당의를 배정하여 prescription 테이블에 넣는 쿼리
            await db.query('INSERT INTO prescription (phone_number, doctor_in_charge, prescription) VALUES ($1, $2, $3)', [phone_number, staffPhoneNumber, "내용 없음."]);
        }

        //성공 시 처방 페이지로 리디렉션
        return res.redirect('/prescription');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// [담당의] 처방 작성 기능 모듈
exports.renderWritePrescription = async (req, res, next) => {
    const { //해당 환자의 전화번호와 담당의가 작성한 처방전 데이터를 쿼리로부터 가져옴.
        phone_number,
        prescriptionField
    } = req.body;

    try { // prescription 테이블에서, 해당 환자 처방전 필드에 담당의가 작성한 내용을 업데이트 함.
        await db.query('UPDATE prescription SET prescription = $1 WHERE phone_number = $2', [prescriptionField, phone_number]);
        // 성공 시 처방 페이지로 리디렉션
        return res.redirect('/prescription');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// [전담의] 환자 전담 철회 기능 모듈
exports.renderDeletePrescription = async (req, res, next) => {
    const {phone_number} = req.query; // 전공의가 담당을 철회한 환자의 전화번호
    try {// prescription 테이블에서 전담이 철회된 환자의 데이터를 삭제함.
        await db.query('DELETE FROM prescription WHERE phone_number = $1', [phone_number]);
        // 삭제되었을 시, 처방 페이지로 리디렉션
        return res.redirect('/prescription');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 이메일 출력 모듈
exports.renderEmails = async (req, res, next) => {
    try {
        // 로그인된 사용자 정보 확인
        if (!req.user || !req.user.phone_number) {
            return res.status(401).send('로그인 정보가 없습니다.');
        }

        let staffPhoneNumber;
        let count;
        if(req.user) {  // [의사직군] 로그인 된 상태라면, 레이아웃의 담당 환자 수에 환자 명수를 출력하기 위한 데이터를 요청하는 쿼리
            // email 페이지와 실질적인 관계는 없으나, layout 페이지가 항상 표시되므로, 해당 레이아웃에 담당 환자 명수 출력을 위한 코드.
            staffPhoneNumber = req.user.phone_number;   // 해당 인물 전화번호
            count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
            count = count.rows.length;  // 해당 사용자(의사)가 돌보고 있는 환자 수
        }

        const phoneNumber = req.user.phone_number; // 로그인된 사용자 ID
        console.log('로그인된 사용자 전화번호:', phoneNumber); // 디버깅용

        // 보낸 이메일 목록 조회
        const sentEmailsResult = await db.query(`
            SELECT * FROM Email WHERE Sender_PN = $1 AND sender_delete = FALSE ORDER BY Create_Date DESC
        `, [phoneNumber]);

        // 받은 이메일 목록 조회
        const receivedEmailsResult = await db.query(`
            SELECT * FROM Email WHERE Receiver_PN = $1 AND receiver_delete = FALSE ORDER BY Create_Date DESC
        `, [phoneNumber]);

        // 이메일 목록을 각각 변수에 담기
        const sentEmails = sentEmailsResult.rows;
        const receivedEmails = receivedEmailsResult.rows;

        // 쿼리 결과 확인
        console.log('보낸 이메일 목록:', sentEmails);
        console.log('받은 이메일 목록:', receivedEmails);

        // 이메일 목록이 없는 경우 처리
        if (sentEmails.length === 0 && receivedEmails.length === 0) {
            console.log('이메일이 없습니다.');
        }

        // 이메일 목록 페이지 렌더링
        res.render('email', {
            title: '이메일 확인',
            sentEmails,
            receivedEmails,
            count,
            noSentEmails: sentEmails.length === 0, // 보낸 이메일이 없을 때
            noReceivedEmails: receivedEmails.length === 0, // 받은 이메일이 없을 때
        });

    } catch (err) {
        console.error('에러 발생:', err);
        next(err); // 에러 미들웨어로 전달
    }
};

// 이메일 삭제 기능 모듈
exports.deleteEmail = async (req, res, next) => {
    try {
        const { email_id, type } = req.query;

        // email_id와 type 검증
        if (!email_id || !type) {
            return res.status(400).send('잘못된 요청입니다. email_id와 type을 확인하세요.');
        }

        const phoneNumber = req.user.phone_number; // 로그인된 사용자 전화번호
        console.log('삭제 요청:', { email_id, type, phoneNumber });

        // 현재 이메일 정보 가져오기
        const emailResult = await db.query(
            `SELECT * FROM Email WHERE Email_ID = $1`,
            [email_id]
        );
        const email = emailResult.rows[0];

        if (!email) {
            return res.status(404).send('이메일을 찾을 수 없습니다.');
        }

        // 삭제 권한 확인
        if (
            (type === 'sender' && email.sender_pn !== phoneNumber) ||
            (type === 'receiver' && email.receiver_pn !== phoneNumber)
        ) {
            return res.status(403).send('삭제 권한이 없습니다.');
        }

        // 삭제 플래그 업데이트
        if (type === 'sender') {
            await db.query(
                `UPDATE Email SET Sender_Delete = TRUE WHERE Email_ID = $1`,
                [email_id]
            );
        } else if (type === 'receiver') {
            await db.query(
                `UPDATE Email SET Receiver_Delete = TRUE WHERE Email_ID = $1`,
                [email_id]
            );
        } else {
            return res.status(400).send('잘못된 삭제 요청입니다.');
        }

        // 이메일의 최종 삭제 여부 확인
        const updatedEmailResult = await db.query(
            `SELECT Sender_Delete, Receiver_Delete FROM Email WHERE Email_ID = $1`,
            [email_id]
        );
        const updatedEmail = updatedEmailResult.rows[0];
        console.log('업데이트 된 이메일:', { updatedEmail });
        // 두 플래그가 모두 1인 경우 데이터베이스에서 삭제
        if (updatedEmail.sender_delete === true && updatedEmail.receiver_delete === true) {
            await db.query(
                `DELETE FROM Email WHERE Email_ID = $1`,
                [email_id]
            );
            console.log(`이메일 ${email_id}이(가) 완전히 삭제되었습니다.`);
        }

        // 성공적으로 처리되었음을 클라이언트에 알림
        res.redirect('/emails');
    } catch (err) {
        console.error('에러 발생:', err);
        next(err); // 에러 미들웨어로 전달
    }
};

// 이메일 전송 모듈
exports.renderSendEmailForm = async (req, res) => {
    let staffPhoneNumber;
    let count;
    if(req.user) {  // [의사직군] 로그인 된 상태라면, 레이아웃의 담당 환자 수에 환자 명수를 출력하기 위한 데이터를 요청하는 쿼리
        // join페이지와 실질적인 관계는 없으나, layout 페이지가 항상 표시되므로, 해당 레이아웃에 담당 환자 명수 출력을 위한 코드.
        staffPhoneNumber = req.user.phone_number;   // 해당 인물 전화번호
        count = await db.query('SELECT * FROM prescription WHERE doctor_in_charge = $1', [staffPhoneNumber]);
        count = count.rows.length;  // 해당 사용자(의사)가 돌보고 있는 환자 수
    }
    res.render('sendEmail', { title: '이메일 작성', count });
};

// 이메일 전송 모듈
exports.sendEmail = async (req, res, next) => {
    try {
        const { receiverPhoneNumber, subject, content } = req.body;
        const senderPhoneNumber = req.user.phone_number; // 로그인된 사용자의 전화번호

        // 입력 값 검증
        if (!receiverPhoneNumber || !subject || !content) {
            return res.status(400).send('모든 필드를 입력해주세요.');
        }

        // Receiver 존재 여부 확인
        const receiverResult = await db.query(
            `SELECT phone_number, authority FROM personal_info WHERE phone_number = $1`,
            [receiverPhoneNumber]
        );

        if (receiverResult.rows.length === 0) {
            return res.status(404).send('수신자를 찾을 수 없습니다.');
        }

        const receiverAuthority = receiverResult.rows[0].authority;

        if (receiverAuthority === 4) {
            return res.status(403).send('직원이 아닙니다. 이메일을 보낼 수 없습니다.');
        }
        // 이메일 생성
        await db.query(
            `INSERT INTO Email (Sender_PN, Receiver_PN, Detail, Create_Date, Sender_Delete, Receiver_Delete)
             VALUES ($1, $2, $3, NOW(), FALSE, FALSE)`,
            [senderPhoneNumber, receiverPhoneNumber, subject + "\n\n" + content]
        );

        console.log('이메일 전송 완료:', { senderPhoneNumber, receiverPhoneNumber, subject });
        res.redirect('/emails');
    } catch (err) {
        console.error('에러 발생:', err);
        next(err);
    }
};