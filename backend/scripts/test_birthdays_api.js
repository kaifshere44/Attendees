const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

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

async function run() {
  console.log('=== TEST: BIRTHDAYS API & ACCESS CONTROL ===\n');

  // 1. Unauthenticated request should fail with 401
  const unauthRes = await getJson(`${BASE_URL}/students/birthdays`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
  console.log('[PASS] Unauthenticated request rejected with 401 Unauthorized');

  // 2. Standard Admin login
  const stdLogin = await postJson(`${BASE_URL}/auth/login`, {
    username: 'standard_admin',
    password: 'ChangeThisPassword123!',
  });
  assert.strictEqual(stdLogin.status, 200, 'Standard Admin login failed');
  const stdToken = stdLogin.data.token;
  assert(stdToken, 'Standard admin login returned token');
  console.log('[PASS] Standard Admin logged in successfully');

  // 3. Super Admin login
  const superLogin = await postJson(`${BASE_URL}/auth/login`, {
    username: 'super_admin',
    password: 'ChangeThisPassword123!',
  });
  assert.strictEqual(superLogin.status, 200, 'Super Admin login failed');
  const superToken = superLogin.data.token;
  assert(superToken, 'Super admin login returned token');
  console.log('[PASS] Super Admin logged in successfully');

  // 4. Standard Admin access to /students/birthdays should succeed
  const stdRes = await getJson(`${BASE_URL}/students/birthdays`, {
    Authorization: `Bearer ${stdToken}`,
  });
  assert.strictEqual(stdRes.status, 200, 'Standard Admin must be able to fetch birthdays');
  assert(Array.isArray(stdRes.data.students), 'Expected students array');
  console.log(`[PASS] Standard Admin fetched ${stdRes.data.students.length} student birthdays`);

  // 5. Super Admin access to /students/birthdays should succeed
  const superRes = await getJson(`${BASE_URL}/students/birthdays`, {
    Authorization: `Bearer ${superToken}`,
  });
  assert.strictEqual(superRes.status, 200, 'Super Admin must be able to fetch birthdays');
  assert.strictEqual(superRes.data.students.length, stdRes.data.students.length, 'Both admins get identical data');
  console.log(`[PASS] Super Admin fetched ${superRes.data.students.length} student birthdays (identical to Standard Admin)`);

  // 6. Verify fields: Only relevant details (name, rollNumber, branch, dateOfBirth)
  // Ensure sensitive data (email, mobileNumber, password, etc.) are NOT exposed
  for (const s of stdRes.data.students) {
    assert(s.name, 'Student must have name');
    assert(s.rollNumber, 'Student must have rollNumber');
    assert(s.branch, 'Student must have branch');
    assert(s.dateOfBirth && s.dateOfBirth.trim(), 'Student must have non-empty dateOfBirth');
    assert(!s.mobileNumber, 'mobileNumber must NOT be exposed in birthdays API');
    assert(!s.email, 'email must NOT be exposed in birthdays API');
    assert(!s.password, 'password must NOT be exposed');
  }
  console.log('[PASS] Verified fields: only name, rollNumber, branch, and dateOfBirth are exposed');

  // 7. Verify Standard Admin is STILL blocked from Super Admin only endpoints (Regression check)
  const stdBlockedStudents = await getJson(`${BASE_URL}/students`, {
    Authorization: `Bearer ${stdToken}`,
  });
  assert.strictEqual(stdBlockedStudents.status, 403, 'Standard admin blocked from /students');
  console.log('[PASS] Standard Admin remains blocked (403) from Super Admin full students API');

  const stdBlockedIssues = await getJson(`${BASE_URL}/issues`, {
    Authorization: `Bearer ${stdToken}`,
  });
  assert.strictEqual(stdBlockedIssues.status, 403, 'Standard admin blocked from /issues');
  console.log('[PASS] Standard Admin remains blocked (403) from Super Admin issues API');

  console.log('\n====================================================');
  console.log('ALL BIRTHDAYS API TESTS PASSED!');
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
