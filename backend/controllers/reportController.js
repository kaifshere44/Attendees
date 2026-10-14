const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Session = require('../models/Session');
const ExcelJS = require('exceljs');
const { jsPDF } = require('jspdf');
const { autoTable } = require('jspdf-autotable');

// Format date and time as DD/MM/YYYY HH:MM AM/PM
const formatAttendanceDateTime = (dateInput) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`;
};

// Sanitize filename preserving session name (e.g., 'DSA Workshop' -> 'DSA_Workshop')
const sanitizeSessionFilename = (sessionName) => {
  if (!sessionName || typeof sessionName !== 'string') {
    return 'Session';
  }
  let clean = sessionName
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
  clean = clean.replace(/^[._]+|[._]+$/g, '');
  return clean || 'Session';
};

// @desc    Export session attendance to Excel (.xlsx)
// @route   GET /api/reports/session/:sessionId/excel
// @access  Private (Super Admin)
const exportSessionExcel = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only students who attended this specific session
    const attendance = await Attendance.find({ sessionId })
      .populate('studentId', 'name rollNumber branch')
      .sort({ attendanceTimestamp: 1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Attendance Management System';
    workbook.created = new Date();

    const wsName = session.sessionName.slice(0, 31).replace(/[:\\/?*[\]]/g, '') || 'Attendance';
    const worksheet = workbook.addWorksheet(wsName, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // Exact required columns:
    // 1. Sr. No.
    // 2. Student Name
    // 3. Roll Number
    // 4. Branch/Course
    // 5. Attendance Date & Time
    worksheet.columns = [
      { header: 'Sr. No.', key: 'srNo', width: 10 },
      { header: 'Student Name', key: 'name', width: 28 },
      { header: 'Roll Number', key: 'rollNumber', width: 18 },
      { header: 'Branch/Course', key: 'branch', width: 24 },
      { header: 'Attendance Date & Time', key: 'timestamp', width: 28 },
    ];

    attendance.forEach((record, index) => {
      worksheet.addRow({
        srNo: index + 1,
        name: record.studentId?.name || 'N/A',
        rollNumber: record.studentId?.rollNumber || 'N/A',
        branch: record.studentId?.branch || 'N/A',
        timestamp: formatAttendanceDateTime(record.attendanceTimestamp),
      });
    });

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1C2841' }, // Dark Navy
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Style data rows & borders
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.height = 20;
        row.getCell('srNo').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('rollNumber').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('branch').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('timestamp').alignment = { vertical: 'middle', horizontal: 'center' };
      }
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    const filename = `${sanitizeSessionFilename(session.sessionName)}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('exportSessionExcel error:', error);
    res.status(500).json({ message: 'Server error generating Excel report' });
  }
};

// @desc    Export session attendance to PDF (.pdf)
// @route   GET /api/reports/session/:sessionId/pdf
// @access  Private (Super Admin)
const exportSessionPdf = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only students who attended this specific session
    const attendance = await Attendance.find({ sessionId })
      .populate('studentId', 'name rollNumber branch')
      .sort({ attendanceTimestamp: 1 })
      .lean();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Report Header
    doc.setFontSize(18);
    doc.setTextColor(28, 40, 65);
    doc.text('Session Attendance Report', 14, 18);

    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text(`Session: ${session.sessionName}`, 14, 26);

    doc.setFontSize(9.5);
    doc.setTextColor(100, 100, 100);
    const sessionDateStr = session.sessionDate ? new Date(session.sessionDate).toLocaleDateString() : 'N/A';
    doc.text(`Date: ${sessionDateStr}   |   Timer: ${session.durationMinutes || 10} Mins   |   Total Present: ${attendance.length}`, 14, 33);
    doc.text(`Generated: ${formatAttendanceDateTime(new Date())}`, 14, 39);

    // Accent Line
    doc.setDrawColor(28, 40, 65);
    doc.setLineWidth(0.6);
    doc.line(14, 42, doc.internal.pageSize.width - 14, 42);

    // Table Data
    const tableData = attendance.map((record, index) => [
      index + 1,
      record.studentId?.name || 'N/A',
      record.studentId?.rollNumber || 'N/A',
      record.studentId?.branch || 'N/A',
      formatAttendanceDateTime(record.attendanceTimestamp),
    ]);

    if (tableData.length === 0) {
      tableData.push(['-', 'No attendance records found for this session', '-', '-', '-']);
    }

    autoTable(doc, {
      startY: 46,
      showHead: 'everyPage',
      head: [['Sr. No.', 'Student Name', 'Roll Number', 'Branch/Course', 'Attendance Date & Time']],
      body: tableData,
      margin: { top: 46, bottom: 20, left: 14, right: 14 },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
        textColor: [40, 40, 40],
      },
      headStyles: {
        fillColor: [28, 40, 65],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 16 },
        1: { halign: 'left', cellWidth: 50 },
        2: { halign: 'left', cellWidth: 32 },
        3: { halign: 'left', cellWidth: 38 },
        4: { halign: 'center', cellWidth: 46 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    // Multi-page numbers & footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 25,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        'Attendance Management System',
        14,
        doc.internal.pageSize.height - 10
      );
    }

    const filename = `${sanitizeSessionFilename(session.sessionName)}.pdf`;
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('exportSessionPdf error:', error);
    res.status(500).json({ message: 'Server error generating PDF report' });
  }
};

