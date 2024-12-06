const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const db = require(process.cwd() + '/models');
// 수정 완료

module.exports = () => {
    passport.use(new LocalStrategy({
        usernameField: 'phone_number',
        passwordField: 'password',
        passReqToCallback: false,
    }, async (phone_number, password, done) => {
        try {
            const userResult = await db.query('SELECT * FROM personal_info WHERE phone_number = $1', [phone_number]);
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0]; // 첫 번째 사용자 데이터 가져오기
                // 비밀번호 비교
                const isMatch = await bcrypt.compare(password, user.password);
                if (isMatch) {
                    done(null, user);
                } else {
                    done(null, false, {message: '비밀번호가 일치하지 않습니다.'}); // 비밀번호 불일치
                }
            } else {
                done(null, false, {message: '가입되지 않은 회원입니다.'});
            }
        } catch (err) {
            console.error(err);
            done(err);
        }
    }))
};