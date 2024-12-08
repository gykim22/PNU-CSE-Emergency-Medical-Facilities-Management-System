const passport = require('passport');
const local = require('./localStrategy');
const db = require(process.cwd() + '/models');

module.exports = () => {
    passport.serializeUser((user, done) => {
        done(null, user.phone_number);
    });

    passport.deserializeUser(async (phone_number, done) => {
        try {
            const userResult = await db.query(
                'SELECT phone_number, authority FROM personal_info WHERE phone_number = $1',
                [phone_number]
            );

            if (userResult.rows.length > 0) { // 사용자 정보가 존재한다면
                let user = userResult.rows[0];
                console.log(user);
                if(user.authority <= 3) { // 직원 레벨
                    // 로그인 한 사용자가 의사 직군이라면
                    user = await db.query('SELECT phone_number, name, state, role AS authority, department FROM Doctor WHERE phone_number = $1', [phone_number]);
                    if (user.rows.length === 0) { // 로그인한 사용자가 간호사 직군이라면
                        user = await db.query('SELECT phone_number, name, state, role AS authority FROM Nurse WHERE phone_number = $1', [phone_number]);
                    }
                } else { // 로그인한 사용자가 환자|보호자라면
                    // 로그인한 사용자가 환자라면
                    user = await db.query('SELECT phone_number, name, age, gender, role AS authority, disease, hospitalization_date FROM patient WHERE phone_number = $1', [phone_number]);
                    if (user.rows.length === 0) // 로그인한 사용자가 보호자라면
                        user = await db.query('SELECT phone_number, name, role AS authority FROM next_of_kin WHERE phone_number = $1', [phone_number]);
                }
                done(null, user.rows[0]); // 해당 사용자 데이터 전송
            } else done(null);
        } catch (err) {
            console.error(err);
            done(err);
        }
    });

    local();
}