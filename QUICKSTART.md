# TrailSync Quick Start Guide

Get TrailSync up and running in 5 minutes!

## 🚀 Fastest Way (Docker)

```bash
# 1. Generate API key
export API_KEY=$(openssl rand -base64 32)

# 2. Create backend .env file
echo "PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://mongodb:27017/trailsync
API_KEY=$API_KEY
CORS_ORIGIN=http://localhost:3000" > backend/.env

# 3. Start backend with Docker
docker-compose up -d

# 4. Setup frontend
cd frontend
npm install
echo "VITE_API_URL=http://localhost:5000/api" > .env.local
npm run dev

# 5. Open http://localhost:3000
```

## ⚙️ Initial Configuration

1. **Open the app** at http://localhost:3000
2. **Navigate to Settings** (click ⚙️ icon)
3. **Enter your API key** (the one you generated above or from backend/.env)
4. **Click "Save API Key"**
5. **Enable Auto-sync** (toggle should be on)

## 📱 First Activity

1. **Click "Track"** in navigation
2. **Grant location permission** when browser asks
3. **Select activity type**: Walk, Run, or Ride
4. **Click "Start Tracking"** (big button)
5. **Go for a walk/run/ride!** Watch the map update
6. **Click "Stop"** when done
7. Your activity is automatically saved!

## 📊 View History

1. **Click "History"** in navigation
2. **See all your activities** in a grid
3. **Click any activity** to see detailed stats and map
4. **Use filters** to find specific activities
5. **Export as GPX** or delete activities

## 🔧 Troubleshooting

### "Location permission denied"
- Click lock icon in browser address bar
- Allow location access
- Refresh page

### "Cannot connect to backend"
- Check backend is running: `docker-compose ps`
- Check MongoDB is running: `docker-compose logs mongodb`
- Verify API URL in Settings

### "Sync failed"
- Check API key is correct
- Verify you're online (check status indicator)
- Try "Force Full Sync" in Settings

## 📚 What's Next?

- **Read full README.md** for detailed documentation
- **Check MULTI_USER_MIGRATION.md** to add authentication
- **Explore android/README.md** for native app plans

## 💡 Pro Tips

- **Offline Mode**: Works without internet! Activities sync when back online
- **PWA**: Install as app on mobile (browser menu → "Add to Home Screen")
- **Auto-Sync**: Happens every 5 minutes automatically
- **Battery**: Close tracking screen when not actively tracking
- **Accuracy**: Best results outdoors with clear sky view

## 🆘 Need Help?

1. Check the main README.md
2. Look at browser console for errors (F12)
3. Check backend logs: `docker-compose logs backend`
4. Verify database: `docker-compose logs mongodb`

Happy tracking! 🏃‍♂️🚴‍♀️🚶‍♂️
