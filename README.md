# TrailSync 🏃

**A full-stack, offline-first fitness tracking application for walks, runs, and rides.**

TrailSync provides GPS tracking with live route maps, performance statistics, and seamless offline support with automatic synchronization. Currently built for single-user mode but architected to easily scale to multi-user support.

## ✨ Features

### Core Features (Implemented)
- ✅ **GPS Tracking**: Real-time location tracking for walks, runs, and rides
- ✅ **Live Route Maps**: View your route in real-time using OpenStreetMap
- ✅ **Performance Stats**: Distance, duration, pace, speed, and elevation gain
- ✅ **Activity History**: Browse, filter, and sort past activities
- ✅ **Offline-First**: Full offline support with IndexedDB storage
- ✅ **Auto-Sync**: Automatic synchronization when online
- ✅ **GPX Export**: Export activities as GPX files
- ✅ **Mobile-Friendly UI**: Responsive design with touch-optimized controls
- ✅ **PWA Support**: Install as a Progressive Web App

### Architecture Highlights
- **Single-User Mode**: Simple API key authentication (current)
- **Multi-User Ready**: Code structured for easy JWT authentication migration
- **Offline Sync**: Conflict resolution with last-write-wins strategy
- **Modern Stack**: React, Node.js, MongoDB, IndexedDB

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite
- **React Router** for navigation
- **Leaflet & React-Leaflet** for maps
- **Dexie.js** for IndexedDB (offline storage)
- **Workbox** for PWA and service worker
- **Date-fns** for date handling
- **Axios** for API communication

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose
- **Helmet** for security headers
- **Compression** for response optimization
- **Rate limiting** for API protection

### Android App (Planned)
- Native Java
- FusedLocationProvider for GPS
- SensorManager for step counting
- Room/SQLite for offline storage

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB 7.0+ (or use Docker)
- Modern web browser with geolocation support

### Option 1: Docker (Recommended)

1. **Clone the repository**
```bash
git clone <repository-url>
cd trailsync
```

2. **Set up environment variables**
```bash
# Generate a secure API key
openssl rand -base64 32

# Create backend .env file
cp backend/.env.example backend/.env
# Edit backend/.env and set your API_KEY
```

3. **Start services with Docker Compose**
```bash
docker-compose up -d
```

4. **Set up frontend**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

5. **Access the app**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/health

### Option 2: Manual Setup

1. **Install MongoDB**
```bash
# macOS with Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0

# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

2. **Set up backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and configure your settings
npm run dev
```

3. **Set up frontend**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## 📱 Usage

### First-Time Setup

1. **Open the app** at http://localhost:3000
2. **Go to Settings** (⚙️ icon in navigation)
3. **Enter your API key** from backend/.env file
4. **Grant location permissions** when prompted

### Tracking an Activity

1. **Select activity type**: Walk, Run, or Ride
2. **Grant location permission** if not already granted
3. **Click "Start Tracking"** to begin
4. **Watch live stats** update in real-time
5. **View your route** on the map as you move
6. **Click "Stop"** when finished
7. Activity is **automatically saved** and synced

### Viewing History

1. **Navigate to History** (📊 icon)
2. **Filter by activity type** or sort by date/distance
3. **Click any activity** to view detailed stats and route map
4. **Export as GPX** or delete activities
5. **Sync manually** or enable auto-sync in settings

### Offline Mode

- Activities are **automatically saved locally** using IndexedDB
- **Continue tracking** without internet connection
- Activities **sync automatically** when back online
- **Conflict resolution** handled automatically (server wins)

## 🏗️ Project Structure

```
trailsync/
├── frontend/                 # React PWA
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── TrackingPage.jsx
│   │   │   ├── HistoryPage.jsx
│   │   │   ├── ActivityDetail.jsx
│   │   │   ├── Navigation.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── services/        # Business logic
│   │   │   ├── gps.js       # GPS tracking
│   │   │   ├── api.js       # Backend API
│   │   │   └── sync.js      # Offline sync
│   │   ├── db/              # IndexedDB
│   │   │   └── database.js
│   │   ├── styles/          # Global styles
│   │   └── App.jsx          # Main component
│   ├── vite.config.js       # Vite + PWA config
│   └── package.json
│
├── backend/                  # Express API
│   ├── models/              # Mongoose models
│   │   └── Activity.js
│   ├── controllers/         # Route controllers
│   │   └── activityController.js
│   ├── routes/              # API routes
│   │   └── activities.js
│   ├── middleware/          # Auth & validation
│   │   └── auth.js
│   ├── server.js            # Main server
│   ├── Dockerfile
│   └── package.json
│
├── android/                  # Native Android app (future)
│   └── README.md
│
├── docker-compose.yml        # Docker orchestration
└── README.md                # This file
```

## 🔄 Offline Sync Architecture

### How It Works

1. **Local-First**: All operations happen in IndexedDB first
2. **Sync Queue**: Changes are queued for synchronization
3. **Auto-Sync**: Runs every 5 minutes when online (configurable)
4. **Conflict Resolution**: Server data wins in conflicts
5. **Retry Logic**: Failed syncs retry with exponential backoff

### Sync Flow

```
User Action → IndexedDB → Sync Queue → API Call → Update Local
                ↓                                      ↓
          Immediate Save                      Mark as Synced
```

### Database Schema

