exports.isLoggedIn = (req, res, next) => { // 현재 로그인 되었다면,
    if (req.isAuthenticated()) {
        next();
    } else {
        res.status(403).send('로그인 필요');
    }
};

exports.isNotLoggedIn = (req, res, next) => { // 로그인되어있지 않다면
    if (!req.isAuthenticated()) {
        // 로그인이 안 되어 있으면 계속 진행
        next();
    } else {
        const message = encodeURIComponent('로그인한 상태입니다.');
        res.redirect(`/?error=${message}`);

    }
};