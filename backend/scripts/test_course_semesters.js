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
  console.log('=== TEST: COURSE-DEPENDENT SEMESTER LOGIC & DB PERSISTENCE ===\n');
  const timestamp = Date.now().toString().slice(-4);

  // 1. Authenticate as Super Admin
  const loginRes = await postJson(`${API}/auth/login`, {
    username: 'super_admin',
    password: 'ChangeThisPassword123!',
  });
  const token = loginRes.data.token;

  // 2. Test B.Tech registration with 7th Semester
  const rollBTech = `BTECH_${timestamp}`;
  const resBTech = await postJson(`${API}/students/register`, {
    name: 'BTech Student',
    rollNumber: rollBTech,
    mobileNumber: `987611${timestamp}`,
    email: `btech_${timestamp}@test.com`,
    branch: 'B.Tech (Computer Science and Engineering)',
    semester: '7th Semester',
  });
  assert(resBTech.status === 201, `Status should be 201, got ${resBTech.status}`);
  console.log('[PASS] B.Tech student registered with 7th Semester');

  // 3. Test BCA (3-year regular) with 5th Semester
  const rollBCA = `BCA_${timestamp}`;
  const resBCA = await postJson(`${API}/students/register`, {
    name: 'BCA Student',
    rollNumber: rollBCA,
    mobileNumber: `987612${timestamp}`,
    email: `bca_${timestamp}@test.com`,
    branch: 'BCA',
    semester: '5th Semester',
  });
  assert(resBCA.status === 201, `Status should be 201, got ${resBCA.status}`);
  console.log('[PASS] BCA (regular 3-yr) student registered with 5th Semester');

  // 4. Test BCA (H) (4-year honours) with 8th Semester
  const rollBCAH = `BCAH_${timestamp}`;
  const resBCAH = await postJson(`${API}/students/register`, {
    name: 'BCA Honours Student',
    rollNumber: rollBCAH,
    mobileNumber: `987613${timestamp}`,
    email: `bcah_${timestamp}@test.com`,
    branch: 'BCA (H)',
    semester: '8th Semester',
  });
  assert(resBCAH.status === 201, `Status should be 201, got ${resBCAH.status}`);
  console.log('[PASS] BCA (H) (4-yr honours) student registered with 8th Semester');

  // 5. Test MCA (2-year PG) with 3rd Semester
  const rollMCA = `MCA_${timestamp}`;
  const resMCA = await postJson(`${API}/students/register`, {
    name: 'MCA Student',
    rollNumber: rollMCA,
    mobileNumber: `987614${timestamp}`,
    email: `mca_${timestamp}@test.com`,
    branch: 'MCA',
    semester: '3rd Semester',
  });
  assert(resMCA.status === 201, `Status should be 201, got ${resMCA.status}`);
  console.log('[PASS] MCA student registered with 3rd Semester');

  // 6. Test MBA (2-year PG) with 4th Semester
  const rollMBA = `MBA_${timestamp}`;
  const resMBA = await postJson(`${API}/students/register`, {
    name: 'MBA Student',
    rollNumber: rollMBA,
    mobileNumber: `987615${timestamp}`,
    email: `mba_${timestamp}@test.com`,
    branch: 'MBA',
    semester: '4th Semester',
  });
  assert(resMBA.status === 201, `Status should be 201, got ${resMBA.status}`);
  console.log('[PASS] MBA student registered with 4th Semester');

  // 7. Test Ph.D registration (no semester dropdown, defaults to N/A)
  const rollPhD = `PHD_${timestamp}`;
  const resPhD = await postJson(`${API}/students/register`, {
    name: 'Doctoral Scholar',
    rollNumber: rollPhD,
    mobileNumber: `987616${timestamp}`,
    email: `phd_${timestamp}@test.com`,
    branch: 'Ph.D',
    semester: 'N/A',
  });
  assert(resPhD.status === 201, `Status should be 201, got ${resPhD.status}`);
  console.log('[PASS] Ph.D student registered with N/A semester');

  // 8. Test Other course with custom name + semester
  const rollOther = `OTHER_${timestamp}`;
  const resOther = await postJson(`${API}/students/register`, {
    name: 'Other Course Student',
    rollNumber: rollOther,
    mobileNumber: `987617${timestamp}`,
    email: `other_${timestamp}@test.com`,
    branch: 'B.Des (User Experience Design)',
    semester: '6th Semester',
  });
  assert(resOther.status === 201, `Status should be 201, got ${resOther.status}`);
  console.log('[PASS] "Other" custom course student registered with 6th Semester');

  // 9. Verify database values via Super Admin
  const studentsRes = await getJson(`${API}/students?limit=50`, {
    Authorization: `Bearer ${token}`
  });
  const students = studentsRes.data.students;

  const sBTech = students.find(s => s.rollNumber === rollBTech);
  assert(sBTech && sBTech.semester === '7th Semester', `B.Tech semester mismatch: ${sBTech?.semester}`);
  console.log('[PASS] DB verified: B.Tech semester is "7th Semester"');

  const sBCA = students.find(s => s.rollNumber === rollBCA);
  assert(sBCA && sBCA.semester === '5th Semester', `BCA semester mismatch: ${sBCA?.semester}`);
  console.log('[PASS] DB verified: BCA semester is "5th Semester"');

  const sBCAH = students.find(s => s.rollNumber === rollBCAH);
  assert(sBCAH && sBCAH.semester === '8th Semester', `BCA (H) semester mismatch: ${sBCAH?.semester}`);
  console.log('[PASS] DB verified: BCA (H) semester is "8th Semester"');

  const sMCA = students.find(s => s.rollNumber === rollMCA);
  assert(sMCA && sMCA.semester === '3rd Semester', `MCA semester mismatch: ${sMCA?.semester}`);
  console.log('[PASS] DB verified: MCA semester is "3rd Semester"');

  const sMBA = students.find(s => s.rollNumber === rollMBA);
  assert(sMBA && sMBA.semester === '4th Semester', `MBA semester mismatch: ${sMBA?.semester}`);
  console.log('[PASS] DB verified: MBA semester is "4th Semester"');

  const sPhD = students.find(s => s.rollNumber === rollPhD);
  assert(sPhD && sPhD.semester === 'N/A', `Ph.D semester mismatch: ${sPhD?.semester}`);
  console.log('[PASS] DB verified: Ph.D semester is "N/A"');

  const sOther = students.find(s => s.rollNumber === rollOther);
  assert(sOther && sOther.semester === '6th Semester', `"Other" semester mismatch: ${sOther?.semester}`);
  console.log('[PASS] DB verified: "Other" semester is "6th Semester"');

  console.log('\n====================================================');
  console.log('ALL COURSE-SEMESTER BACKEND TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
