require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const doorRoutes         = require('./routes/door.routes');
const attendanceRoutes   = require('./routes/attendance.routes');
const requestRoutes      = require('./routes/request.routes');
const visitorRoutes      = require('./routes/visitor.routes');
const notificationRoutes = require('./routes/notification.routes');
const logsRoutes         = require('./routes/logs.routes');
const piRoutes           = require('./routes/pi.routes');
const preferencesRoutes  = require('./routes/preferences.routes');
const adminRoutes        = require('./routes/admin.routes');
const faceRoutes         = require('./routes/face.routes');

const app = express();

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/doors',         doorRoutes);
app.use('/api/attendance',    attendanceRoutes);
app.use('/api/requests',      requestRoutes);
app.use('/api/visitors',      visitorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/logs',          logsRoutes);
app.use('/api/pi',            piRoutes);
app.use('/api/preferences',   preferencesRoutes);
app.use('/api/admin',         adminRoutes);  // Admin endpoints for token management
app.use('/api/face',          faceRoutes);   // Face recognition endpoints

// ── Health check ──────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});
