# 🧪 TESTING SCRIPT - SOUNDSPACE STATISTICS SYSTEM

## ✅ BACKEND TESTING

### 1. Test Database Models
```bash
cd soundspace-project/server
node -e "
const Stats = require('./src/models/Stats'); 
const Visit = require('./src/models/Visit');
console.log('✅ Stats Model:', typeof Stats);
console.log('✅ Visit Model:', typeof Visit);
"
```

### 2. Test Services Functions
```bash
node -e "
const { getMusicSourcesStats } = require('./src/services/statsService');
getMusicSourcesStats('7d')
  .then(data => console.log('✅ Music Sources:', data))
  .catch(err => console.error('❌ Error:', err.message));
"
```

### 3. Test Stats Controller
```bash
node -e "
const controller = require('./src/controllers/statsController');
console.log('✅ Stats Controller loaded');
console.log('Available functions:', Object.keys(controller));
"
```

### 4. Start Server and Test APIs
```bash
# Start server
npm start

# In another terminal, test APIs:
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" http://localhost:8800/api/admin/stats/music-sources?range=7d

curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" http://localhost:8800/api/admin/stats/overview?range=7d
```

### 5. Test Socket.IO Connection
Open browser console when connected to server, should see:
```
✅ Connected to server with id: xyz123
```

## ✅ FRONTEND TESTING

### 1. Check Dependencies Installed
```bash
cd client
npm list recharts antd socket.io-client @ant-design/icons
```

### 2. Test Components Import
```bash
node -e "
const fs = require('fs');
const charts = [
  'MusicSourcesChart.jsx',
  'UserGrowthChart.jsx', 
  'TopContributorsChart.jsx',
  'SongsAddedChart.jsx'
];

charts.forEach(chart => {
  const path = \`./src/components/charts/\${chart}\`;
  if (fs.existsSync(path)) {
    console.log('✅', chart, 'exists');
  } else {
    console.log('❌', chart, 'missing');
  }
});
"
```

### 3. Start Client and Test
```bash
npm run dev

# Navigate to: http://localhost:5173/admin/statistics
```

## 🔥 INTEGRATION TESTING

### Test Real-time Stats Updates:

1. **Login as admin** → Navigate to `/admin/statistics`
2. **Open browser console** → Should see Socket connection
3. **Add a new song** in any room → Stats should update automatically
4. **Register a new user** → User growth should update
5. **Check time range filters** → Data should change when selecting different ranges

## 📊 EXPECTED RESULTS

### API Responses Format:
```json
// /admin/stats/music-sources
{
  "upload": 25,
  "youtube": 150, 
  "spotify": 0,
  "soundcloud": 0
}

// /admin/stats/top-contributors  
[
  {
    "userId": "64a7c123...",
    "username": "user123",
    "songCount": 45,
    "avatar": "avatar_url"
  }
]

// /admin/stats/user-growth
[
  {
    "month": "10/2025",
    "userCount": 150
  }
]
```

### Socket Events:
- `stats:connected` - When joining admin room
- `stats:music-sources-update` - When songs added
- `stats:user-growth-update` - When users register
- `stats:top-contributors-update` - When songs added
- `stats:songs-added-update` - When songs added

## 🚨 TROUBLESHOOTING

### Common Issues:

1. **API 500 Error**: Check MongoDB connection, verify aggregation pipelines
2. **Charts not rendering**: Check recharts installation, verify data format
3. **Real-time not working**: Check Socket.IO connection, CORS settings
4. **Auth errors**: Verify admin token, check requireAdmin middleware

### Debug Commands:
```bash
# Check server logs
tail -f server/logs/combined.log

# Check client network tab for API calls
# F12 → Network → XHR

# Check Socket.IO events
# F12 → Console → Look for [Socket Event] logs
```

## 🎯 SUCCESS CRITERIA

### ✅ All tests pass when:
- [ ] All API endpoints return expected data format
- [ ] Charts render correctly with real data  
- [ ] Real-time updates work when data changes
- [ ] Time range filtering works correctly
- [ ] Socket.IO connections are stable
- [ ] No console errors in browser
- [ ] Mobile responsive design works
- [ ] Loading states show properly
- [ ] Error states display correctly

## 🚀 NEXT STEPS AFTER SUCCESS

1. **Performance optimization**: Add caching for expensive queries
2. **Enhanced features**: Export functionality, email reports
3. **More charts**: Add room popularity, peak usage times
4. **Monitoring**: Set up error tracking and performance monitoring
5. **Security**: Add rate limiting, input validation

---

**STATUS**: 🔥 READY FOR TESTING 🔥

All components have been implemented and integrated. The system is ready for comprehensive testing!