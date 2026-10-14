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

async function putJson(url, data, headers = {}) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, data: json };
}

async function runTests() {
  console.log('=== TEST: STANDARD ADMIN CREDENTIAL MANAGEMENT API ===\n');

  // 1. Unauthenticated checks
  const unauthGet = await getJson(`${BASE_URL}/auth/standard-admin`);
  assert.strictEqual(unauthGet.status, 401, 'Unauthenticated GET should return 401');
  console.log('[PASS] Unauthenticated GET rejected with 401 Unauthorized');

  const unauthPut = await putJson(`${BASE_URL}/auth/standard-admin/credentials`, { username: 'hacker' });
  assert.strictEqual(unauthPut.status, 401, 'Unauthenticated PUT should return 401');
  console.log('[PASS] Unauthenticated PUT rejected with 401 Unauthorized');

  // 2. Standard Admin login
  const stdLogin = await postJson(`${BASE_URL}/auth/login`, {
    username: 'standard_admin',
    password: 'ChangeThisPassword123!',
  });
  assert.strictEqual(stdLogin.status, 200, 'Standard Admin login failed');
  const stdToken = stdLogin.data.token;
  assert(stdToken, 'Standard Admin token missing');
  console.log('[PASS] Standard Admin authenticated');

  // 3. Super Admin login
  const supLogin = await postJson(`${BASE_URL}/auth/login`, {
    username: 'super_admin',
    password: 'ChangeThisPassword123!',
  });
  assert.strictEqual(supLogin.status, 200, 'Super Admin login failed');
  const supToken = supLogin.data.token;
  assert(supToken, 'Super Admin token missing');
  console.log('[PASS] Super Admin authenticated');

  // 4. Standard Admin attempts to view/modify Standard Admin credentials (should get 403 Forbidden)
  const stdGet = await getJson(`${BASE_URL}/auth/standard-admin`, {
    Authorization: `Bearer ${stdToken}`,
  });
  assert.strictEqual(stdGet.status, 403, 'Standard Admin GET must return 403 Forbidden');
  console.log('[PASS] Standard Admin blocked with 403 from viewing credentials');

  const stdPut = await putJson(
    `${BASE_URL}/auth/standard-admin/credentials`,
    { username: 'unauthorized_change' },
    { Authorization: `Bearer ${stdToken}` }
  );
  assert.strictEqual(stdPut.status, 403, 'Standard Admin PUT must return 403 Forbidden');
  console.log('[PASS] Standard Admin blocked with 403 from modifying credentials');

  // 5. Super Admin views Standard Admin credentials
  const supGet = await getJson(`${BASE_URL}/auth/standard-admin`, {
    Authorization: `Bearer ${supToken}`,
  });
  assert.strictEqual(supGet.status, 200, 'Super Admin GET should return 200');
  assert(supGet.data.admin, 'Admin data missing in response');
  assert.strictEqual(supGet.data.admin.username, 'standard_admin', 'Username should match standard_admin');
  assert.strictEqual(supGet.data.admin.role, 'ADMIN_STANDARD', 'Role must be ADMIN_STANDARD');
  assert(!supGet.data.admin.passwordHash, 'passwordHash must NEVER be exposed');
  assert(!supGet.data.admin.password, 'plaintext password must NEVER be exposed');
  console.log('[PASS] Super Admin successfully retrieved Standard Admin details (no password exposed)');

  // 6. Test Validation Errors
  // a) Invalid username characters
  const invalidUserRes = await putJson(
    `${BASE_URL}/auth/standard-admin/credentials`,
    { username: 'bad name with spaces' },
    { Authorization: `Bearer ${supToken}` }
  );
  assert.strictEqual(invalidUserRes.status, 400, 'Spaces in username should return 400');
  console.log('[PASS] Invalid username characters rejected with 400');

  // b) Short password
  const shortPassRes = await putJson(
    `${BASE_URL}/auth/standard-admin/credentials`,
    { newPassword: '123' },
    { Authorization: `Bearer ${supToken}` }
  );
  assert.strictEqual(shortPassRes.status, 400, 'Short password should return 400');
  console.log('[PASS] Short password (< 6 chars) rejected with 400');

  // c) Mismatched confirm password
  const mismatchRes = await putJson(
    `${BASE_URL}/auth/standard-admin/credentials`,
    { newPassword: 'NewPassword123!', confirmPassword: 'DifferentPassword123!' },
    { Authorization: `Bearer ${supToken}` }
  );
  assert.strictEqual(mismatchRes.status, 400, 'Mismatched passwords should return 400');
  console.log('[PASS] Mismatched confirmation password rejected with 400');

  // 7. Update Standard Admin username and password
  const updateRes = await putJson(
    `${BASE_URL}/auth/standard-admin/credentials`,
    {
      username: 'temp_standard_user',
      newPassword: 'TempPassword456!',
      confirmPassword: 'TempPassword456!',
    },
    { Authorization: `Bearer ${supToken}` }
  );
  assert.strictEqual(updateRes.status, 200, 'Super Admin update failed');
  assert.strictEqual(updateRes.data.admin.username, 'temp_standard_user', 'Username should be updated');
  assert(!updateRes.data.admin.passwordHash, 'passwordHash must NEVER be returned');
  console.log('[PASS] Super Admin updated username to temp_standard_user and changed password');

  // 8. Verify OLD credentials no longer work
  const oldLogin = await postJson(`${BASE_URL}/auth/login`, {
    username: 'standard_admin',
    password: 'ChangeThisPassword123!',
  });
  assert.strictEqual(oldLogin.status, 401, 'Old credentials must be rejected');
  console.log('[PASS] Old credentials successfully rejected with 401');

  // 9. Verify NEW credentials work immediately on login page API
  const newLogin = await postJson(`${BASE_URL}/auth/login`, {
    username: 'temp_standard_user',
    password: 'TempPassword456!',
  });
  assert.strictEqual(newLogin.status, 200, 'New credentials should log in successfully');
  assert(newLogin.data.token, 'New login must return valid JWT token');
  assert.strictEqual(newLogin.data.admin.role, 'ADMIN_STANDARD', 'Role must remain ADMIN_STANDARD');
  console.log('[PASS] New credentials logged in successfully with valid token');

  // 10. Restore original credentials back to standard_admin / ChangeThisPassword123!
  const restoreRes = await putJson(
    `${BASE_URL}/auth/standard-admin/credentials`,
    {
      username: 'standard_admin',
      newPassword: 'ChangeThisPassword123!',
      confirmPassword: 'ChangeThisPassword123!',
    },
    { Authorization: `Bearer ${supToken}` }
  );
  assert.strictEqual(restoreRes.status, 200, 'Restoration failed');
  assert.strictEqual(restoreRes.data.admin.username, 'standard_admin');
  console.log('[PASS] Restored original standard_admin username and password');

  // 11. Verify restored credentials work
  const restoredLogin = await postJson(`${BASE_URL}/auth/login`, {
    username: 'standard_admin',
    password: 'ChangeThisPassword123!',
  });
  assert.strictEqual(restoredLogin.status, 200, 'Restored credentials should log in successfully');
  console.log('[PASS] Restored credentials verified and functioning');

  console.log('\n====================================================');
  console.log('ALL STANDARD ADMIN CREDENTIAL TESTS PASSED!');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
