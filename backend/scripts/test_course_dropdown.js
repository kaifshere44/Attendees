const assert = require('assert');

const API = 'http://localhost:5000/api';

async function postJson(url, data, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, data: json };
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, {
    method: 'GET',
    headers,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, data: json };
}

async function runTests() {
  console.log('=== TEST: COURSE / PROGRAM REGISTRATION & DB PERSISTENCE ===\n');
  const timestamp = Date.now().toString().slice(-4);

  // 1. Test registration with a predefined option: B.Tech (Robotics and AI)
  const rollPredefined = `PREDEF_${timestamp}`;
  const emailPredefined = `predef_${timestamp}@test.com`;
  const res1 = await postJson(`${API}/students/register`, {
    name: 'Predefined Course Student',
    rollNumber: rollPredefined,
    mobileNumber: `987654${timestamp}`,
    email: emailPredefined,
    branch: 'B.Tech (Robotics and AI)',
    semester: '3',
  });
  if (res1.status !== 201) console.log('res1 error:', res1.data);
  assert(res1.status === 201, `Status should be 201, got ${res1.status}`);
  assert(res1.data.success === true, 'Registration should succeed');
  console.log('[PASS] Predefined course registered: B.Tech (Robotics and AI)');

  // 2. Test registration with separate option: BCA (H)
  const rollSeparate = `BCAH_${timestamp}`;
  const emailSeparate = `bcah_${timestamp}@test.com`;
  const res2 = await postJson(`${API}/students/register`, {
    name: 'Honours Student',
    rollNumber: rollSeparate,
    mobileNumber: `987653${timestamp}`,
    email: emailSeparate,
    branch: 'BCA (H)',
    semester: '1',
  });
  assert(res2.status === 201, `Status should be 201, got ${res2.status}`);
  console.log('[PASS] Distinct honours course registered: BCA (H)');

  // 3. Test registration with custom course via "Other" input
  const rollCustom = `CUSTOM_${timestamp}`;
  const emailCustom = `custom_${timestamp}@test.com`;
  const customCourseName = 'Master of Design (M.Des) - Interaction Design';
  const res3 = await postJson(`${API}/students/register`, {
    name: 'Custom Course Student',
    rollNumber: rollCustom,
    mobileNumber: `987652${timestamp}`,
    email: emailCustom,
    branch: customCourseName,
    semester: '1',
  });
  assert(res3.status === 201, `Status should be 201, got ${res3.status}`);
  console.log(`[PASS] Custom course registered: "${customCourseName}"`);

  // 4. Authenticate as Super Admin and inspect the persisted records in DB
  const loginRes = await postJson(`${API}/auth/login`, {
    username: 'super_admin',
    password: 'ChangeThisPassword123!',
  });
  const token = loginRes.data.token;

  const studentsRes = await getJson(`${API}/students?limit=20`, {
    Authorization: `Bearer ${token}`
  });
  const students = studentsRes.data.students;

  const foundPredefined = students.find(s => s.rollNumber === rollPredefined);
  assert(foundPredefined, 'Predefined student found in DB');
  assert(foundPredefined.branch === 'B.Tech (Robotics and AI)', 'Predefined branch correctly stored');
  console.log('[PASS] DB verified: Predefined branch exact match in DB');

  const foundSeparate = students.find(s => s.rollNumber === rollSeparate);
  assert(foundSeparate, 'BCA (H) student found in DB');
  assert(foundSeparate.branch === 'BCA (H)', 'BCA (H) branch correctly stored');
  console.log('[PASS] DB verified: Distinct BCA (H) branch exact match in DB');

  const foundCustom = students.find(s => s.rollNumber === rollCustom);
  assert(foundCustom, 'Custom student found in DB');
  assert(foundCustom.branch === customCourseName, 'Custom course correctly stored in branch field');
  console.log('[PASS] DB verified: Custom course name stored cleanly in DB');

  console.log('\n====================================================');
  console.log('ALL COURSE DROPDOWN & CUSTOM INPUT TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
