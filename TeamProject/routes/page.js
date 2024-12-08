const express = require('express');
const { isLoggedIn, isNotLoggedIn } = require('../middlewares');
const { renderProfile, renderState, renderJoin, renderJoinPatient, renderMain,
    renderList, renderListPatient, renderDeletePatient, renderDeleteStaff,
    renderUpdateStaff, renderUpdatePatient, renderPrescriptionPatient, renderGetPatient,
    renderWritePrescription, renderDeletePrescription, renderEmails, deleteEmail,
    renderSendEmailForm, sendEmail} = require('../controllers/page');

const router = express.Router();

// 병원장 권한 검사 미들웨어
const checkAuthority1 = (req, res, next) => {
    if (req.user && req.user.authority === "병원장") {
        next(); // 권한이 충분하면 다음 미들웨어 실행
    } else {
        res.status(403).send('권한이 부족합니다.'); // 권한 부족 시 에러 처리
    }
};

// 직원 권한 검사 미들웨어
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

//라우터 모음
router.get('/profile', isLoggedIn, renderProfile);  //프로필 페이지 라우팅
router.post('/profile/state', isLoggedIn, renderState); //프로필 페이지 내 출근 상태 라우팅
router.get('/join', isLoggedIn, checkAuthority1, renderJoin); // 직원 등록 페이지 라우팅
router.get('/join-patient', isLoggedIn, checkAuthority2, renderJoinPatient); // 환자|보호자 등록 페이지 라우팅
router.get('/list', isLoggedIn, renderList); // 직원 리스트 페이지 라우팅
router.get('/list-patient', isLoggedIn, renderListPatient); // 환자 리스트 페이지 라우팅
router.get('/delete-patient', isLoggedIn, renderDeletePatient); // 환자 삭제 기능 라우팅
router.get('/delete-kin', isLoggedIn, renderDeletePatient); // 보호자 삭제 기능 라우팅
router.get('/delete-staff', isLoggedIn, checkAuthority1, renderDeleteStaff); // 직원 삭제 기능 라우팅
router.post('/update-staff', isLoggedIn, checkAuthority2, renderUpdateStaff); // 직원 정보 업데이트 기능 라우팅
router.post('/update-patient', isLoggedIn, checkAuthority2, renderUpdatePatient); // 환자 | 보호자 정보 업데이트 기능 라우팅
router.get('/prescription', isLoggedIn, checkAuthority2, renderPrescriptionPatient); // 처방 페이지 랜더링 라우팅
router.get('/mypatient', isLoggedIn, checkAuthority2, renderGetPatient); // 담당의 담당환자 | 담당의 배정된 전체 환자 리스트업 기능 라우팅
router.post('/writePrescription', isLoggedIn, checkAuthority2, renderWritePrescription); // 처방전 작성 기능 라우팅
router.get('/deletePrescription', isLoggedIn, checkAuthority2, renderDeletePrescription); // 환자 담당 철회 기능 라우팅

// 이메일 관련 라우터 추가
router.get('/emails', isLoggedIn, renderEmails); // 이메일 페이지 라우팅
router.get('/delete-email', isLoggedIn, deleteEmail); // 이메일 삭제 기능 라우팅
router.get('/send-email', isLoggedIn, renderSendEmailForm); // 이메일 보내기 페이지 라우팅
router.post('/send-email', isLoggedIn, sendEmail); // 이메일 보내기 요청 기능 라우팅

router.get('/', renderMain); // 메인 페이지 라우팅

module.exports = router;