import { useState, useEffect, useRef } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import api from '../services/api';
import Toast from '../components/Toast';

const COURSE_OPTIONS = [
  'B.Tech (Computer Science and Engineering)',
  'B.Tech (Robotics and AI)',
  'B.Tech (EE- VLSI Design and Technology)',
  'Bachelor of Science (B.Sc) - Computer Science',
  'BA',
  'BA (H)',
  'B.Com',
  'B.Com (H)',
  'BBA',
  'BBA (H)',
  'BCA',
  'BCA (H)',
  'Bachelor of Science (B.Sc) - Physics',
  'Bachelor of Science (B.Sc) - ZBC',
  'Bachelor of Science (B.Sc) - Mathematics',
  'MCA',
  'MBA',
  'Ph.D',
  'Other',
];

const COURSE_SEMESTER_COUNTS = {
  'B.Tech (Computer Science and Engineering)': 8,
  'B.Tech (Robotics and AI)': 8,
  'B.Tech (EE- VLSI Design and Technology)': 8,
  'Bachelor of Science (B.Sc) - Computer Science': 6,
  'BA': 6,
  'BA (H)': 8,
  'B.Com': 6,
  'B.Com (H)': 8,
  'BBA': 6,
  'BBA (H)': 8,
  'BCA': 6,
  'BCA (H)': 8,
  'Bachelor of Science (B.Sc) - Physics': 6,
  'Bachelor of Science (B.Sc) - ZBC': 6,
  'Bachelor of Science (B.Sc) - Mathematics': 6,
  'MCA': 4,
  'MBA': 4,
  'Ph.D': 0,
  'Other': 8,
};

const getOrdinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const getAvailableSemesters = (course) => {
  if (!course || course === 'Ph.D') return [];
  const max = COURSE_SEMESTER_COUNTS[course] || 8;
  const list = [];
  for (let i = 1; i <= max; i++) {
    list.push(`${getOrdinal(i)} Semester`);
  }
  return list;
};

