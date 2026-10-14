# Smart Attendance Management System

A complete, production-ready attendance management system built with React, Node.js, Express, and MongoDB Atlas. Features role-based admin access, real-time attendance tracking, PIN-based session management, and comprehensive reporting with Excel/PDF exports.

## 🚀 Features

### Student Features
- **Quick Registration**: New students can register with roll number, personal details, and academic information
- **Roll Number Validation**: Automatic check for existing students to prevent duplicates
- **PIN-Based Attendance**: Secure attendance marking using session-specific PINs
- **Time-Restricted Sessions**: Attendance can only be marked within configured time windows
- **Duplicate Prevention**: Backend enforcement prevents multiple attendance submissions per session

### Standard Admin Panel (`/kaifshere`)
- **Session Management**: Create, schedule, open, and close attendance sessions
- **PIN Generation**: Automatic secure PIN generation with regeneration capability
- **Live Dashboard**: Real-time attendance tracking with auto-refresh
- **Session History**: View all past sessions and their status
- **Role-Based Access**: Restricted to session management only (no data exports)

### Super Admin Panel (`/kaifsgone`)
- **All Standard Admin Features**: Complete session management capabilities
- **Student Management**: View all registered students with detailed information
- **Advanced Reporting**: Filter attendance by session, date range, student details
- **Excel Exports**: Download session attendance, historical data, and student lists
- **PDF Exports**: Generate professional PDF reports with formatting
- **Full Data Access**: Complete visibility into all system data

### Security Features
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Role-Based Access Control**: Two distinct admin roles with enforced permissions
- **Rate Limiting**: Protection against brute force attacks on login and PIN verification
- **Account Lockout**: Temporary lockout after multiple failed login attempts
- **Secure PIN Storage**: PINs hashed using bcrypt before storage
- **CORS Protection**: Configured cross-origin resource sharing
- **Helmet Security Headers**: Security best practices for HTTP headers
- **Input Validation**: Server-side validation and sanitization

## 🛠️ Technology Stack

### Frontend
- **React.js** with Vite
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **Lucide React** for icons

### Backend
- **Node.js** with Express.js
- **MongoDB Atlas** with Mongoose
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Helmet** for security headers
- **express-rate-limit** for rate limiting

### Export Libraries
- **ExcelJS** for Excel exports
- **jsPDF** with autoTable for PDF exports

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas account
- Git (optional)

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Attendees
```

### 2. MongoDB Atlas Setup

1. Create a MongoDB Atlas account at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier is sufficient)
3. Create a database user with read/write permissions
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string from the Atlas dashboard
6. Update the `MONGO_URI` in the `.env` file with your connection string

Example connection string format:
```
mongodb+srv://username:password@cluster-name.mongodb.net/database-name?retryWrites=true&w=majority
```

### 3. Environment Configuration

The `.env` file is already created in the root directory. Update the following values:

```env
# MongoDB Atlas Connection
MONGO_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/attendance-system?retryWrites=true&w=majority

# JWT Secret (generate a secure random string - minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars

# Server Configuration
PORT=5000
NODE_ENV=development

# Admin Credentials (change these in production)
STANDARD_ADMIN_USERNAME=standard_admin
STANDARD_ADMIN_EMAIL=admin@standard.com
STANDARD_ADMIN_PASSWORD=ChangeThisPassword123!

SUPER_ADMIN_USERNAME=super_admin
SUPER_ADMIN_EMAIL=admin@super.com
SUPER_ADMIN_PASSWORD=ChangeThisPassword123!

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Frontend API URL
VITE_API_URL=http://localhost:5000/api
```

**Important Security Notes:**
- Generate a strong JWT secret using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Change all admin passwords before production deployment
- Never commit the `.env` file to version control
- Use different credentials for production

### 4. Install Backend Dependencies

```bash
cd backend
npm install
```

### 5. Initialize Admin Accounts

Run the initialization script to create the admin accounts:

```bash
node scripts/initAdmins.js
```

This will create:
- Standard Admin: `standard_admin` / `ChangeThisPassword123!`
- Super Admin: `super_admin` / `ChangeThisPassword123!`

### 6. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 7. Start the Backend Server

In a new terminal:

```bash
cd backend
npm start
```

The backend will start on `http://localhost:5000`

