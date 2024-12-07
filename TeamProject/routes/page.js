const express = require('express');
const { isLoggedIn, isNotLoggedIn } = require('../middlewares');
const { renderProfile, renderState, renderJoin, renderJoinPatient, renderMain,
    renderList, renderListPatient, renderDeletePatient, renderDeleteStaff,
    renderUpdateStaff, renderUpdatePatient, renderPrescriptionPatient, renderGetPatient,
    renderWritePrescription} = require('../controllers/page');
const {deletePost} = require("../controllers/post"); // 여기 추가?

const router = express.Router();

// 권한 검사 미들웨어
const checkAuthority1 = (req, res, next) => {
    if (req.user && req.user.authority === "병원장") {
        next(); // 권한이 충분하면 다음 미들웨어 실행
    } else {
        res.status(403).send('권한이 부족합니다.'); // 권한 부족 시 에러 처리
    }
};

const checkAuthority2 = (req, res, next) => {
    if (req.user && (req.user.authority === "환자" || req.user.authority === "보호자")) {
        res.status(403).send('권한이 부족합니다.'); // 권한 부족 시 에러 처리
    } else {
        next(); // 권한이 충분하면 다음 미들웨어 실행
    }
};

router.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

router.get('/profile', isLoggedIn, renderProfile);
router.post('/profile/state', isLoggedIn, renderState);
router.get('/join', isLoggedIn, checkAuthority1, renderJoin);
router.get('/join-patient', isLoggedIn, checkAuthority2, renderJoinPatient);
router.get('/list', isLoggedIn, renderList);
router.get('/list-patient', isLoggedIn, renderListPatient);
router.get('/delete-patient', isLoggedIn, renderDeletePatient);
router.get('/delete-kin', isLoggedIn, renderDeletePatient);
router.get('/delete-staff', isLoggedIn, checkAuthority1, renderDeleteStaff);
router.post('/update-staff', isLoggedIn, checkAuthority1, renderUpdateStaff);
router.post('/update-patient', isLoggedIn, checkAuthority2, renderUpdatePatient);
router.get('/prescription', isLoggedIn, checkAuthority2, renderPrescriptionPatient);
router.get('/mypatient', isLoggedIn, checkAuthority2, renderGetPatient);
router.post('/writePrescription', isLoggedIn, checkAuthority2, renderWritePrescription);

router.get('/', renderMain);

module.exports = router;