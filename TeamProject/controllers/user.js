const db = require(process.cwd() + '/models');
//수정 완료
exports.follow = async (req, res, next) => {
    try {
        const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            // 팔로우 추가 (충돌 시 아무 작업도 하지 않음)
            await db.query(
                'INSERT INTO follow (followerId, followingId) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [req.user.id, req.params.id]
            );
            res.send('success');
        } else {
            res.status(404).send('no user');
        }
    } catch (err) {
        console.error(err);
        next(err);
    }
};