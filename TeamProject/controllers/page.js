const db = require(process.cwd() + '/models');
// 수정완료
exports.renderProfile = (req, res) => {
    res.render('profile', {title: '내 정보 - TODO'});
};

exports.renderJoin = (req, res) => {
    res.render('join', { title: '직원 등록 - TODO' });
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
    const { sort = 'id', order = 'asc' } = req.query; // 기본값 설정
    const validSortFields = ['id', 'role', 'year', 'salary', 'state', 'name', 'gender', 'age', 'phone_number', 'department'];
    const validOrders = ['asc', 'desc'];

    try {
        // 잘못된 값 방지
        if (!validSortFields.includes(sort) || !validOrders.includes(order)) {
            throw new Error('Invalid sort or order value');
        }

        const doctorResult = await db.query(`
            SELECT
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
            ORDER BY ${sort} ${order}` // 동적 정렬 쿼리
        );

        const nurseResult = await db.query(`
            SELECT
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
            ORDER BY ${sort} ${order}` // 동적 정렬 쿼리
        );


        const doctor = doctorResult.rows;
        const nurse = nurseResult.rows;
        res.render('list', {
            title: '직원 목록',
            doctor,
            nurse,
            currentSort: sort,  // 현재 정렬 기준
            currentOrder: order // 현재 정렬 방향
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};


exports.renderHashtag = async (req, res, next) => {
    const query = req.query.hashtag;
    if (!query) {
        return res.redirect('/');
    }
    try {
        // 해시태그 데이터 조회
        const hashtagResult = await db.query('SELECT * FROM hashtags WHERE title = $1', [query]);
        let posts = [];
        if (hashtagResult.rows.length > 0) {
            const tag = hashtagResult.rows[0];
            const postsResult = await db.query(`
                SELECT p.*, u.id AS userId, u.nick AS userNick
                FROM posts p
                JOIN users u ON p.userId = u.id
                JOIN postHashtag ph ON ph.postId = p.id
                WHERE ph.hashtagId = $1
                ORDER BY p.createdAt DESC
            `, [tag.id]);
            posts = postsResult.rows;
        }
        res.render('main', {
            title: `${query} | TODO`,
            twits: posts,
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};
