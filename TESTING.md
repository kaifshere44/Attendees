# Testing Guide for Smart Attendance Management System

This document provides detailed testing instructions for verifying all acceptance criteria.

## Pre-Testing Setup

1. **Ensure MongoDB Atlas is configured**:
   - Update `MONGO_URI` in `.env` file with your connection string
   - Verify IP whitelist includes your current IP

2. **Initialize admin accounts**:
   ```bash
   cd backend
   npm run init-admins
   ```

3. **Start the backend server**:
   ```bash
   cd backend
   npm start
   ```
   Server should start on port 5000

4. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend should start on port 5173

## Acceptance Criteria Testing

### 1. Student Registration Testing

**Test 1.1: New Student Registration**
- Navigate to `http://localhost:5173/`
- Enter a new roll number (e.g., "STU001")
- Click "Continue"
- Fill in all required fields:
  - Full Name: "John Doe"
  - Mobile Number: "9876543210" (valid Indian number)
  - Email: "john@example.com"
  - Branch: "Computer Science"
  - Semester: "3"
- Click "Register"
- **Expected**: Success message, redirect to PIN entry

**Test 1.2: Duplicate Roll Number Rejection**
- Try registering with the same roll number "STU001"
- **Expected**: Error message "Student with this roll number already exists"

**Test 1.3: Invalid Email Format**
- Enter invalid email: "invalid-email"
- **Expected**: Validation error "Invalid email format"

**Test 1.4: Invalid Mobile Number**
- Enter invalid mobile: "12345"
- **Expected**: Validation error "Invalid mobile number format"

**Test 1.5: Existing Student Detection**
- Enter roll number "STU001" (already registered)
- **Expected**: Direct to PIN entry without registration form

### 2. Session Management Testing

**Test 2.1: Create Session (Standard Admin)**
- Login at `/kaifshere` with:
  - Username: `standard_admin`
  - Password: `ChangeThisPassword123!`
- Navigate to "Sessions" tab
- Click "Create Session"
- Enter:
  - Session Name: "Test Workshop"
  - Date: Today's date
  - Start Time: Current time + 5 minutes
  - End Time: Current time + 55 minutes
- Click "Create Session"
- **Expected**: Session created with 6-digit PIN, status "Scheduled"

**Test 2.2: Open Session**
- Click "Open" on the created session
- **Expected**: Status changes to "Open", PIN visible

**Test 2.3: Regenerate PIN**
- Click "Regenerate PIN"
- **Expected**: New PIN generated and displayed

**Test 2.4: Close Session**
- Click "Close Session"
- **Expected**: Status changes to "Closed", cannot be reopened

### 3. Attendance Marking Testing

**Test 3.1: Valid PIN Attendance**
- With session open, go to student page
- Enter roll number "STU001"
- Enter the valid PIN from admin dashboard
- Click "Mark Attendance"
- **Expected**: Success message with session name and time

**Test 3.2: Invalid PIN Rejection**
- Enter an invalid PIN (e.g., "000000")
- **Expected**: Error message "Invalid PIN"

**Test 3.3: Before Session Start Time**
- Create a session with start time in the future
- Try to mark attendance
- **Expected**: Error "Session has not started yet"

**Test 3.4: After Session End Time**
- Wait until session end time passes
- Try to mark attendance
- **Expected**: Error "Session has ended"

**Test 3.5: Duplicate Attendance Prevention**
- Try marking attendance again for same session with same roll number
- **Expected**: Error "Attendance already marked for this session"

### 4. Live Dashboard Testing

**Test 4.1: Real-time Updates**
- Keep admin dashboard open on "Live Dashboard" tab
- Mark attendance from another browser/student
- **Expected**: Attendance table updates automatically within 10 seconds

**Test 4.2: Manual Refresh**
- Click "Refresh" button
- **Expected**: Attendance data reloads immediately

**Test 4.3: Attendance Count**
- Verify attendance count matches number of students who marked attendance
- **Expected**: Accurate count displayed

### 5. Role-Based Access Control Testing

