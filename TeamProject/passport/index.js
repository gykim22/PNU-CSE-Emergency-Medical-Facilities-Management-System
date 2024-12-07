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
                /*
                // 두 번째 쿼리: 팔로잉 목록 조회
                const followingsResult = await db.query(
                    `SELECT u.id, u.nick 
                 FROM personal_info p
                 JOIN follow f ON u.id = f.followingId 
                 WHERE f.followerId = $1`,
                    [user.id]
                );

                // 세 번째 쿼리: 팔로워 목록 조회
                const followersResult = await db.query(
                    `SELECT u.id, u.nick 
                 FROM users u 
                 JOIN follow f ON u.id = f.followerId 
                 WHERE f.followingId = $1`,
                    [user.id]
                );

                // 사용자 객체에 팔로잉 및 팔로워 데이터 추가
                user.followings = followingsResult.rows;
                user.followers = followersResult.rows;
                 */
                if(user.authority <= 3) { // 직원
                    user = await db.query('SELECT phone_number, name, state, role AS authority FROM Doctor WHERE phone_number = $1', [phone_number]);
                    if (user.rows.length === 0)
                        user = await db.query('SELECT phone_number, name, state, role AS authority FROM Nurse WHERE phone_number = $1', [phone_number]);
                } else { // 환자|보호자
                    user = await db.query('SELECT phone_number, name, state, role AS authority FROM Doctor WHERE phone_number = $1', [phone_number]);
                    if (user.rows.length === 0)
                        user = await db.query('SELECT phone_number, name, state, role AS authority FROM Nurse WHERE phone_number = $1', [phone_number]);
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