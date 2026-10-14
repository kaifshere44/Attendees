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

async function patchJson(url, data, headers = {}) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, data: json };
}

async function runTests() {
  console.log('=== TEST: ISSUE & SUGGESTION REPORTING API ===\n');
  const timestamp = Date.now().toString().slice(-4);

  // 1. Submit an Issue
  const res1 = await postJson(`${API}/issues`, {
    name: 'Aman Sharma',
    email: `aman_${timestamp}@example.com`,
    mobileNumber: `987654${timestamp}`,
    type: 'Issue',
    description: 'Attendance PIN verification was slightly delayed during peak time.',
  });
  assert(res1.status === 201, `Status should be 201, got ${res1.status}`);
  assert(res1.data.success === true, 'Success should be true');
  assert(res1.data.issue.status === 'Pending', 'Initial status should be Pending');
  const issueId = res1.data.issue._id;
  console.log('[PASS] Issue submitted successfully with status Pending');

  // 2. Submit a Suggestion
  const res2 = await postJson(`${API}/issues`, {
    name: 'Priya Mehta',
    email: `priya_${timestamp}@example.com`,
    mobileNumber: `987653${timestamp}`,
    type: 'Suggestion',
    description: 'Add dark mode toggle for mobile devices during morning roll call.',
  });
  assert(res2.status === 201, `Status should be 201, got ${res2.status}`);
  assert(res2.data.issue.type === 'Suggestion', 'Type should be Suggestion');
  console.log('[PASS] Suggestion submitted successfully');

  // 3. Validation tests
  const invalidEmailRes = await postJson(`${API}/issues`, {
    name: 'Invalid User',
    email: 'notanemail',
    mobileNumber: '9876543210',
    type: 'Issue',
    description: 'Test',
  });
  assert(invalidEmailRes.status === 400, 'Invalid email should return 400');
  console.log('[PASS] Invalid email rejected with 400');

  const invalidMobileRes = await postJson(`${API}/issues`, {
    name: 'Invalid Mobile',
    email: 'test@example.com',
    mobileNumber: '12345',
    type: 'Issue',
    description: 'Test',
  });
  assert(invalidMobileRes.status === 400, 'Invalid mobile number should return 400');
  console.log('[PASS] Invalid mobile number rejected with 400');

  // 4. Security checks: Standard Admin login
  const stdLogin = await postJson(`${API}/auth/login`, {
    username: 'standard_admin',
    password: 'ChangeThisPassword123!',
  });
  const stdToken = stdLogin.data.token;

  // Standard Admin should be blocked (403)
  const stdGetRes = await getJson(`${API}/issues`, { Authorization: `Bearer ${stdToken}` });
  assert(stdGetRes.status === 403, `Standard Admin should be 403, got ${stdGetRes.status}`);
  console.log('[PASS] Standard Admin blocked with 403 Forbidden from viewing issues');

  const stdPatchRes = await patchJson(`${API}/issues/${issueId}/status`, { status: 'Resolved' }, {
    Authorization: `Bearer ${stdToken}`
  });
  assert(stdPatchRes.status === 403, `Standard Admin should be 403 on status patch, got ${stdPatchRes.status}`);
  console.log('[PASS] Standard Admin blocked with 403 Forbidden from updating status');

  // Unauthenticated should be blocked (401)
  const unauthRes = await getJson(`${API}/issues`);
  assert(unauthRes.status === 401, 'Unauthenticated request should be 401');
  console.log('[PASS] Unauthenticated request rejected with 401 Unauthorized');

  // 5. Super Admin access
  const supLogin = await postJson(`${API}/auth/login`, {
    username: 'super_admin',
    password: 'ChangeThisPassword123!',
  });
  const supToken = supLogin.data.token;

  const supGetRes = await getJson(`${API}/issues`, { Authorization: `Bearer ${supToken}` });
  assert(supGetRes.status === 200, 'Super Admin should get 200');
  assert(Array.isArray(supGetRes.data.issues), 'Issues should be an array');
  const foundIssue = supGetRes.data.issues.find(i => i._id === issueId);
  assert(foundIssue, 'Submitted issue found in Super Admin list');
  console.log('[PASS] Super Admin successfully retrieved all submitted issues');

  // 6. Super Admin updates status to Resolved
  const updateRes1 = await patchJson(`${API}/issues/${issueId}/status`, { status: 'Resolved' }, {
    Authorization: `Bearer ${supToken}`
  });
  assert(updateRes1.status === 200, 'Status update to Resolved should return 200');
  assert(updateRes1.data.issue.status === 'Resolved', 'Issue status should now be Resolved');
  console.log('[PASS] Super Admin updated status to "Resolved"');

  // 7. Super Admin updates status back to Pending
  const updateRes2 = await patchJson(`${API}/issues/${issueId}/status`, { status: 'Pending' }, {
    Authorization: `Bearer ${supToken}`
  });
  assert(updateRes2.status === 200, 'Status update to Pending should return 200');
  assert(updateRes2.data.issue.status === 'Pending', 'Issue status should now be Pending');
  console.log('[PASS] Super Admin updated status back to "Pending"');

  console.log('\n====================================================');
  console.log('ALL ISSUE & SUGGESTION REPORTING API TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
