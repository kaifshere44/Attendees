import { useState, useMemo, useEffect } from 'react';
import {
  Cake,
  Gift,
  Calendar,
  Search,
  RefreshCw,
  PartyPopper,
  Clock,
  Sparkles,
  AlertCircle,
  Filter,
  Users
} from 'lucide-react';
import api from '../services/api';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const parseDob = (dobStr) => {
  if (!dobStr || typeof dobStr !== 'string') return null;
  const clean = dobStr.trim();
  const parts = clean.split(/[-/]/);
  if (parts.length !== 3) return null;
  let year, month, day;
  if (parts[0].length === 4) {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (parts[2].length === 4) {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    return null;
  }
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
};

export const formatDobDisplay = (year, month, day) => {
  const dateObj = new Date(year, month - 1, day);
  return dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getBirthdayMeta = (student, referenceDate = new Date()) => {
  const parsed = parseDob(student.dateOfBirth);
  if (!parsed) return null;

  const { year: birthYear, month: birthMonth, day: birthDay } = parsed;

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();
  const todayMidnight = new Date(refYear, refMonth, refDay);

  // Check this year's birthday
  let thisYearBday = new Date(refYear, birthMonth - 1, birthDay);
  if (birthMonth === 2 && birthDay === 29) {
    const isLeap = (refYear % 4 === 0 && refYear % 100 !== 0) || (refYear % 400 === 0);
    if (!isLeap) thisYearBday = new Date(refYear, 1, 28);
  }

  const oneDay = 24 * 60 * 60 * 1000;
  const diffDaysThisYear = Math.round((thisYearBday - todayMidnight) / oneDay);

  let isToday = false;
  let hasPassedThisYear = false;
  let nextBirthdayDate;
  let daysRemaining;
  let nextAge;

  if (diffDaysThisYear === 0) {
    isToday = true;
    daysRemaining = 0;
    nextBirthdayDate = thisYearBday;
    nextAge = refYear - birthYear;
  } else if (diffDaysThisYear > 0) {
    daysRemaining = diffDaysThisYear;
    nextBirthdayDate = thisYearBday;
    nextAge = refYear - birthYear;
  } else {
    hasPassedThisYear = true;
    const nextYear = refYear + 1;
    let nextYearBday = new Date(nextYear, birthMonth - 1, birthDay);
    if (birthMonth === 2 && birthDay === 29) {
      const isLeapNext = (nextYear % 4 === 0 && nextYear % 100 !== 0) || (nextYear % 400 === 0);
      if (!isLeapNext) nextYearBday = new Date(nextYear, 1, 28);
    }
    daysRemaining = Math.round((nextYearBday - todayMidnight) / oneDay);
    nextBirthdayDate = nextYearBday;
    nextAge = nextYear - birthYear;
  }

  const formattedNextBday = nextBirthdayDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return {
    ...student,
    birthYear,
    birthMonth,
    birthMonthName: MONTH_NAMES[birthMonth - 1],
    birthDay,
    formattedDob: formatDobDisplay(birthYear, birthMonth, birthDay),
    isToday,
    hasPassedThisYear,
    daysRemaining,
    nextBirthdayDate,
    formattedNextBday,
    nextAge,
  };
};

const BirthdaysSection = ({ onToast }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('upcoming'); // 'upcoming' | 'past'
  const [selectedMonth, setSelectedMonth] = useState('All'); // For past birthdays

  const fetchBirthdays = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get('/students/birthdays');
      setStudents(response.data.students || []);
      if (isManual && onToast) {
        onToast('Birthday records refreshed successfully', 'success');
      }
    } catch (error) {
      console.error('Error fetching student birthdays:', error);
      if (onToast) {
        onToast('Failed to load birthday records', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBirthdays();
  }, []);

  // Compute enriched birthday metadata for all valid students
  const enrichedStudents = useMemo(() => {
    const now = new Date();
    return students
      .map((s) => getBirthdayMeta(s, now))
      .filter((s) => s !== null);
  }, [students]);

  // Metric counts
  const stats = useMemo(() => {
    const todayList = enrichedStudents.filter((s) => s.isToday);
    const next30Days = enrichedStudents.filter((s) => s.daysRemaining > 0 && s.daysRemaining <= 30);
    const pastThisYear = enrichedStudents.filter((s) => s.hasPassedThisYear);

    return {
      total: enrichedStudents.length,
      today: todayList,
      next30DaysCount: next30Days.length,
      pastCount: pastThisYear.length,
    };
  }, [enrichedStudents]);

  // Filtered & Searched List
  const displayedStudents = useMemo(() => {
    let list = [...enrichedStudents];

    // Filter by tab mode
    if (filterMode === 'upcoming') {
      // Sort upcoming birthdays ascending by daysRemaining (Today -> 1 day -> 2 days -> next year)
      list.sort((a, b) => a.daysRemaining - b.daysRemaining);
    } else {
      // Past Birthdays: Filter by hasPassedThisYear (or by selected month)
      if (selectedMonth !== 'All') {
        const monthIndex = MONTH_NAMES.indexOf(selectedMonth) + 1;
        list = list.filter((s) => s.birthMonth === monthIndex);
      } else {
        list = list.filter((s) => s.hasPassedThisYear);
      }
      // Sort past birthdays by birthMonth and birthDay ascending
      list.sort((a, b) => {
        if (a.birthMonth !== b.birthMonth) return a.birthMonth - b.birthMonth;
        return a.birthDay - b.birthDay;
      });
    }

    // Search filter across student name, roll number, and date of birth
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      list = list.filter((s) => {
        const nameMatch = s.name?.toLowerCase().includes(query);
        const rollMatch = s.rollNumber?.toLowerCase().includes(query);
        const rawDobMatch = s.dateOfBirth?.toLowerCase().includes(query);
        const formattedDobMatch = s.formattedDob?.toLowerCase().includes(query);
        const monthMatch = s.birthMonthName?.toLowerCase().includes(query);
        const nextBdayMatch = s.formattedNextBday?.toLowerCase().includes(query);

        return nameMatch || rollMatch || rawDobMatch || formattedDobMatch || monthMatch || nextBdayMatch;
      });
    }

    return list;
  }, [enrichedStudents, filterMode, selectedMonth, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
              <Cake size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-yankees-blue">Student Birthdays</h2>
              <p className="text-sm text-gray-500">
                Track upcoming birthdays, countdowns, and celebrations across students
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchBirthdays(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-burlywood text-yankees-blue font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 shadow-sm"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Birthday Notifications */}
      {stats.today.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-15">
            <PartyPopper size={120} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Sparkles size={28} className="animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-white text-amber-800">
                    Celebration Alert
                  </span>
                  <span className="text-xs text-amber-100 font-medium">
                    {stats.today.length} {stats.today.length === 1 ? 'Birthday' : 'Birthdays'} Today!
                  </span>
                </div>
                <h3 className="text-xl font-bold mt-1">
                  🎉 Wish Happy Birthday to{' '}
                  {stats.today.map((s, idx) => (
                    <span key={s._id} className="underline decoration-white/60">
                      {s.name} ({s.rollNumber})
                      {idx < stats.today.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                  !
                </h3>
                <p className="text-sm text-amber-100 mt-0.5">
                  Turning {stats.today.map((s) => s.nextAge).join(', ')} years old today!
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-amber-900 font-bold rounded-lg shadow-sm text-sm whitespace-nowrap">
              <Gift size={18} /> Today's Special
            </span>
          </div>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Birthdays</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.today.length}</p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.today.length > 0 ? 'Active celebration today' : 'No birthdays today'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Cake size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Upcoming (30 Days)</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.next30DaysCount}</p>
            <p className="text-xs text-gray-400 mt-1">Birthdays in next month</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Past This Year</p>
            <p className="text-2xl font-bold text-gray-700 mt-1">{stats.pastCount}</p>
            <p className="text-xs text-gray-400 mt-1">Already celebrated</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
            <Calendar size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tracked</p>
            <p className="text-2xl font-bold text-yankees-blue mt-1">{stats.total}</p>
            <p className="text-xs text-gray-400 mt-1">Students with DOB</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-burlywood/20 text-yankees-blue flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Control Panel: Filters & Search */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Primary View Filters: Upcoming vs Past */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl max-w-fit">
            <button
              onClick={() => {
                setFilterMode('upcoming');
                setSelectedMonth('All');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                filterMode === 'upcoming'
                  ? 'bg-yankees-blue text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock size={16} />
              <span>Upcoming Birthdays</span>
              <span
                className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  filterMode === 'upcoming' ? 'bg-burlywood text-yankees-blue' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {enrichedStudents.length}
              </span>
            </button>

            <button
              onClick={() => setFilterMode('past')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                filterMode === 'past'
                  ? 'bg-yankees-blue text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar size={16} />
              <span>Past Birthdays</span>
              <span
                className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  filterMode === 'past' ? 'bg-burlywood text-yankees-blue' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {stats.pastCount}
              </span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, roll number, or DOB..."
              className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yankees-blue/20 focus:border-yankees-blue transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Month Filter (Active only for Past Birthdays or Month Exploration) */}
        {filterMode === 'past' && (
          <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 whitespace-nowrap">
              <Filter size={16} />
              <span>Filter by Month:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedMonth('All')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedMonth === 'All'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Months
              </button>
              {MONTH_NAMES.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedMonth === m
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Table / Records */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw size={32} className="animate-spin mx-auto text-yankees-blue mb-3 opacity-60" />
            <p className="text-base font-medium">Loading birthday records...</p>
          </div>
        ) : displayedStudents.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <AlertCircle size={40} className="mx-auto text-gray-400 mb-3 opacity-60" />
            <p className="text-base font-semibold text-gray-700">No birthday records found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery
                ? `No student birthdays matching "${searchQuery}". Try clearing search.`
                : filterMode === 'past' && selectedMonth !== 'All'
                ? `No past birthdays recorded for ${selectedMonth}.`
                : 'No student birthdays available to display.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Roll Number</th>
                  <th className="py-3.5 px-4">Course / Branch</th>
                  <th className="py-3.5 px-4">Date of Birth</th>
                  <th className="py-3.5 px-4">Next Birthday</th>
                  <th className="py-3.5 px-4 text-right">Days Remaining / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {displayedStudents.map((s, index) => {
                  return (
                    <tr
                      key={s._id || s.rollNumber}
                      className={`transition ${
                        s.isToday
                          ? 'bg-amber-50/80 hover:bg-amber-100/70 font-medium'
                          : 'hover:bg-gray-50/80'
                      }`}
                    >
                      {/* Sr. No */}
                      <td className="py-3.5 px-4 text-gray-400 font-mono text-xs">{index + 1}</td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              s.isToday
                                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                                : 'bg-yankees-blue/10 text-yankees-blue'
                            }`}
                          >
                            {s.name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <span className="font-semibold text-yankees-blue">{s.name}</span>
                            {s.isToday && (
                              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900">
                                🎂 Today!
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Roll Number */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-gray-700">
                        {s.rollNumber}
                      </td>

                      {/* Course / Branch */}
                      <td className="py-3.5 px-4 text-gray-600">
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          {s.branch}
                        </span>
                      </td>

                      {/* Date of Birth */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Calendar size={14} className="text-gray-400" />
                          <span className="font-medium">{s.formattedDob}</span>
                        </div>
                      </td>

                      {/* Next Birthday Date */}
                      <td className="py-3.5 px-4">
                        <div className="text-gray-600">
                          <span className="font-semibold text-yankees-blue">
                            {s.formattedNextBday}
                          </span>
                          <span className="text-xs text-gray-400 ml-1.5">
                            (Turning {s.nextAge})
                          </span>
                        </div>
                      </td>

                      {/* Days Remaining / Status Badge */}
                      <td className="py-3.5 px-4 text-right">
                        {s.isToday ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm animate-pulse">
                            <Sparkles size={13} />
                            Today! 🎉
                          </span>
                        ) : s.daysRemaining <= 7 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            <Clock size={13} />
                            In {s.daysRemaining} {s.daysRemaining === 1 ? 'day' : 'days'}
                          </span>
                        ) : s.daysRemaining <= 30 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                            <Clock size={13} />
                            In {s.daysRemaining} days
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            In {s.daysRemaining} days
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BirthdaysSection;