**Test 5.1: Standard Admin Cannot Access Exports**
- Login as standard admin at `/kaifshere`
- Try accessing `/kaifsgone/dashboard` directly in URL
- **Expected**: Redirected to login or access denied

**Test 5.2: Standard Admin No Export Features**
- In standard admin dashboard, verify no export buttons exist
- **Expected**: No Excel/PDF export buttons visible

**Test 5.3: Super Admin Access**
- Login at `/kaifsgone` with:
  - Username: `super_admin`
  - Password: `ChangeThisPassword123!`
- **Expected**: Access to all features including exports

**Test 5.4: API Authorization Test**
- Use Postman/curl to call export endpoint without super admin token
- `GET http://localhost:5000/api/reports/students/excel`
- **Expected**: 403 Forbidden response

### 6. Export Functionality Testing

**Test 6.1: Current Session Excel Export**
- Login as super admin
- Open a session with attendance
- Click "Export Excel"
- **Expected**: Excel file downloads with filename `Test_Workshop_Attendance.xlsx`
- Verify file contains: Sr. No., Name, Roll Number, Mobile, Email, Branch, Semester, Time

**Test 6.2: Current Session PDF Export**
- Click "Export PDF"
- **Expected**: PDF file downloads with filename `Test_Workshop_Attendance.pdf`
- Verify file contains formatted table with headers

**Test 6.3: Historical Session Export**
- Close a session
- Go to "Sessions" tab
- Click "View Attendance" on closed session
- Click "Export Excel" or "Export PDF"
- **Expected**: Export contains only that session's attendance

**Test 6.4: All Students Excel Export**
- Go to "Students" tab
- Click "Export Excel"
- **Expected**: Excel file downloads with all registered students
- Verify includes: Sr. No., Name, Roll Number, Mobile, Email, Branch, Semester, Registration Date

**Test 6.5: All Students PDF Export**
- Click "Export PDF"
- **Expected**: PDF file downloads with all registered students

### 7. Search and Filter Testing

**Test 7.1: Filter by Session**
- Go to "Reports" tab
- Select a session from dropdown
- Click "Search"
- **Expected**: Only attendance for that session shown

**Test 7.2: Filter by Date Range**
- Set start and end dates
- Click "Search"
- **Expected**: Only attendance within date range shown

**Test 7.3: Filter by Roll Number**
- Enter roll number
- Click "Search"
- **Expected**: Only matching records shown

**Test 7.4: Filter by Student Name**
- Enter student name
- Click "Search"
- **Expected**: Only matching records shown

**Test 7.5: Filter by Branch**
- Enter branch name
- Click "Search"
- **Expected**: Only matching records shown

**Test 7.6: Filter by Semester**
- Enter semester
- Click "Search"
- **Expected**: Only matching records shown

### 8. Security Testing

**Test 8.1: Login Rate Limiting**
- Attempt 6 failed logins with wrong password
- **Expected**: Account locked, error message "Account is temporarily locked"

**Test 8.2: PIN Rate Limiting**
- Attempt 11 invalid PIN entries
- **Expected**: Rate limit error message

**Test 8.3: Session Expiration**
- Login, wait 24 hours (or modify JWT expiration for testing)
- Try accessing protected route
- **Expected**: Redirected to login

**Test 8.4: Password Hashing**
- Check database directly
- **Expected**: Passwords stored as bcrypt hashes, not plain text

**Test 8.5: PIN Hashing**
- Check database directly
- **Expected**: PINs stored as bcrypt hashes, not plain text

### 9. Responsive Design Testing

**Test 9.1: Mobile View (375px width)**
- Open DevTools, set viewport to 375x667
- Navigate to student page
- **Expected**: All elements visible and usable, sidebar collapses to hamburger menu

**Test 9.2: Tablet View (768px width)**
- Set viewport to 768x1024
- Navigate to admin dashboard
- **Expected**: Layout adapts, tables scrollable horizontally

**Test 9.3: Desktop View (1920px width)**
- Set viewport to 1920x1080
- **Expected**: Full layout visible, optimal spacing

