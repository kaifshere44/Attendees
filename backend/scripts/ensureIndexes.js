const Student = require('../models/Student');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Admin = require('../models/Admin');
const IssueReport = require('../models/IssueReport');

let indexesEnsured = false;

const ensureAllIndexes = async () => {
  if (indexesEnsured) return;
  indexesEnsured = true;
  try {
    await Promise.all([
      Student.init(),
      Session.init(),
      Attendance.init(),
      Admin.init(),
      IssueReport.init(),
    ]);
    console.log('MongoDB Indexes Ensured Successfully');
  } catch (err) {
    console.warn('Non-blocking index ensure notice:', err.message);
  }
};

module.exports = ensureAllIndexes;