```javascript
// IndexedDB (Frontend)
activities: {
  id: number,              // Local ID
  serverId: string,        // MongoDB _id
  type: 'walk'|'run'|'ride',
  startTime: Date,
  endTime: Date,
  duration: number,        // seconds
  distance: number,        // meters
  route: [{lat, lng, timestamp, altitude}],
  syncStatus: 'pending'|'synced'|'conflict'
}

// MongoDB (Backend)
Activity: {
  _id: ObjectId,
  userId: String,          // 'default-user' for single-user
  type: String,
  startTime: Date,
  endTime: Date,
  duration: Number,
  distance: Number,
  avgPace: Number,
  avgSpeed: Number,
  elevationGain: Number,
  route: [RoutePoint],
  syncStatus: String,
  lastModified: Date
}
```

## 🔐 API Authentication

### Current (Single-User)

Uses a simple API key in headers:
```bash
curl -H "X-API-Key: your_api_key_here" http://localhost:5000/api/activities
```

### Future (Multi-User) - Migration Guide

To add multi-user support:

1. **Backend Changes**:
   ```javascript
   // Uncomment JWT middleware in middleware/auth.js
   // Add user registration/login endpoints
   // Replace 'default-user' with req.user.id in controllers
   ```

2. **Frontend Changes**:
   ```javascript
   // Add login/register pages
   // Store JWT in localStorage instead of API key
   // Update API service to use Bearer token
   ```

3. **Database**:
   ```javascript
   // Add User model
   // Update Activity queries to filter by userId
   // Add indexes on userId field
   ```

## 📊 API Endpoints

### Activities

```
GET    /api/activities              # Get all activities
GET    /api/activities/:id          # Get single activity
POST   /api/activities              # Create activity
PUT    /api/activities/:id          # Update activity
DELETE /api/activities/:id          # Delete activity
POST   /api/activities/sync         # Bulk sync (offline support)
GET    /api/activities/stats        # Get statistics
GET    /api/activities/:id/export/gpx  # Export as GPX
```

### Query Parameters

```
?type=walk|run|ride       # Filter by activity type
?startDate=2024-01-01     # Filter by start date
?endDate=2024-12-31       # Filter by end date
?sortBy=startTime|distance|duration
?limit=50                 # Limit results
```

### Example Requests

```bash
# Get all running activities
curl -H "X-API-Key: your_key" \
  "http://localhost:5000/api/activities?type=run"

# Create new activity
curl -X POST \
  -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "walk",
    "startTime": "2024-02-04T10:00:00Z",
    "endTime": "2024-02-04T10:30:00Z",
    "duration": 1800,
    "distance": 3000,
    "route": [{"lat": 20.2961, "lng": 85.8245, "timestamp": "2024-02-04T10:00:00Z"}]
  }' \
  http://localhost:5000/api/activities

# Get statistics
curl -H "X-API-Key: your_key" \
  "http://localhost:5000/api/activities/stats?type=run"
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests (future)
npm run test:e2e
```

## 📦 Building for Production

### Frontend

```bash
cd frontend
npm run build
# Output in frontend/dist/
```

### Backend

```bash
cd backend
npm run build
# Or use Docker image
docker build -t trailsync-backend .
```

### Deploy with Docker

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**:
```bash
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/trailsync
API_KEY=your_secure_api_key_here
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend (.env.local)**:
```bash
VITE_API_URL=http://localhost:5000/api
VITE_MAP_PROVIDER=openstreetmap
```

## 🐛 Troubleshooting

### GPS Not Working
- Ensure HTTPS (required for geolocation) or use localhost
- Check browser location permissions
- Verify GPS is enabled on device

### Sync Failures
- Check API key is correct in Settings
- Verify backend is running and accessible
- Check browser console for errors
- Try "Force Full Sync" in Settings

### Map Not Loading
- Check internet connection (for map tiles)
- Verify OpenStreetMap is not blocked
- Try clearing browser cache

### Database Connection Issues
```bash
# Check MongoDB is running
mongosh
# Should connect successfully

# Restart MongoDB
brew services restart mongodb-community@7.0  # macOS
sudo systemctl restart mongod                # Linux
```

## 🚀 Performance Optimization

### Frontend
- **Code splitting**: Automatic with Vite
- **Map tile caching**: Configured in service worker
- **IndexedDB**: Indexed queries for fast lookup
- **Lazy loading**: Routes and components

### Backend
- **MongoDB indexes**: On userId, type, startTime
- **Compression**: Gzip for all responses
- **Rate limiting**: 100 requests per 15 minutes
- **Connection pooling**: MongoDB default pool

## 🛣️ Roadmap

### Phase 1: Current (v1.0)
- ✅ Single-user fitness tracking
- ✅ Offline support with sync
- ✅ GPS tracking and maps
- ✅ Activity history and stats
- ✅ GPX export

### Phase 2: Multi-User (v2.0)
- ⏳ User authentication (JWT)
- ⏳ User profiles
- ⏳ Privacy settings
- ⏳ Social features (optional)

### Phase 3: Native Apps (v3.0)
- ⏳ Android app with step counter
- ⏳ iOS app
- ⏳ Wear OS integration
- ⏳ Apple Watch integration

### Phase 4: Advanced Features (v4.0)
- ⏳ Heart rate monitoring
- ⏳ Training plans
- ⏳ Goals and achievements
- ⏳ Route planning
- ⏳ Community challenges

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- OpenStreetMap for map data
- Leaflet for map rendering
- MongoDB and Mongoose teams
- React and Vite communities

## 📧 Support

For issues, questions, or suggestions:
- Open a GitHub issue
- Check existing documentation
- Review troubleshooting section

---

**TrailSync** - Weaving together routes, motion, and time 🏃‍♂️🚴‍♀️🚶‍♂️
