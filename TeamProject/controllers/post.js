const db = require(process.cwd() + '/models');

exports.afterUploadImage = (req, res) => {
    console.log(req.file);
    res.json({ url: `/img/${req.file.filename}` });
};

exports.uploadPost = async (req, res, next) => {
    try {
        const [postInsertResult] = await db.execute('INSERT INTO posts (content, img, userId) VALUES (?, ?, ?)',
            [req.body.content, req.body.url, req.user.id]);
        const [posts] = await db.execute('SELECT * FROM posts WHERE id=?', [postInsertResult.insertId]);
        const post = posts[0];

        const hashtags = req.body.content.match(/#[^\s#]*/g);
        if (hashtags) {
            await Promise.all(
                hashtags.map(async t => {
                    const tag = t.slice(1).toLowerCase();
                    const [tagInsertResult] = await db.execute('INSERT INTO hashtags (title) VALUES (?) ON DUPLICATE KEY UPDATE updatedAt=now();', [tag]);
                    db.execute('INSERT INTO postHashtag (postId, hashtagId) VALUES (?, ?)',
                        [post.id, tagInsertResult.insertId]);
                })
            );
        }
        res.redirect('/');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/* Todo */
// 게시글 삭제와 좋아요, 좋아요 취소, 싫어요, 싫어요 취소 기능 구현 및 내보내기
// delete의 경우 res.redirect('/') 하지 않기

exports.deletePost = async (req, res, next) => {
    console.log('게시글 삭제');
    try{
        const {postId} = req.params;
        console.log(postId);
        await db.execute('DELETE FROM posts WHERE id = ?', [postId]);
    } catch (err) {
        console.error(err);
        next(err);
    }
}

exports.likePost = async (req, res, next) => {
    try{
        const { id } = req.params;
        const {postId} = req.body;
        await db.execute('INSERT INTO postlikes (userId, postId) VALUES (?,?)', [id, postId]);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        next(err);
    }
}

exports.dislikePost = async (req, res, next) => {
    try{
        const { postId, myId } = req.params;
        await db.execute('DELETE FROM postlikes WHERE userId = ? AND postId = ?', [myId, postId]);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        next(err);
    }
}