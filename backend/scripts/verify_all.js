const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const headers = options.headers || {};
    let body = options.body;
    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(url, {
      method: options.method || 'GET',
      headers,
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let data = buffer.toString('utf8');
        try {
          data = JSON.parse(data);
        } catch {}
        resolve({ status: res.statusCode, headers: res.headers, data, buffer });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING COMPLETE AUDIT & VERIFICATION TEST ===\n');
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failCount++;
    }
  }

  try {
    // 1. Health check
    const health = await request('/health');
    assert(health.status === 200 && health.data.success === true, 'Health check returns 200 OK');

    // 2. Standard Admin Login
    const stdLogin = await request('/auth/login', {
      method: 'POST',
      body: { username: 'standard_admin', password: 'ChangeThisPassword123!' }
    });
    assert(stdLogin.status === 200 && stdLogin.data.success === true, 'Standard Admin login succeeds');
    const stdToken = stdLogin.data.token;

    // 3. Super Admin Login
    const supLogin = await request('/auth/login', {
      method: 'POST',
      body: { username: 'super_admin', password: 'ChangeThisPassword123!' }
    });
    assert(supLogin.status === 200 && supLogin.data.success === true, 'Super Admin login succeeds');
    const supToken = supLogin.data.token;

    // 4. Invalid credentials check
    const badLogin = await request('/auth/login', {
      method: 'POST',
      body: { username: 'standard_admin', password: 'WrongPassword' }
    });
    assert(badLogin.status === 401, 'Invalid login credentials rejected with 401');

    // 5. Student Registration & Validation
    const testRoll = 'TEST' + Math.floor(1000 + Math.random() * 9000);
    const testEmail = `student_${testRoll.toLowerCase()}@example.com`;
    const regRes = await request('/students/register', {
      method: 'POST',
      body: {
        name: 'Audit Test Student',
        rollNumber: testRoll,
        mobileNumber: '9876543210',
        email: testEmail,
        branch: 'Computer Science',
        semester: '6',
        academicYear: '2025-2026'
      }
    });
    assert(regRes.status === 201 && regRes.data.success === true, 'New student registration succeeds');

    // 6. Duplicate Roll Number Rejected
    const dupRes = await request('/students/register', {
      method: 'POST',
      body: {
        name: 'Duplicate Student',
        rollNumber: testRoll,
        mobileNumber: '9876543211',
        email: 'different_' + testEmail,
        branch: 'IT',
        semester: '6'
      }
    });
    assert(dupRes.status === 400, 'Duplicate roll number registration rejected with 400');

    // 7. Check Roll Number
    const checkRes = await request(`/students/check/${testRoll}`);
    assert(checkRes.status === 200 && checkRes.data.exists === true, 'checkRollNumber detects existing student');

    // 8. Create Session with Timer Duration (no start/end time, date omitted)
    const sessionRes = await request('/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stdToken}` },
      body: {
        sessionName: 'Calculus Advanced Lecture',
        durationMinutes: 15,
        // sessionDate omitted to verify it is optional
      }
    });
    assert(sessionRes.status === 201 && sessionRes.data.success === true, 'Session created successfully with durationMinutes and optional date');
    assert(sessionRes.data.session.durationMinutes === 15, 'Session stored durationMinutes correctly');
    const sessionId = sessionRes.data.session.id;

    // 9. Open Session
    const openRes = await request(`/sessions/${sessionId}/open`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${stdToken}` }
    });
    assert(openRes.status === 200 && openRes.data.success === true, 'Session opened successfully');

    // 10. Get Active Session
    const activeRes = await request('/sessions/active', {
      headers: { Authorization: `Bearer ${stdToken}` }
    });
    assert(activeRes.status === 200 && activeRes.data.session?.id === sessionId, 'Active session fetched correctly');
    const sessionPin = activeRes.data.session.pin;
    assert(!!sessionPin, 'Session PIN is available to admin');

    // 11. Student PIN Verification
    const pinRes = await request('/attendance/verify-pin', {
      method: 'POST',
      body: { pin: sessionPin }
    });
    assert(pinRes.status === 200 && pinRes.data.success === true, 'Student PIN verification succeeds with valid PIN');

    // 12. Student PIN Verification with Invalid PIN
    const badPinRes = await request('/attendance/verify-pin', {
      method: 'POST',
      body: { pin: '000000' }
    });
    assert(badPinRes.status === 400, 'Student PIN verification fails with invalid PIN');

    // 13. Mark Attendance
    const markRes = await request('/attendance/mark', {
      method: 'POST',
      body: {
        sessionId: sessionId,
        rollNumber: testRoll
      }
    });
    assert(markRes.status === 201 && markRes.data.success === true, 'Student attendance marked successfully');

    // 14. Duplicate Attendance Prevention
    const dupAttRes = await request('/attendance/mark', {
      method: 'POST',
      body: {
        sessionId: sessionId,
        rollNumber: testRoll
      }
    });
    assert(dupAttRes.status === 400, 'Duplicate attendance in same session rejected with 400');

    // 15. Check Session Attendance from Admin API
    const attListRes = await request(`/attendance/session/${sessionId}`, {
      headers: { Authorization: `Bearer ${stdToken}` }
    });
    assert(attListRes.status === 200 && attListRes.data.attendance.length >= 1, 'Session attendance list contains marked student');

    // 16. Standard Admin Restricted from Reports/Exports (403 Forbidden)
    const stdExportRes = await request(`/reports/session/${sessionId}/excel`, {
      headers: { Authorization: `Bearer ${stdToken}` }
    });
    assert(stdExportRes.status === 403, 'Standard Admin blocked with 403 from export API');

    // 17. Super Admin Authorized Session Excel Export
    const supExcelRes = await request(`/reports/session/${sessionId}/excel`, {
      headers: { Authorization: `Bearer ${supToken}` }
    });
    assert(supExcelRes.status === 200 && supExcelRes.buffer.length > 500, 'Super Admin Session Excel export returns valid spreadsheet');
    const excelDisposition = supExcelRes.headers['content-disposition'] || '';
    assert(excelDisposition.includes('Calculus_Advanced_Lecture.xlsx'), 'Excel filename matches session name in Content-Disposition');

    // 18. Super Admin Authorized Session PDF Export
    const supPdfRes = await request(`/reports/session/${sessionId}/pdf`, {
      headers: { Authorization: `Bearer ${supToken}` }
    });
    const isPdfHeader = supPdfRes.buffer.slice(0, 5).toString() === '%PDF-';
    assert(supPdfRes.status === 200 && isPdfHeader, 'Super Admin Session PDF export returns valid %PDF- binary file');
    const pdfDisposition = supPdfRes.headers['content-disposition'] || '';
    assert(pdfDisposition.includes('Calculus_Advanced_Lecture.pdf'), 'PDF filename matches session name in Content-Disposition');

    // 19. Super Admin All Students PDF Export
    const allPdfRes = await request('/reports/students/pdf', {
      headers: { Authorization: `Bearer ${supToken}` }
    });
    const isAllPdfHeader = allPdfRes.buffer.slice(0, 5).toString() === '%PDF-';
    assert(allPdfRes.status === 200 && isAllPdfHeader, 'Super Admin All Students PDF export returns valid %PDF- binary file');

    // 20. Super Admin All Students Excel Export
    const allExcelRes = await request('/reports/students/excel', {
      headers: { Authorization: `Bearer ${supToken}` }
    });
    assert(allExcelRes.status === 200 && allExcelRes.buffer.length > 500, 'Super Admin All Students Excel export returns valid spreadsheet');

    // 21. Close Session
    const closeRes = await request(`/sessions/${sessionId}/close`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${stdToken}` }
    });
    assert(closeRes.status === 200 && closeRes.data.success === true, 'Session closed successfully');

    // 22. Historical attendance remains intact after closing session
    const histAttRes = await request(`/attendance/session/${sessionId}`, {
      headers: { Authorization: `Bearer ${stdToken}` }
    });
    assert(histAttRes.status === 200 && histAttRes.data.attendance.length >= 1, 'Historical attendance records persist after closing session');

  } catch (err) {
    console.error('Test execution error:', err);
    failCount++;
  }

  console.log(`\n=== TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED ===`);
  process.exit(failCount === 0 ? 0 : 1);
}

runTests();
