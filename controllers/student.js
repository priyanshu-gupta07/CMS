const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv= require("dotenv")
dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  dateStrings: 'date',
  database: 'cumsdbms',
});


const zeroParamPromise = (sql) => {
  return new Promise((resolve, reject) => {
    db.query(sql, (err, results) => {
      if (err) return reject(err);
      return resolve(results);
    });
  });
};

const queryParamPromise = (sql, queryParam) => {
  return new Promise((resolve, reject) => {
    db.query(sql, queryParam, (err, results) => {
      if (err) return reject(err);
      return resolve(results);
    });
  });
};

exports.getLogin = (req, res, next) => {
  res.render('Student/login');
};

exports.postLogin = (req, res, next) => {
  try {
    const { email, password } = req.body;
    let errors = [];

    if (!email || !password) {
      errors.push({ msg: 'Please enter all fields' });
      return res.status(400).render('Student/login', { errors });
    }

    let sql5 = 'SELECT * FROM student WHERE email = ?';
    db.query(sql5, [email], async (err, results) => {
      if (
        results.length === 0 ||
        !(await bcrypt.compare(password, results[0].password))
      ) {
        errors.push({ msg: 'Email or Password is Incorrect' });
        res.status(401).render('Student/login', { errors });
      } else {
        const user = results[0];
        console.log(process.env.JWT_EXPIRE);
        const token = jwt.sign({ id: user.s_id }, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRE,
        });

        res.cookie('jwt', token, {
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000,
        });
        res.redirect('/student/dashboard');
      }
    });
  } catch (err) {
    throw err;
  }
};

exports.getDashboard = (req, res, next) => {
  let sql6 = 'SELECT * FROM student WHERE s_id = ?';
  db.query(sql6, [req.user], (err, result) => {
    if (err) throw err;
    res.render('Student/dashboard', {
      name: result[0].s_name,
      page_name: 'overview',
    });
  });
};

exports.getProfile = async (req, res, next) => {
  const sql = 'SELECT * FROM student WHERE s_id = ?';
  const sql2 =
    'SELECT d_name FROM department WHERE dept_id = (SELECT dept_id FROM student WHERE s_id = ?)';

  const profileData = await queryParamPromise(sql, [req.user]);
  const deptName = await queryParamPromise(sql2, [req.user]);

  const dobs = new Date(profileData[0].dob);
  const jd = new Date(profileData[0].joining_date);

  let dob =
    dobs.getDate() + '/' + (dobs.getMonth() + 1) + '/' + dobs.getFullYear();
  let jds = jd.getDate() + '/' + (jd.getMonth() + 1) + '/' + jd.getFullYear();

  return res.render('Student/profile', {
    data: profileData,
    page_name: 'profile',
    dname: deptName[0].d_name,
    dob,
    jds,
  });
};

exports.getSelectAttendance = async (req, res, next) => {
  res.render('Student/selectAttendance', {
    page_name: 'attendance',
    curYear: 2021,
  });
};

const getAttendanceData = async (year, months, courseData, s_id) => {
  let monthDates = [];
  let isPresent = [];
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'April',
    'May',
    'June',
    'July',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  for (month of months) {
    let dayNumber = 1;
    let date = new Date(year, month, dayNumber);
    let days = [];
    let outerStatus = [];
    while (date.getMonth() === month) {
      let status = [];
      const sqlDate =
        year +
        '-' +
        (month < 9 ? '0' + (month + 1) : month + 1) +
        '-' +
        (dayNumber <= 9 ? '0' + dayNumber : dayNumber);
      const sql3 =
        'SELECT status from attendance WHERE c_id = ? AND s_id = ? AND date = ?';
      for (course of courseData) {
        const attendanceData = (
          await queryParamPromise(sql3, [course.c_id, s_id, sqlDate])
        )[0];
        status.push(attendanceData);
      }
      outerStatus.push(status);
      const monthName = monthNames[month];
      days.push({ monthName, dayNumber });
      dayNumber++;
      date.setDate(date.getDate() + 1);
    }
    isPresent.push(outerStatus);
    monthDates.push(days);
  }
  return [monthDates, isPresent];
};

