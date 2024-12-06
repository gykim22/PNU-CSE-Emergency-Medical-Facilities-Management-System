//수정할 것 없음.

exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.status(403).send('로그인 필요');
    }
};

exports.isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        // 로그인이 안 되어 있으면 계속 진행
        next();
    } else {
        // 로그인된 상태에서 authority 확인
        if (req.user && req.user.authority === '병원장') {
            // 병원장일 경우, 계속 진행
            next();
        } else {
            // 병원장이 아니면 에러 메시지와 함께 리다이렉트
            const message = encodeURIComponent('로그인한 상태입니다.');
            res.redirect(`/?error=${message}`);
        }
    }
};