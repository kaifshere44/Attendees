const http = require('http');
const ExcelJS = require('exceljs');

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

async function runDownloadTests() {
  console.log('=== RIGOROUS VALIDATION: EXCEL & PDF DOWNLOAD SYSTEM ===\n');
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
    // 1. Authenticate Admins
    const supLogin = await request('/auth/login', {
      method: 'POST',
      body: { username: 'super_admin', password: 'ChangeThisPassword123!' }
    });
    assert(supLogin.status === 200 && supLogin.data.token, 'Super Admin authenticated successfully');
    const supToken = supLogin.data.token;

    const stdLogin = await request('/auth/login', {
      method: 'POST',
      body: { username: 'standard_admin', password: 'ChangeThisPassword123!' }
    });
    assert(stdLogin.status === 200 && stdLogin.data.token, 'Standard Admin authenticated successfully');
    const stdToken = stdLogin.data.token;

    // 2. Create Session named "DSA Workshop"
    const sessionRes = await request('/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${supToken}` },
      body: {
        sessionName: 'DSA Workshop',
        durationMinutes: 10,
      }
    });
    assert(sessionRes.status === 201 && sessionRes.data.success, 'Session "DSA Workshop" created');
    const sessionId = sessionRes.data.session.id;

    // Open session
    const openRes = await request(`/sessions/${sessionId}/open`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${supToken}` }
    });
    assert(openRes.status === 200 && openRes.data.session.status === 'Open', 'Session opened with active timer');
    const sessionPin = (await request('/sessions/active', { headers: { Authorization: `Bearer ${supToken}` } })).data.session.pin;

    // 3. Register a student and mark attendance
    const testRoll = 'DSA' + Math.floor(1000 + Math.random() * 9000);
    await request('/students/register', {
      method: 'POST',
      body: {
        name: 'Aarav Sharma',
        rollNumber: testRoll,
        mobileNumber: '9876543210',
        email: `aarav_${testRoll.toLowerCase()}@test.edu`,
        branch: 'Computer Science',
        semester: '6'
      }
    });

    const verifyPinRes = await request('/attendance/verify-pin', {
      method: 'POST',
      body: { pin: sessionPin }
    });
    assert(verifyPinRes.status === 200, 'Student PIN verified');

    const markRes = await request('/attendance/mark', {
      method: 'POST',
      body: { sessionId, rollNumber: testRoll }
    });
    assert(markRes.status === 201, 'Student attendance marked in "DSA Workshop"');

    // ----------------------------------------------------
    // TEST CASE 1: Session-wise Excel Download
    // ----------------------------------------------------
    console.log('\n--- Validating Case 1: Session-wise Excel ---');
    const sessExcelRes = await request(`/reports/session/${sessionId}/excel`, {
      headers: { Authorization: `Bearer ${supToken}` }
    });
    assert(sessExcelRes.status === 200, 'Session Excel endpoint returns HTTP 200');
    assert(sessExcelRes.headers['content-type'] === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Type is correct Excel MIME');
    
    const sessExcelDisp = sessExcelRes.headers['content-disposition'] || '';
    assert(sessExcelDisp.includes('filename="DSA_Workshop.xlsx"'), `Filename is "DSA_Workshop.xlsx" in Content-Disposition (Got: ${sessExcelDisp})`);

    // Parse with ExcelJS to prove it is a genuine, uncorrupted Excel workbook
    const sessWb = new ExcelJS.Workbook();
    await sessWb.xlsx.load(sessExcelRes.buffer);
    assert(sessWb.worksheets.length >= 1, 'Excel file is a valid workbook with worksheets');
    
    const sessWs = sessWb.worksheets[0];
    const headerRow = sessWs.getRow(1);
    const headers = [
      headerRow.getCell(1).value,
      headerRow.getCell(2).value,
      headerRow.getCell(3).value,
      headerRow.getCell(4).value,
      headerRow.getCell(5).value,
    ];
    console.log('Session Excel headers found:', headers);
    assert(headers[0] === 'Sr. No.', 'Column 1 is "Sr. No."');
    assert(headers[1] === 'Student Name', 'Column 2 is "Student Name"');
    assert(headers[2] === 'Roll Number', 'Column 3 is "Roll Number"');
    assert(headers[3] === 'Branch/Course', 'Column 4 is "Branch/Course"');
    assert(headers[4] === 'Attendance Date & Time', 'Column 5 is "Attendance Date & Time"');
    assert(!headers.includes('Mobile Number'), 'Session Excel strictly excludes Mobile Number');
    assert(!headers.includes('Email ID') && !headers.includes('Email'), 'Session Excel strictly excludes Email');
    assert(!headers.includes('Section'), 'Session Excel strictly excludes Section');
    assert(!headers.includes('Status'), 'Session Excel strictly excludes Status');
    assert(!headers.includes('Semester'), 'Session Excel strictly excludes Semester');

    // Check data row formatting
    const dataRow = sessWs.getRow(2);
    const dateVal = dataRow.getCell(5).value;
    console.log('Session Excel attendance timestamp string:', dateVal);
    const dateRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} (AM|PM)$/;
    assert(dateRegex.test(dateVal), `Timestamp format matches DD/MM/YYYY HH:MM AM/PM (Got: ${dateVal})`);
    assert(dataRow.getCell(2).value === 'Aarav Sharma', 'Student name is Aarav Sharma');
    assert(dataRow.getCell(3).value === testRoll, `Roll number matches ${testRoll}`);
    assert(dataRow.getCell(4).value === 'Computer Science', 'Branch matches Computer Science');

    // Check freeze header row view
    const views = sessWs.views || [];
    assert(views.some(v => v.state === 'frozen' && v.ySplit === 1), 'Header row is frozen');

    // ----------------------------------------------------
    // TEST CASE 2: Session-wise PDF Download
    // ----------------------------------------------------
    console.log('\n--- Validating Case 2: Session-wise PDF ---');
    const sessPdfRes = await request(`/reports/session/${sessionId}/pdf`, {
      headers: { Authorization: `Bearer ${supToken}` }
    });
    assert(sessPdfRes.status === 200, 'Session PDF endpoint returns HTTP 200');
    assert(sessPdfRes.headers['content-type'] === 'application/pdf', 'Content-Type is application/pdf');

    const sessPdfDisp = sessPdfRes.headers['content-disposition'] || '';
    assert(sessPdfDisp.includes('filename="DSA_Workshop.pdf"'), `Filename is "DSA_Workshop.pdf" in Content-Disposition (Got: ${sessPdfDisp})`);

    // Verify valid PDF binary structure
    const isPdfMagic = sessPdfRes.buffer.slice(0, 5).toString('utf8') === '%PDF-';
    assert(isPdfMagic, 'File starts with standard %PDF- magic bytes');
    assert(sessPdfRes.buffer.length > 2000, `PDF size is valid and substantial (${sessPdfRes.buffer.length} bytes)`);

    // Check text in raw PDF stream
    const pdfText = sessPdfRes.buffer.toString('latin1');
    assert(pdfText.includes('Session Attendance Report'), 'PDF contains report title');
    assert(pdfText.includes('DSA Workshop'), 'PDF contains session name "DSA Workshop"');
    assert(pdfText.includes('Branch/Course'), 'PDF contains "Branch/Course" column header');
    assert(pdfText.includes('Attendance Date & Time'), 'PDF contains "Attendance Date & Time" header');
    assert(!pdfText.includes('Mobile Number'), 'Session PDF strictly excludes "Mobile Number" header');
    assert(!pdfText.includes('Email ID'), 'Session PDF strictly excludes "Email ID" header');

    // ----------------------------------------------------
    // TEST CASE 3: All Students Excel Download
    // ----------------------------------------------------
    console.log('\n--- Validating Case 3: All Students Excel ---');
    const allExcelRes = await request('/reports/students/excel', {
      headers: { Authorization: `Bearer ${supToken}` }
    });
    assert(allExcelRes.status === 200, 'All Students Excel endpoint returns HTTP 200');
    assert(allExcelRes.headers['content-type'] === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Type is correct Excel MIME');

    const allExcelDisp = allExcelRes.headers['content-disposition'] || '';
    assert(allExcelDisp.includes('filename="All_Students.xlsx"'), `Filename is "All_Students.xlsx" in Content-Disposition (Got: ${allExcelDisp})`);

    const allWb = new ExcelJS.Workbook();
    await allWb.xlsx.load(allExcelRes.buffer);
    const allWs = allWb.getWorksheet('All Students') || allWb.worksheets[0];
    const allHeaders = [
      allWs.getRow(1).getCell(1).value,
      allWs.getRow(1).getCell(2).value,
      allWs.getRow(1).getCell(3).value,
      allWs.getRow(1).getCell(4).value,
      allWs.getRow(1).getCell(5).value,
      allWs.getRow(1).getCell(6).value,
    ];
    console.log('All Students Excel headers found:', allHeaders);
    assert(allHeaders[0] === 'Sr. No.', 'Column 1 is "Sr. No."');
    assert(allHeaders[1] === 'Student Name', 'Column 2 is "Student Name"');
    assert(allHeaders[2] === 'Roll Number', 'Column 3 is "Roll Number"');
    assert(allHeaders[3] === 'Branch/Course', 'Column 4 is "Branch/Course"');
    assert(allHeaders[4] === 'Mobile Number', 'Column 5 is "Mobile Number" (included for All Students)');
    assert(allHeaders[5] === 'Email ID', 'Column 6 is "Email ID" (included for All Students)');

    // ----------------------------------------------------
    // TEST CASE 4: All Students PDF Download
    // ----------------------------------------------------
    console.log('\n--- Validating Case 4: All Students PDF ---');
    const allPdfRes = await request('/reports/students/pdf', {
      headers: { Authorization: `Bearer ${supToken}` }
    });
    assert(allPdfRes.status === 200, 'All Students PDF endpoint returns HTTP 200');
    assert(allPdfRes.headers['content-type'] === 'application/pdf', 'Content-Type is application/pdf');

    const allPdfDisp = allPdfRes.headers['content-disposition'] || '';
    assert(allPdfDisp.includes('filename="All_Students.pdf"'), `Filename is "All_Students.pdf" in Content-Disposition (Got: ${allPdfDisp})`);

    const isAllPdfMagic = allPdfRes.buffer.slice(0, 5).toString('utf8') === '%PDF-';
    assert(isAllPdfMagic, 'File starts with standard %PDF- magic bytes');
    const allPdfText = allPdfRes.buffer.toString('latin1');
    assert(allPdfText.includes('Registered Students Directory'), 'PDF contains title "Registered Students Directory"');
    assert(allPdfText.includes('Mobile Number'), 'All Students PDF includes Mobile Number');
    assert(allPdfText.includes('Email ID'), 'All Students PDF includes Email ID');

    // ----------------------------------------------------
    // TEST CASE 5: Empty Session Handling
    // ----------------------------------------------------
    console.log('\n--- Validating Case 5: Empty Session Handling ---');
    const emptySessRes = await request('/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${supToken}` },
      body: { sessionName: 'Empty Seminar', durationMinutes: 5 }
    });
    const emptyId = emptySessRes.data.session.id;

    const emptyExcel = await request(`/reports/session/${emptyId}/excel`, {
      headers: { Authorization: `Bearer ${supToken}` }
    });
    assert(emptyExcel.status === 200, 'Empty session Excel export succeeds with HTTP 200');
    const emptyWb = new ExcelJS.Workbook();
    await emptyWb.xlsx.load(emptyExcel.buffer);
    assert(emptyWb.worksheets[0].rowCount === 1, 'Empty session Excel contains header row cleanly');

    const emptyPdf = await request(`/reports/session/${emptyId}/pdf`, {
      headers: { Authorization: `Bearer ${supToken}` }
    });
    assert(emptyPdf.status === 200, 'Empty session PDF export succeeds with HTTP 200');
    const emptyPdfText = emptyPdf.buffer.toString('latin1');
    assert(emptyPdfText.includes('No attendance records found'), 'Empty session PDF includes friendly empty table message');

    // ----------------------------------------------------
    // TEST CASE 6: Security & Role Authorization
    // ----------------------------------------------------
    console.log('\n--- Validating Case 6: Security & Role Authorization ---');
    const stdExc = await request(`/reports/session/${sessionId}/excel`, { headers: { Authorization: `Bearer ${stdToken}` } });
    assert(stdExc.status === 403, 'Standard Admin blocked with 403 from session Excel');

    const stdPdf = await request(`/reports/session/${sessionId}/pdf`, { headers: { Authorization: `Bearer ${stdToken}` } });
    assert(stdPdf.status === 403, 'Standard Admin blocked with 403 from session PDF');

    const stdAllExc = await request('/reports/students/excel', { headers: { Authorization: `Bearer ${stdToken}` } });
    assert(stdAllExc.status === 403, 'Standard Admin blocked with 403 from students Excel');

    const stdAllPdf = await request('/reports/students/pdf', { headers: { Authorization: `Bearer ${stdToken}` } });
    assert(stdAllPdf.status === 403, 'Standard Admin blocked with 403 from students PDF');

    const noAuthExc = await request(`/reports/session/${sessionId}/excel`);
    assert(noAuthExc.status === 401, 'Unauthenticated request rejected with 401');

    // ----------------------------------------------------
    // TEST CASE 7: Error Response Integrity
    // ----------------------------------------------------
    console.log('\n--- Validating Case 7: Error Response Integrity ---');
    const badIdRes = await request('/reports/session/000000000000000000000000/excel', {
      headers: { Authorization: `Bearer ${supToken}` }
    });
    assert(badIdRes.status === 404, 'Invalid session ID returns 404');
    assert(badIdRes.data.message === 'Session not found', 'Returns JSON message "Session not found" without corrupting file streams');

  } catch (err) {
    console.error('Validation test encountered unexpected error:', err);
    failCount++;
  }

  console.log(`\n====================================================`);
  console.log(`VALIDATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log(`====================================================\n`);
  process.exit(failCount === 0 ? 0 : 1);
}

runDownloadTests();
