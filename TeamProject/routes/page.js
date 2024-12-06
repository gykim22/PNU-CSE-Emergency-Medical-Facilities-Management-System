const express = require('express');
const { isLoggedIn, isNotLoggedIn } = require('../middlewares');
const { renderProfile, renderJoin, renderMain, renderHashtag, renderList, renderJoinPatient} = require('../controllers/page'); // 여기 추가?

const router = express.Router();

// 권한 검사 미들웨어
const checkAuthority = (req, res, next) => {
    if (req.user && req.user.authority === "병원장") {
        next(); // 권한이 충분하면 다음 미들웨어 실행
    } else {
        res.status(403).send('권한이 부족합니다.'); // 권한 부족 시 에러 처리
    }
};

router.use((req, res, next) => {
    res.locals.user = req.user;
    res.locals.followerCount = req.user?.followers?.length || 0;
    res.locals.followingCount = req.user?.followings?.length || 0;
    res.locals.followingIdList = req.user?.followings?.map(f => f.id) || [];
    next();
});

router.get('/profile', isLoggedIn, renderProfile);
router.get('/join', renderJoin);
router.get('/join-patient', renderJoinPatient);
router.get('/hashtag', renderHashtag);
router.get('/list', isLoggedIn, renderList);
router.get('/', renderMain);

module.exports = router;