const StudentPage = () => {
  const [step, setStep] = useState('rollcheck');
  const [rollNumber, setRollNumber] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    mobileNumber: '',
    email: '',
    branch: '',
    semester: '',
    dateOfBirth: '',
  });
  const [selectedCourse, setSelectedCourse] = useState('');
  const [customCourse, setCustomCourse] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [existingStudent, setExistingStudent] = useState(null);

  // Client-side cache for instant roll number re-verification
  const rollCacheRef = useRef(new Map());

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Pre-warm backend serverless container and DB connection while student enters details
  useEffect(() => {
    api.get('/health').catch(() => {});
  }, []);

  const handleRollCheck = async (e) => {
    e.preventDefault();
    const cleanRoll = rollNumber.trim().toUpperCase();
    if (!cleanRoll) {
      showToast('Please enter a roll number', 'error');
      return;
    }

    // Check client-side memory cache first (instantaneous 0ms response)
    const cached = rollCacheRef.current.get(cleanRoll);
    if (cached) {
      if (cached.exists) {
        setExistingStudent(cached.student);
        setFormData((prev) => ({ ...prev, rollNumber: cached.student.rollNumber }));
        setStep('attendance');
        showToast('Student found! Please enter the PIN to mark attendance.', 'success');
      } else {
        setFormData((prev) => ({ ...prev, rollNumber: cleanRoll }));
        setSelectedCourse('');
        setCustomCourse('');
        setStep('register');
        showToast('New student. Please complete your registration.', 'info');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/students/check/${encodeURIComponent(cleanRoll)}`);
      // Cache response in memory
      rollCacheRef.current.set(cleanRoll, response.data);

      if (response.data.exists) {
        setExistingStudent(response.data.student);
        setFormData((prev) => ({ ...prev, rollNumber: response.data.student.rollNumber }));
        setStep('attendance');
        showToast('Student found! Please enter the PIN to mark attendance.', 'success');
      } else {
        setFormData((prev) => ({ ...prev, rollNumber: cleanRoll }));
        setSelectedCourse('');
        setCustomCourse('');
        setStep('register');
        showToast('New student. Please complete your registration.', 'info');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Error checking roll number', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const finalCourse = selectedCourse === 'Other' ? customCourse.trim() : selectedCourse;
    if (!finalCourse) {
      showToast(selectedCourse === 'Other' ? 'Please enter your course name' : 'Please select a course/program', 'error');
      return;
    }

    if (selectedCourse !== 'Ph.D' && !formData.semester) {
      showToast('Please select your semester', 'error');
      return;
    }

    const finalSemester = selectedCourse === 'Ph.D' ? 'N/A' : formData.semester;

    setLoading(true);
    try {
      const response = await api.post('/students/register', {
        ...formData,
        branch: finalCourse,
        semester: finalSemester,
      });
      if (response.data.success) {
        const registeredStudent = {
          id: response.data.student?.id,
          name: response.data.student?.name || formData.name.trim(),
          rollNumber: response.data.student?.rollNumber || formData.rollNumber,
        };

        // Cache newly registered student in client cache
        rollCacheRef.current.set(registeredStudent.rollNumber, {
          exists: true,
          student: registeredStudent,
        });

        setExistingStudent(registeredStudent);
        showToast('Registration successful! Please enter the PIN to mark attendance.', 'success');
        setStep('attendance');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePinVerification = async (e) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!cleanPin) {
      showToast('Please enter the PIN', 'error');
      return;
    }

    setLoading(true);
    try {
      // Direct 1-step attendance submission with PIN and Roll Number (50% faster, 1 HTTP roundtrip)
      const attendanceResponse = await api.post('/attendance/mark', {
        rollNumber: formData.rollNumber,
        pin: cleanPin,
      });

      if (attendanceResponse.data.success) {
        showToast(
          `Attendance marked successfully for ${attendanceResponse.data.attendance.sessionName}!`,
          'success'
        );
        setPin('');
        setStep('rollcheck');
        setRollNumber('');
        setFormData({
          name: '',
          rollNumber: '',
          mobileNumber: '',
          email: '',
          branch: '',
          semester: '',
          dateOfBirth: '',
        });
        setSelectedCourse('');
        setCustomCourse('');
        setExistingStudent(null);
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Error marking attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-bg py-4 px-4 md:py-8 md:px-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-yankees-blue mb-2 text-center">Mark your Attendance</h1>
          <p className="text-gray-600 text-center mb-6 md:mb-8 text-sm md:text-base">Enter your roll number to continue</p>

          {step === 'rollcheck' && (
            <div className="space-y-6">
              <form onSubmit={handleRollCheck}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roll Number</label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                    placeholder="Enter your roll number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue text-lg"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-yankees-blue text-white py-3 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Checking...
                    </>
                  ) : (
                    <>
                      <LogIn size={20} />
                      Continue
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {step === 'register' && (
            <div className="space-y-4 md:space-y-6">
              <button
                onClick={() => {
                  setStep('rollcheck');
                  setSelectedCourse('');
                  setCustomCourse('');
                }}
                className="text-burlywood hover:underline text-sm md:text-base"
              >
                ← Back
              </button>

              <h2 className="text-xl md:text-2xl font-bold text-yankees-blue">New Student Registration</h2>

              <form onSubmit={handleRegister} className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    value={formData.rollNumber}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue bg-gray-100"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    placeholder="10-digit Indian mobile number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course/Program *</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCourse(val);
                      const available = getAvailableSemesters(val);
                      if (val !== 'Other') {
                        setFormData((prev) => {
                          let nextSem = prev.semester;
                          if (val === 'Ph.D') {
                            nextSem = 'N/A';
                          } else if (!available.includes(prev.semester)) {
                            nextSem = '';
                          }
                          return { ...prev, branch: val, semester: nextSem };
                        });
                      } else {
                        setFormData((prev) => {
                          const nextSem = available.includes(prev.semester) ? prev.semester : '';
                          return { ...prev, branch: customCourse.trim(), semester: nextSem };
                        });
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue bg-white"
                    required
                    disabled={loading}
                  >
                    <option value="" disabled>Select Course / Program</option>
                    {COURSE_OPTIONS.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCourse === 'Other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter Your Course Name *</label>
                    <input
                      type="text"
                      value={customCourse}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomCourse(val);
                        setFormData((prev) => ({ ...prev, branch: val }));
                      }}
                      placeholder="Enter Your Course Name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                )}

                {selectedCourse !== 'Ph.D' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue bg-white"
                      required={selectedCourse !== 'Ph.D'}
                      disabled={loading || !selectedCourse}
                    >
                      <option value="" disabled>
                        {!selectedCourse ? 'Select Course First' : 'Select Semester'}
                      </option>
                      {getAvailableSemesters(selectedCourse).map((sem) => (
                        <option key={sem} value={sem}>
                          {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth (Optional)</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue bg-white"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-yankees-blue text-white py-3 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 text-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin inline mr-2" size={20} />
                      Registering...
                    </>
                  ) : (
                    'Register'
                  )}
                </button>
              </form>
            </div>
          )}

          {step === 'attendance' && (
            <div className="space-y-4 md:space-y-6">
              <button
                onClick={() => setStep('rollcheck')}
                className="text-burlywood hover:underline text-sm md:text-base"
              >
                ← Back
              </button>

              <h2 className="text-xl md:text-2xl font-bold text-yankees-blue">Mark Attendance</h2>

              {existingStudent && (
                <div className="bg-light-bg p-4 rounded-lg mb-4 md:mb-6">
                  <p className="text-sm text-gray-600 mb-1">Student: <span className="font-semibold text-yankees-blue">{existingStudent.name}</span></p>
                  <p className="text-sm text-gray-600">Roll Number: <span className="font-semibold">{existingStudent.rollNumber}</span></p>
                </div>
              )}

              <form onSubmit={handlePinVerification}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attendance PIN</label>
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 6-digit PIN"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue text-center text-2xl md:text-3xl tracking-widest"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-yankees-blue text-white py-3 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 text-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin inline mr-2" size={20} />
                      Verifying...
                    </>
                  ) : (
                    'Mark Attendance'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPage;