**Test 9.4: Form Accessibility**
- Tab through form fields
- **Expected**: Logical tab order, focus indicators visible

### 10. Error Handling Testing

**Test 10.1: MongoDB Connection Error**
- Stop MongoDB or break connection string
- Start backend
- **Expected**: Error message logged, server exits gracefully

**Test 10.2: Missing Required Fields**
- Submit forms without required fields
- **Expected**: Validation errors displayed

**Test 10.3: Network Error**
- Disconnect network, try API calls
- **Expected**: User-friendly error messages

**Test 10.4: 404 Errors**
- Access non-existent routes
- **Expected**: Appropriate error handling or 404 page

### 11. Session History Testing

**Test 11.1: History Persistence**
- Create and close multiple sessions
- Check "History" tab
- **Expected**: All closed sessions listed with correct details

**Test 11.2: History Access**
- Click on historical session
- **Expected**: Session details and attendance viewable

**Test 11.3: No Edits on Closed Sessions**
- Try to reopen or modify closed session
- **Expected**: Cannot reopen, changes prevented

### 12. Data Integrity Testing

**Test 12.1: Unique Roll Number Constraint**
- Try creating student with duplicate roll number via API
- **Expected**: Database error, duplicate prevented

**Test 12.2: Unique Attendance Constraint**
- Try inserting duplicate attendance record via API
- **Expected**: Database error, duplicate prevented

**Test 12.3: Foreign Key Constraints**
- Delete a student who has attendance records
- **Expected**: Either prevented or handled gracefully

### 13. Performance Testing

**Test 13.1: Large Dataset Handling**
- Register 100+ students
- Mark attendance for all in one session
- **Expected**: Pages load within reasonable time, no crashes

**Test 13.2: Export Large Dataset**
- Export all students (100+)
- **Expected**: File generates successfully, no timeout

## Automated Testing Scripts

### API Testing with Postman

Create a Postman collection with the following tests:

1. **Auth Tests**
   - POST /api/auth/login (valid credentials)
   - POST /api/auth/login (invalid credentials)
   - GET /api/auth/me (with token)
   - GET /api/auth/me (without token)

2. **Student Tests**
   - POST /api/students/register (valid data)
   - POST /api/students/register (duplicate roll number)
   - GET /api/students/check/:rollNumber
   - GET /api/students (super admin only)

3. **Session Tests**
   - POST /api/sessions (authenticated)
   - GET /api/sessions
   - PATCH /api/sessions/:id/open
   - PATCH /api/sessions/:id/close
   - PATCH /api/sessions/:id/pin

4. **Attendance Tests**
   - POST /api/attendance/verify-pin (valid)
   - POST /api/attendance/verify-pin (invalid)
   - POST /api/attendance/mark (valid)
   - POST /api/attendance/mark (duplicate)
   - GET /api/attendance/session/:sessionId

5. **Report Tests**
   - GET /api/reports/session/:sessionId/excel (super admin)
   - GET /api/reports/session/:sessionId/pdf (super admin)
   - GET /api/reports/students/excel (super admin)
   - GET /api/reports/students/pdf (super admin)
   - GET /api/reports/students/excel (standard admin - should fail)

## Test Results Template

```
Test ID | Test Name | Status | Notes
--------|-----------|--------|------
1.1 | New Student Registration | PASS/FAIL | Comments
1.2 | Duplicate Roll Number Rejection | PASS/FAIL | Comments
...
```

## Known Limitations

1. **Real-time Updates**: Uses polling (10-second intervals) instead of WebSockets/Socket.IO
2. **Time Zones**: All times stored in UTC, displayed in local browser time
3. **File Upload**: No file upload feature for student photos/documents
4. **Email Notifications**: No email verification or notifications
5. **SMS Notifications**: No SMS verification for mobile numbers

## Post-Deployment Testing

After deploying to production:

1. Test with production MongoDB Atlas
2. Verify HTTPS/SSL configuration
3. Test with real student roll numbers
4. Load test with multiple concurrent users
5. Monitor server logs for errors
6. Verify backup functionality
7. Test disaster recovery procedures
