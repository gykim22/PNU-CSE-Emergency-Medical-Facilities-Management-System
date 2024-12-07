const passport = require('passport');
const local = require('./localStrategy');
const db = require(process.cwd() + '/models');
// 수정 완료. TODO 작성 필요

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

            if (userResult.rows.length > 0) {
                let user = userResult.rows[0];
                console.log(user);
                if(user.authority <= 3) { // 직원
                    user = await db.query('SELECT phone_number, name, state, role AS authority FROM Doctor WHERE phone_number = $1', [phone_number]);
                    if (user.rows.length === 0) {
                        user = await db.query('SELECT phone_number, name, state, role AS authority FROM Nurse WHERE phone_number = $1', [phone_number]);
                    }
                } else { // 환자|보호자
                    user = await db.query('SELECT phone_number, name, role AS authority FROM patient WHERE phone_number = $1', [phone_number]);
                    if (user.rows.length === 0)
                        user = await db.query('SELECT phone_number, name, role AS authority FROM next_of_kin WHERE phone_number = $1', [phone_number]);
                }
                done(null, user.rows[0]);
            } else done(null);
        } catch (err) {
            console.error(err);
            done(err);
        }
    });

    local();
}