### 8. Start the Frontend Development Server

In another terminal:

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

## 🌐 Access the Application

- **Student Page**: `http://localhost:5173/`
- **Standard Admin**: `http://localhost:5173/kaifshere`
- **Super Admin**: `http://localhost:5173/kaifsgone`

## 📱 Usage Guide

### For Students

1. **New Registration**:
   - Enter your roll number
   - If not registered, fill in the registration form
   - Provide name, mobile number, email, branch, and semester
   - Submit the form

2. **Mark Attendance**:
   - Enter your roll number
   - If registered, enter the session PIN provided by the admin
   - Attendance will be marked automatically

### For Standard Admins

1. **Login**:
   - Go to `/kaifshere`
   - Enter username: `standard_admin`
   - Enter password: `ChangeThisPassword123!`

2. **Create Session**:
   - Navigate to Sessions tab
   - Click "Create Session"
   - Enter session name, date, start time, and end time
   - A 6-digit PIN will be generated automatically

3. **Open Attendance**:
   - Click "Open" on a scheduled session
   - Share the PIN with students
   - Monitor live attendance on the dashboard

4. **Close Session**:
   - Click "Close" when attendance period ends
   - Session history will be preserved

### For Super Admins

1. **Login**:
   - Go to `/kaifsgone`
   - Enter username: `super_admin`
   - Enter password: `ChangeThisPassword123!`

2. **All Standard Admin Features**:
   - Create and manage sessions
   - View live attendance
   - Regenerate PINs

3. **Additional Features**:
   - View all registered students
   - Export student lists (Excel/PDF)
   - View session details with full attendance
   - Export session attendance (Excel/PDF)
   - Filter attendance history by various criteria
   - Generate comprehensive reports

## 🏗️ Project Structure

```
attendance-system/
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components (Toast, etc.)
│   │   ├── pages/           # Page components
│   │   │   ├── StudentPage.jsx
│   │   │   ├── StandardAdminLogin.jsx
│   │   │   ├── StandardAdminDashboard.jsx
│   │   │   ├── SuperAdminLogin.jsx
│   │   │   └── SuperAdminDashboard.jsx
│   │   ├── services/        # API services
│   │   │   ├── api.js
│   │   │   └── authService.js
│   │   ├── App.jsx          # Main app with routing
│   │   ├── main.jsx         # React entry point
│   │   └── index.css        # Tailwind imports
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
├── backend/
│   ├── config/
│   │   └── database.js      # MongoDB connection
│   ├── models/              # Mongoose models
│   │   ├── Student.js
│   │   ├── Admin.js
│   │   ├── Session.js
│   │   └── Attendance.js
│   ├── controllers/         # Route controllers
│   │   ├── authController.js
│   │   ├── studentController.js
│   │   ├── sessionController.js
│   │   ├── attendanceController.js
│   │   └── reportController.js
│   ├── routes/              # API routes
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── sessionRoutes.js
│   │   ├── attendanceRoutes.js
│   │   └── reportRoutes.js
│   ├── middleware/          # Express middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── scripts/             # Utility scripts
│   │   └── initAdmins.js
│   ├── server.js            # Main server file
│   └── package.json
├── .env                     # Environment variables (root)
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
├── start.bat                # Windows setup script
├── start.sh                 # Linux/Mac setup script
├── README.md                # This file
└── TESTING.md               # Testing guide
```

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit `.env` files to version control
2. **Strong Passwords**: Use strong, unique passwords for admin accounts
3. **JWT Secret**: Generate a cryptographically secure JWT secret
4. **MongoDB Security**:
   - Enable IP whitelisting in Atlas
   - Use strong database passwords
   - Enable authentication