exports.postSelectAttendance = async (req, res, next) => {
  const { year, semester } = req.body;
  const sql1 = 'SELECT * FROM student WHERE s_id = ?';
  const studentData = (await queryParamPromise(sql1, [req.user]))[0];
  const sql2 = 'SELECT * from course WHERE dept_id = ? AND semester = ?';
  const courseData = await queryParamPromise(sql2, [
    studentData.dept_id,
    semester,
  ]);
  var monthDates, isPresent;
  if (semester % 2 === 0) {
    [monthDates, isPresent] = await getAttendanceData(
      parseInt(year),
      [0, 1, 2, 3],
      courseData,
      req.user
    );
  } else {
    [monthDates, isPresent] = await getAttendanceData(
      parseInt(year),
      [7, 8, 9, 10],
      courseData,
      req.user
    );
  }
  res.render('Student/attendance', {
    page_name: 'attendance',
    curSemester: semester,
    studentData,
    courseData,
    monthDates,
    isPresent,
  });
};

exports.getTimeTable = async (req, res, next) => {
  const sql1 = 'SELECT * FROM student WHERE s_id = ?';
  const studentData = (await queryParamPromise(sql1, [req.user]))[0];
  const days = (
    await queryParamPromise(
      'select datediff(current_date(), ?) as diff',
      studentData.joining_date
    )
  )[0].diff;
  const semester = Math.floor(days / 182) + 1;
  let coursesData = await queryParamPromise(
    'select c_id from course where dept_id = ? and semester = ?',
    [studentData.dept_id, semester]
  );
  for (let i = 0; i < coursesData.length; ++i) {
    coursesData[i] = coursesData[i].c_id;
  }

  let timeTableData = await queryParamPromise(
    'select * from time_table where c_id in (?) and section = ? order by day, start_time',
    [coursesData, studentData.section]
  );
  const classesData = await queryParamPromise(
    'select c_id, st_id from class where c_id in (?) and section = ?',
    [coursesData, studentData.section]
  );
  for (let classData of classesData) {
    const staffName = (
      await queryParamPromise('select st_name from staff where st_id = ?', [
        classData.st_id,
      ])
    )[0].st_name;
    const courseName = (
      await queryParamPromise('select name from course where c_id = ?', [
        classData.c_id,
      ])
    )[0].name;
    classData.staffName = staffName;
    classData.courseName = courseName;
  }
  const startTimes = ['10:00', '11:00', '12:00', '13:00'];
  const endTimes = ['11:00', '12:00', '13:00', '14:00'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  res.render('Student/timetable', {
    page_name: 'Time Table',
    studentData,
    semester,
    timeTableData,
    startTimes,
    endTimes,
    dayNames,
    classesData,
  });
};

exports.getLogout = (req, res, next) => {
  res.cookie('jwt', '', { maxAge: 1 });
  req.flash('success_msg', 'You are logged out');
  res.redirect('/student/login');
};

exports.getFeedback = async (req, res, next) => {
  console.log("here");
  try {
    const sql1 = 'SELECT * FROM student WHERE s_id = ?';
    const studentData = (await queryParamPromise(sql1, [req.user]))[0];

    // Ensure that studentData has values
    if (!studentData) {
      return res.status(404).send('Student not found');
    }

    const email = studentData.email;
    const department = studentData.dept_id;

    // Render the feedback page and pass the email and department
    console.log(email);
    console.log(department);
    res.render('Student/feedback', {
      email,
      department,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};



exports.postFeedback = (req, res, next) => {
  console.log("here");
  try {
    const { st_id, course_id, feedback_text, rating } = req.body;
    let errors = [];

    // Basic validation for required fields
    if (!st_id || !course_id || !feedback_text || !rating) {
      errors.push({ msg: 'Please enter all required fields' });
      return res.status(400).render('Student/feedback', { errors });
    }

    // Check that the rating is within the valid range
    if (rating < 1 || rating > 5) {
      errors.push({ msg: 'Rating must be between 1 and 5' });
      return res.status(400).render('Student/feedback', { errors });
    }

    // SQL query to insert feedback into the database
    let sqlInsert = 'INSERT INTO feedback_form (feedback_id, st_id, course_id, feedback_text, rating) VALUES (?, ?, ?, ?, ?)';
    const feedbackId = `fb_${Date.now()}`; // Generate a unique feedback ID

    db.query(
      sqlInsert,
      [feedbackId, st_id, course_id, feedback_text, rating],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Server error');
        }
        // Redirect or respond upon successful submission
        res.redirect('/student/feedbacksuccess');
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