// @desc    Export all registered students to Excel (.xlsx)
// @route   GET /api/reports/students/excel
// @access  Private (Super Admin)
const exportStudentsExcel = async (req, res) => {
  try {
    const students = await Student.find().sort({ rollNumber: 1 }).lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Attendance Management System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('All Students', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // Exact required columns:
    // 1. Sr. No.
    // 2. Student Name
    // 3. Roll Number
    // 4. Branch/Course
    // 5. Mobile Number
    // 6. Email ID
    worksheet.columns = [
      { header: 'Sr. No.', key: 'srNo', width: 10 },
      { header: 'Student Name', key: 'name', width: 28 },
      { header: 'Roll Number', key: 'rollNumber', width: 18 },
      { header: 'Branch/Course', key: 'branch', width: 24 },
      { header: 'Mobile Number', key: 'mobileNumber', width: 18 },
      { header: 'Email ID', key: 'email', width: 32 },
    ];

    students.forEach((student, index) => {
      worksheet.addRow({
        srNo: index + 1,
        name: student.name || 'N/A',
        rollNumber: student.rollNumber || 'N/A',
        branch: student.branch || 'N/A',
        mobileNumber: student.mobileNumber || 'N/A',
        email: student.email || 'N/A',
      });
    });

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1C2841' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Style data rows & borders
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.height = 20;
        row.getCell('srNo').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('rollNumber').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('branch').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('mobileNumber').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('email').alignment = { vertical: 'middle', horizontal: 'left' };
      }
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    const filename = 'All_Students.xlsx';
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('exportStudentsExcel error:', error);
    res.status(500).json({ message: 'Server error generating All Students Excel' });
  }
};

// @desc    Export all registered students to PDF (.pdf)
// @route   GET /api/reports/students/pdf
// @access  Private (Super Admin)
const exportStudentsPdf = async (req, res) => {
  try {
    const students = await Student.find().sort({ rollNumber: 1 }).lean();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Title & Header
    doc.setFontSize(18);
    doc.setTextColor(28, 40, 65);
    doc.text('Registered Students Directory', 14, 18);

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Registered Students: ${students.length}`, 14, 26);

    doc.setFontSize(9.5);
    doc.setTextColor(110, 110, 110);
    doc.text(`Generated on: ${formatAttendanceDateTime(new Date())}`, 14, 33);

    // Accent Line
    doc.setDrawColor(28, 40, 65);
    doc.setLineWidth(0.6);
    doc.line(14, 36, doc.internal.pageSize.width - 14, 36);

    const tableData = students.map((student, index) => [
      index + 1,
      student.name || 'N/A',
      student.rollNumber || 'N/A',
      student.branch || 'N/A',
      student.mobileNumber || 'N/A',
      student.email || 'N/A',
    ]);

    if (tableData.length === 0) {
      tableData.push(['-', 'No registered students found', '-', '-', '-', '-']);
    }

    autoTable(doc, {
      startY: 40,
      showHead: 'everyPage',
      head: [['Sr. No.', 'Student Name', 'Roll Number', 'Branch/Course', 'Mobile Number', 'Email ID']],
      body: tableData,
      margin: { top: 40, bottom: 20, left: 14, right: 14 },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.8,
        overflow: 'linebreak',
        textColor: [40, 40, 40],
      },
      headStyles: {
        fillColor: [28, 40, 65],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 14 },
        1: { halign: 'left', cellWidth: 40 },
        2: { halign: 'left', cellWidth: 28 },
        3: { halign: 'left', cellWidth: 30 },
        4: { halign: 'center', cellWidth: 28 },
        5: { halign: 'left', cellWidth: 42 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 25,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        'Attendance Management System',
        14,
        doc.internal.pageSize.height - 10
      );
    }

    const filename = 'All_Students.pdf';
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('exportStudentsPdf error:', error);
    res.status(500).json({ message: 'Server error generating All Students PDF' });
  }
};

// @desc    Get attendance history with filters (optimized with DB-level student query and pagination)
// @route   GET /api/reports/history
// @access  Private (Super Admin)
const getHistory = async (req, res) => {
  try {
    const { sessionId, startDate, endDate, rollNumber, studentName, branch, semester } = req.query;

    let query = {};

    if (sessionId && sessionId.trim()) {
      query.sessionId = sessionId.trim();
    }

    if (startDate || endDate) {
      query.attendanceTimestamp = {};
      if (startDate) {
        query.attendanceTimestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.attendanceTimestamp.$lte = new Date(endDate);
      }
    }

    // Filter by student attributes at DB level using indexed student queries
    const studentQuery = {};
    if (rollNumber && rollNumber.trim()) {
      studentQuery.rollNumber = new RegExp(rollNumber.trim(), 'i');
    }
    if (studentName && studentName.trim()) {
      studentQuery.name = new RegExp(studentName.trim(), 'i');
    }
    if (branch && branch.trim()) {
      studentQuery.branch = new RegExp(branch.trim(), 'i');
    }
    if (semester && semester.trim()) {
      studentQuery.semester = new RegExp(semester.trim(), 'i');
    }

    if (Object.keys(studentQuery).length > 0) {
      const matchingStudents = await Student.find(studentQuery).select('_id').lean();
      const studentIds = matchingStudents.map(s => s._id);
      query.studentId = { $in: studentIds };
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const skip = (page - 1) * limit;

    const [attendance, total] = await Promise.all([
      Attendance.find(query)
        .populate('studentId', 'name rollNumber mobileNumber email branch semester')
        .populate('sessionId', 'sessionName sessionDate')
        .sort({ attendanceTimestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(query),
    ]);

    res.json({
      success: true,
      attendance,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('getHistory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  exportSessionExcel,
  exportSessionPdf,
  exportStudentsExcel,
  exportStudentsPdf,
  getHistory,
};
