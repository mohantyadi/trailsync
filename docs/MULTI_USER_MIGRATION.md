# Multi-User Migration Guide

This guide explains how to migrate TrailSync from single-user mode to multi-user support with JWT authentication.

## Overview

TrailSync is currently built for single-user mode but architectured to easily scale. All the foundational code is in place - you just need to:
1. Implement user authentication
2. Update the authorization middleware
3. Modify controllers to use user IDs
4. Add user-related UI components

## Architecture Changes

### Current: Single-User Mode
```
┌─────────┐     API Key      ┌─────────┐
│ Client  │ ───────────────> │  API    │
└─────────┘                  └─────────┘
                                  │
                                  ▼
                             userId: 'default-user'
```

### Future: Multi-User Mode
```
┌─────────┐     JWT Token    ┌─────────┐
│ Client  │ ───────────────> │  API    │
└─────────┘                  └─────────┘
     ▲                            │
     │                            ▼
 Login/Register              userId from token
```

## Backend Migration

### Step 1: Create User Model

Create `backend/models/User.js`:

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  profile: {
    avatar: String,
    bio: String,
    location: String,
    preferences: {
      units: {
        type: String,
        enum: ['metric', 'imperial'],
        default: 'metric'
      },
      privacy: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'private'
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

### Step 2: Update Environment Variables

Add to `backend/.env`:

```bash
# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_here_min_32_chars
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Password Reset
RESET_PASSWORD_EXPIRE=10
```

### Step 3: Create Auth Controller

Create `backend/controllers/authController.js`:

```javascript
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name
    });

    // Generate token
    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Error registering user'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = signToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Error logging in'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching user'
    });
  }
};
```

### Step 4: Update Auth Middleware

Replace `backend/middleware/auth.js` with:

```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization && 
      req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }
};

module.exports = protect;
```

### Step 5: Update Activity Controller

In `backend/controllers/activityController.js`, replace all instances of:

```javascript
// OLD
const query = { userId: 'default-user' };

// NEW
const query = { userId: req.user.id };
```

Example:

```javascript
exports.getActivities = async (req, res) => {
  try {
    // Use authenticated user's ID
    const query = { userId: req.user.id };
    
    // ... rest of the code
  }
};
```

### Step 6: Create Auth Routes

Create `backend/routes/auth.js`:

```javascript
const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const protect = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
```

### Step 7: Update Server

In `backend/server.js`, add:

```javascript
// Add auth routes
app.use('/api/auth', require('./routes/auth'));

// Update activity routes to use new middleware
const protect = require('./middleware/auth');
app.use('/api/activities', protect, require('./routes/activities'));
```

### Step 8: Update Package.json

Add dependencies:

```bash
cd backend
npm install jsonwebtoken bcryptjs
```

## Frontend Migration

### Step 1: Create Auth Context

Create `frontend/src/contexts/AuthContext.jsx`:

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await apiService.getMe();
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await apiService.login(email, password);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('token', response.token);
  };

  const register = async (email, password, name) => {
    const response = await apiService.register(email, password, name);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('token', response.token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Step 2: Update API Service

In `frontend/src/services/api.js`:

```javascript
// Update interceptor to use JWT
this.client.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Add auth methods
async login(email, password) {
  const response = await this.client.post('/auth/login', {
    email,
    password
  });
  return response.data;
}

async register(email, password, name) {
  const response = await this.client.post('/auth/register', {
    email,
    password,
    name
  });
  return response.data;
}

async getMe() {
  const response = await this.client.get('/auth/me');
  return response.data;
}
```

### Step 3: Create Login Component

Create `frontend/src/components/Login.jsx`:

```javascript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>{isLogin ? 'Login' : 'Register'}</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        
        <p className="toggle-mode">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
```

### Step 4: Update App.jsx

```javascript
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';

function ProtectedRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <>
      <Navigation />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<TrackingPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <ProtectedRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}
```

### Step 5: Update Navigation

Add logout button to Navigation component:

```javascript
import { useAuth } from '../contexts/AuthContext';

function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="navigation">
      {/* ... existing nav items ... */}
      
      <div className="nav-user">
        <span>Hello, {user?.name}</span>
        <button onClick={logout} className="btn btn-secondary">
          Logout
        </button>
      </div>
    </nav>
  );
}
```

## Database Migration

### Migrate Existing Data

If you have existing activities from single-user mode:

```javascript
// Migration script: backend/scripts/migrateToMultiUser.js
const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const User = require('../models/User');

async function migrate() {
  // Connect to database
  await mongoose.connect(process.env.MONGODB_URI);

  // Create default user or use existing
  const defaultUser = await User.findOne({ email: 'default@trailsync.com' });
  const userId = defaultUser ? defaultUser._id : 'NEW_USER_ID';

  // Update all activities with default-user to actual user ID
  await Activity.updateMany(
    { userId: 'default-user' },
    { userId: userId.toString() }
  );

  console.log('Migration complete');
  process.exit(0);
}

migrate();
```

Run migration:

```bash
cd backend
node scripts/migrateToMultiUser.js
```

## Testing Multi-User

1. **Create test users**:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "password123",
    "name": "User One"
  }'
```

2. **Login and get token**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "password123"
  }'
```

3. **Use token for activities**:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/activities
```

## Security Considerations

1. **Password Requirements**: Enforce strong passwords (min 8 chars)
2. **Rate Limiting**: Implement stricter limits on auth endpoints
3. **Email Verification**: Add email verification for new accounts
4. **Password Reset**: Implement forgot password flow
5. **Session Management**: Add token refresh mechanism
6. **2FA**: Consider two-factor authentication

## Deployment Checklist

- [ ] Update JWT_SECRET in production
- [ ] Enable HTTPS
- [ ] Set secure cookie flags
- [ ] Configure CORS properly
- [ ] Add rate limiting on auth endpoints
- [ ] Implement email service
- [ ] Set up monitoring for failed login attempts
- [ ] Add audit logging
- [ ] Test thoroughly with multiple users
- [ ] Update documentation

## Rollback Plan

If issues arise:

1. **Keep single-user code**: Don't delete old auth.js
2. **Database backup**: Backup before migration
3. **Feature flag**: Use environment variable to switch modes
4. **Quick revert**: Simple config change to go back

```javascript
// In middleware/auth.js
const USE_JWT = process.env.USE_JWT_AUTH === 'true';

if (USE_JWT) {
  // JWT auth
} else {
  // API key auth (fallback)
}
```

## Conclusion

This migration maintains backward compatibility while adding full multi-user support. The architecture is designed to make this transition smooth with minimal code changes.
