# 🚀 SoundSpace Quick Start Guide

## 📋 Prerequisites Checklist

- [ ] Node.js installed (v18+)
- [ ] MongoDB running on localhost:27017
- [ ] Git repository cloned
- [ ] Dependencies installed

## ⚡ One-Click Startup

```bash
# Double-click this file to start everything
start-soundspace.bat
```

**Or manually:**

### 🔧 Backend Setup (Terminal 1)
```bash
cd c:\Users\L13\soundspace-project\soundspace-project\server
npm install
npm run setup:admin
npm run dev
```

### 🎨 Frontend Setup (Terminal 2)  
```bash
cd c:\Users\L13\soundspace-project\client
npm install
npm run dev
```

## 🔑 Admin Login Credentials

| Field | Value |
|-------|--------|
| **Email** | `realadmin@company.com` |
| **Password** | `SuperSecret123` |
| **Role** | Admin |

## 🌐 Access URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Main application |
| **Backend** | http://localhost:8800 | API server |
| **Admin Dashboard** | http://localhost:5173 | Stats & management |

## 📊 Admin Dashboard Features

### 🎯 Real-time Statistics (4 Charts):

1. **🎵 Music Sources Distribution** (PieChart)
   - Upload vs YouTube vs Spotify vs SoundCloud
   - Updates when new songs added

2. **🏆 Top 5 Contributors** (BarChart)
   - Most active users by song count
   - Updates when songs added

3. **📈 Songs Added Over Time** (LineChart)  
   - Daily song additions (7 days)
   - Updates when new songs added

4. **👥 User Growth** (LineChart)
   - Monthly user registration (12 months)
   - Updates when new users register

### 🔄 Real-time Updates via Socket.IO:
- `stats:music-sources-update`
- `stats:top-contributors-update`  
- `stats:songs-added-update`
- `stats:user-growth-update`

## 🧪 Testing Real-time Updates

### 1. Add New Songs
- Login as regular user
- Create/join a room  
- Add YouTube links or upload files
- Watch dashboard charts update automatically

### 2. Register New Users
- Go to registration page
- Create new accounts
- Watch user growth chart update

## 🛠️ Development Commands

### Backend Commands:
```bash
npm run dev          # Start development server
npm run start        # Start production server  
npm run setup:admin  # Create/update admin user
npm run test:stats   # Test statistics functions
npm run test:api     # Test API endpoints
```

### Frontend Commands:
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## 📁 Project Structure

```
soundspace-project/
├── client/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/admin/
│   │   │   └── Dashboard.jsx  # Main admin dashboard
│   │   ├── components/
│   │   │   ├── charts/        # Chart components
│   │   │   └── StatsSummary.jsx
│   │   ├── hooks/
│   │   │   └── useDashboardData.js
│   │   └── services/
│   │       ├── api.js         # API client
│   │       └── socket.js      # Socket.IO client
│   └── .env                   # Frontend environment
├── soundspace-project/server/ # Backend (Node.js + Express)
│   ├── src/
│   │   ├── services/
│   │   │   └── statsService.js    # Statistics calculations
│   │   ├── controllers/
│   │   │   └── statsController.js # API endpoints
│   │   ├── routes/
│   │   │   └── stats.js          # Stats routes
│   │   └── models/               # Database models
│   ├── .env                      # Backend environment
│   ├── setup-admin.js            # Admin user setup
│   └── test-*.js                 # Test scripts
└── start-soundspace.bat          # One-click startup
```

## 🔧 Environment Configuration

### Required Environment Variables:

```env
# Server
PORT=8800
MONGO_URI=mongodb://localhost:27017/soundspace
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-secret-key

# Admin Credentials  
ADMIN_EMAIL=realadmin@company.com
ADMIN_PASSWORD=SuperSecret123

# External Services
CLOUDINARY_CLOUD_NAME=your-name
CLOUDINARY_API_KEY=your-key  
CLOUDINARY_API_SECRET=your-secret
```

## 🚨 Troubleshooting

### Port Already in Use:
```bash
# Check what's using the port
netstat -ano | findstr :8800
netstat -ano | findstr :5173

# Kill the process
taskkill /PID <process-id> /F
```

### Database Connection Issues:
```bash
# Make sure MongoDB is running
net start MongoDB

# Or start manually
mongod --dbpath "C:\data\db"
```

### Frontend Build Issues:
```bash
# Clear node_modules and reinstall
cd client
rm -rf node_modules package-lock.json
npm install
```

### Backend Startup Issues:
```bash  
# Clear node_modules and reinstall
cd soundspace-project/server
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support

If you encounter any issues:

1. Check the terminal output for error messages
2. Verify MongoDB is running
3. Ensure all environment variables are set
4. Try restarting both services
5. Check network connectivity

---

**🎯 Ready to go! Your real-time admin dashboard awaits at http://localhost:5173**