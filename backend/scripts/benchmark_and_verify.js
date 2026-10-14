const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const config = {
    method: options.method || 'GET',
    headers,
  };
  if (options.body) {
    config.body = JSON.stringify(options.body);
  }
  const t0 = performance.now();
  const res = await fetch(url, config);
  const t1 = performance.now();
  const duration = Math.round((t1 - t0) * 100) / 100;
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.arrayBuffer().catch(() => null);
  }
  return {
    status: res.status,
    headers: res.headers,
    data,
    duration,
  };
}

async function runBenchmarkAndVerify() {
  console.log('========================================================================');
  console.log('      COMPREHENSIVE PERFORMANCE BENCHMARK & SYSTEM VERIFICATION         ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, condition, duration, details = '') {
    if (condition) {
      passed++;
      const timeStr = duration !== undefined ? ` [${duration} ms]` : '';
      console.log(`[PASS] ${name}${timeStr}${details ? ` -> ${details}` : ''}`);
    } else {
      failed++;
      console.error(`[FAIL] ${name} -> ${details}`);
    }
  }

  // 1. Health check (Pre-warm test)
  const healthRes = await request('/health');
  report('Health Check & Connection Pre-warm', healthRes.status === 200 && healthRes.data?.success === true, healthRes.duration);

  // 2. Roll number check for new student (unregistered)
  const randNum = Math.floor(10000 + Math.random() * 90000);
  const testRoll = `PERF${randNum}`;
  const testEmail = `perf_${randNum}@testmail.com`;

  const newStudentCheck1 = await request(`/students/check/${testRoll}`);
  report('Unregistered Student Check (First Miss)', newStudentCheck1.status === 200 && newStudentCheck1.data?.exists === false, newStudentCheck1.duration, 'X-Cache: ' + newStudentCheck1.headers.get('x-cache'));

  // 3. Repeated Roll number check (Cache Hit)
  const newStudentCheck2 = await request(`/students/check/${testRoll}`);
  report('Unregistered Student Check (Cache Hit)', newStudentCheck2.status === 200 && newStudentCheck2.data?.exists === false && newStudentCheck2.headers.get('x-cache') === 'HIT', newStudentCheck2.duration, 'X-Cache: HIT');

  // 4. Register new student
  const regRes = await request('/students/register', {
    method: 'POST',
    body: {
      name: 'Performance Test Student',
      rollNumber: testRoll,
      mobileNumber: '9876543210',
      email: testEmail,
      branch: 'B.Tech (Computer Science and Engineering)',
      semester: '6th Semester',
      dateOfBirth: '2003-08-15',
    },
  });
  report('Fast Student Registration', regRes.status === 201 && regRes.data?.success === true, regRes.duration, `Created ID: ${regRes.data?.student?.id}`);

  // 5. Check newly registered student (should immediately hit cache as existing student)
  const regCheck = await request(`/students/check/${testRoll}`);
  report('Newly Registered Student Lookup (Immediate Cache Hit)', regCheck.status === 200 && regCheck.data?.exists === true && regCheck.data?.student?.rollNumber === testRoll, regCheck.duration, 'X-Cache: ' + regCheck.headers.get('x-cache'));

  // 6. Duplicate registration prevention
  const dupReg = await request('/students/register', {
    method: 'POST',
    body: {
      name: 'Duplicate Student',
      rollNumber: testRoll,
      mobileNumber: '9876543210',
      email: testEmail,
      branch: 'B.Tech (Computer Science and Engineering)',
      semester: '6th Semester',
    },
  });
  report('Duplicate Student Registration Prevented', dupReg.status === 400, dupReg.duration, dupReg.data?.message);

  // 7. Super Admin Login
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      username: 'super_admin',
      password: 'ChangeThisPassword123!',
    },
  });
  report('Super Admin Authentication', loginRes.status === 200 && !!loginRes.data?.token, loginRes.duration);
  const token = loginRes.data?.token;

  // 8. Create a Session
  const createSessRes = await request('/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: {
      sessionName: `Perf Session ${randNum}`,
      durationMinutes: 10,
    },
  });
  report('Session Creation', createSessRes.status === 201 && !!createSessRes.data?.session?.id, createSessRes.duration, `PIN: ${createSessRes.data?.session?.pin}`);
  const sessionId = createSessRes.data?.session?.id;
  const sessionPin = createSessRes.data?.session?.pin;

  // 9. Open Session
  const openSessRes = await request(`/sessions/${sessionId}/open`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  report('Open Session', openSessRes.status === 200 && openSessRes.data?.session?.status === 'Open', openSessRes.duration);

  // 10. Direct 1-Step Attendance Marking with Roll Number and PIN
  const markRes = await request('/attendance/mark', {
    method: 'POST',
    body: {
      rollNumber: testRoll,
      pin: sessionPin,
    },
  });
  report('Direct 1-Step Attendance Marking', markRes.status === 201 && markRes.data?.success === true, markRes.duration, `Session: ${markRes.data?.attendance?.sessionName}`);

  // 11. Duplicate Attendance Prevention
  const dupMarkRes = await request('/attendance/mark', {
    method: 'POST',
    body: {
      rollNumber: testRoll,
      pin: sessionPin,
    },
  });
  report('Duplicate Attendance Prevented', dupMarkRes.status === 400 && dupMarkRes.data?.message?.includes('already marked'), dupMarkRes.duration);

  // 12. History Report with DB-level Filtering and Pagination
  const historyRes = await request(`/reports/history?sessionId=${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  report('History Report (DB-Level Filtering & Pagination)', historyRes.status === 200 && historyRes.data?.attendance?.length >= 1 && !!historyRes.data?.pagination, historyRes.duration, `Records: ${historyRes.data?.attendance?.length}`);

  // 13. Student Directory with Search and Pagination
  const studentSearchRes = await request(`/students?search=${testRoll}&page=1&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  report('Student Directory Search & Pagination', studentSearchRes.status === 200 && studentSearchRes.data?.students?.length === 1 && studentSearchRes.data?.pagination?.total >= 1, studentSearchRes.duration, `Found: ${studentSearchRes.data?.students?.[0]?.name}`);

  // 14. Student Birthdays Endpoint with Caching
  const bdayRes1 = await request('/students/birthdays', {
    headers: { Authorization: `Bearer ${token}` },
  });
  report('Student Birthdays (First Call)', bdayRes1.status === 200 && Array.isArray(bdayRes1.data?.students), bdayRes1.duration, 'X-Cache: ' + bdayRes1.headers.get('x-cache'));

  const bdayRes2 = await request('/students/birthdays', {
    headers: { Authorization: `Bearer ${token}` },
  });
  report('Student Birthdays (Cached Hit)', bdayRes2.status === 200 && bdayRes2.headers.get('x-cache') === 'HIT', bdayRes2.duration, 'X-Cache: HIT');

  // 15. Excel Report Download
  const excelRes = await request(`/reports/session/${sessionId}/excel`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  report('Session Attendance Excel Export (.xlsx)', excelRes.status === 200 && excelRes.data.byteLength > 1000, excelRes.duration, `${excelRes.data.byteLength} bytes`);

  // 16. PDF Report Download
  const pdfRes = await request(`/reports/session/${sessionId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  report('Session Attendance PDF Export (.pdf)', pdfRes.status === 200 && pdfRes.data.byteLength > 1000, pdfRes.duration, `${pdfRes.data.byteLength} bytes`);

  // 17. Close Session
  const closeSessRes = await request(`/sessions/${sessionId}/close`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  report('Close Session', closeSessRes.status === 200 && closeSessRes.data?.session?.status === 'Closed', closeSessRes.duration);

  console.log('\n========================================================================');
  console.log(`BENCHMARK COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBenchmarkAndVerify().catch((err) => {
  console.error('Benchmark fatal error:', err);
  process.exit(1);
});
