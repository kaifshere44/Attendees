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
  console.log('=== TEST: DATE OF BIRTH (OPTIONAL) REGISTRATION & DB PERSISTENCE ===\n');
  const timestamp = Date.now().toString().slice(-4);

  // 1. Register student with Date of Birth provided
  const rollWithDob = `DOB_YES_${timestamp}`;
  const res1 = await postJson(`${API}/students/register`, {
    name: 'Student With DOB',
    rollNumber: rollWithDob,
    mobileNumber: `987651${timestamp}`,
    email: `dob_yes_${timestamp}@test.com`,
    branch: 'B.Tech (Robotics and AI)',
    semester: '4',
    dateOfBirth: '2003-08-21',
  });
  assert(res1.status === 201, `Status should be 201, got ${res1.status}`);
  console.log('[PASS] Student with Date of Birth registered successfully');

  // 2. Register student with Date of Birth omitted (optional)
  const rollWithoutDob = `DOB_NO_${timestamp}`;
  const res2 = await postJson(`${API}/students/register`, {
    name: 'Student Without DOB',
    rollNumber: rollWithoutDob,
    mobileNumber: `987652${timestamp}`,
    email: `dob_no_${timestamp}@test.com`,
    branch: 'BCA (H)',
    semester: '2',
  });
  assert(res2.status === 201, `Status should be 201, got ${res2.status}`);
  console.log('[PASS] Student without Date of Birth registered successfully (optional field)');

  // 3. Inspect in DB via Super Admin
  const loginRes = await postJson(`${API}/auth/login`, {
    username: 'super_admin',
    password: 'ChangeThisPassword123!',
  });
  const token = loginRes.data.token;

  const studentsRes = await getJson(`${API}/students?limit=20`, {
    Authorization: `Bearer ${token}`
  });
  const students = studentsRes.data.students;

  const foundWith = students.find(s => s.rollNumber === rollWithDob);
  assert(foundWith, 'Student with DOB found in DB');
  assert(foundWith.dateOfBirth === '2003-08-21', `Expected DOB 2003-08-21, got ${foundWith.dateOfBirth}`);
  console.log('[PASS] DB verified: dateOfBirth correctly saved as "2003-08-21"');

  const foundWithout = students.find(s => s.rollNumber === rollWithoutDob);
  assert(foundWithout, 'Student without DOB found in DB');
  assert(!foundWithout.dateOfBirth, 'Expected dateOfBirth to be empty/undefined for omitted case');
  console.log('[PASS] DB verified: dateOfBirth omitted cleanly when not provided');

  console.log('\n====================================================');
  console.log('ALL DATE OF BIRTH TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
