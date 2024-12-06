const express = require('express');
const passport = require('passport');
const { isLoggedIn, isNotLoggedIn } = require('../middlewares');
const { join, joinPatient, login, logout } = require('../controllers/auth');

const router = express.Router();

// POST /auth/join
router.post('/join', join);

// POST /auth/join-patient
router.post('/join-patient', joinPatient);

// POST /auth/login
router.post('/login', isNotLoggedIn, login);

// GET /auth/logout
router.get('/logout', isLoggedIn, logout);

module.exports = router;