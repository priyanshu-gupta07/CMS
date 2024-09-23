const express = require('express');
const controller = require('../controllers/staff');
const { requireAuth, forwardAuth } = require('../middlewares/staffAuth');

const router = express.Router();


router.get('/login', forwardAuth, controller.getLogin);
router.post('/login', controller.postLogin);

router.get('/dashboard', requireAuth, controller.getDashboard);
router.get('/profile', requireAuth, controller.getProfile);
router.get('/logout', requireAuth, controller.getLogout);

router.get('/student-attendance', requireAuth, controller.getAttendance);


router.post(
  '/student-attendance/class/:id',
  requireAuth,
  controller.postAttendance
);

router.get('/timetable', requireAuth, controller.getTimeTable);

router.post('/student-attendance', requireAuth, controller.markAttendance);

router.get('/student-report', requireAuth, controller.getStudentReport);

router.get('/class-report', requireAuth, controller.selectClassReport);
router.get('/class-report/class/:id', requireAuth, controller.getClassReport);



module.exports = router;
