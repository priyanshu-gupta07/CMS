const express = require('express');
const controller = require('../controllers/student');
const { requireAuth, forwardAuth } = require('../middlewares/studentAuth');

const router = express.Router();


router.get('/login', forwardAuth, controller.getLogin);
router.post('/login', controller.postLogin);

router.get('/dashboard', requireAuth, controller.getDashboard);
router.get('/profile', requireAuth, controller.getProfile);

router.get('/selectAttendance', requireAuth, controller.getSelectAttendance);
router.post('/selectAttendance', requireAuth, controller.postSelectAttendance);

router.get('/timetable', requireAuth, controller.getTimeTable);

router.get('/logout', requireAuth, controller.getLogout);

module.exports = router;