5. **HTTPS**: Use HTTPS in production (SSL/TLS certificates)
6. **Rate Limiting**: Already implemented, but adjust limits based on your needs
7. **Input Validation**: All inputs are validated on the backend
8. **NoSQL Injection**: Mongoose provides protection against NoSQL injection

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Deploy the `dist` folder to Vercel or Netlify

3. Update `VITE_API_URL` in deployment environment variables to point to your backend URL

### Backend Deployment (Render/Railway)

1. Push your code to GitHub

2. Connect your repository to Render or Railway

3. Set environment variables in the deployment platform:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `PORT` (usually set by platform)
   - `NODE_ENV=production`
   - `FRONTEND_URL` (your deployed frontend URL)
   - Admin credentials

4. Deploy the backend

5. Run the admin initialization script in the deployment platform's shell or update your deployment script to run it automatically

### MongoDB Atlas

- Already configured for production use
- Ensure your IP whitelist includes your deployment server's IP
- Consider enabling encryption at rest
- Enable automatic backups

## 🧪 Testing

### Manual Testing Checklist

- [ ] Student can register with new roll number
- [ ] Duplicate roll numbers are rejected
- [ ] Existing student can mark attendance without re-registering
- [ ] Admin can create a session
- [ ] Admin can open a session
- [ ] PIN is generated and displayed to admin
- [ ] Student can mark attendance with valid PIN
- [ ] Invalid PIN is rejected
- [ ] Attendance before session start time is rejected
- [ ] Attendance after session end time is rejected
- [ ] Student cannot mark attendance twice for same session
- [ ] Live dashboard updates when attendance is marked
- [ ] Admin can close a session
- [ ] Session history persists after closing
- [ ] Standard admin cannot access export features
- [ ] Super admin can export Excel files
- [ ] Super admin can export PDF files
- [ ] Exports contain actual database data
- [ ] Historical downloads are limited to selected session
- [ ] All-student download includes all registered students
- [ ] All pages are responsive on mobile
- [ ] Refreshing protected routes requires re-authentication
- [ ] MongoDB connection errors are handled gracefully

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/me` - Get current admin

### Students
- `POST /api/students/register` - Register new student
- `GET /api/students/check/:rollNumber` - Check if roll number exists
- `GET /api/students` - Get all students (Super Admin only)

### Sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions` - Get all sessions
- `GET /api/sessions/active` - Get active session
- `GET /api/sessions/:id` - Get single session
- `PATCH /api/sessions/:id/open` - Open session
- `PATCH /api/sessions/:id/close` - Close session
- `PATCH /api/sessions/:id/pin` - Regenerate PIN

### Attendance
- `POST /api/attendance/verify-pin` - Verify session PIN
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance/session/:sessionId` - Get session attendance
- `GET /api/attendance/history` - Get attendance history

### Reports (Super Admin Only)
- `GET /api/reports/session/:sessionId/excel` - Export session to Excel
- `GET /api/reports/session/:sessionId/pdf` - Export session to PDF
- `GET /api/reports/students/excel` - Export all students to Excel
- `GET /api/reports/students/pdf` - Export all students to PDF
- `GET /api/reports/history` - Get filtered attendance history

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Verify your MongoDB Atlas connection string
- Check IP whitelist in Atlas settings
- Ensure database user has correct permissions
- Check network connectivity

### CORS Errors
- Verify `FRONTEND_URL` in backend `.env`
- Ensure CORS origin matches your frontend URL

### Authentication Issues
- Check JWT secret is set correctly
- Verify admin credentials in database
- Check token expiration (default 24 hours)

### Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (requires v18+)
- Verify all dependencies are installed

## 📝 License

This project is for educational and demonstration purposes.

## 🤝 Contributing

This is a complete project. For issues or improvements, please follow standard Git workflow.

## 📞 Support

For issues or questions, please refer to the troubleshooting section or check the MongoDB Atlas documentation for database-specific issues.
