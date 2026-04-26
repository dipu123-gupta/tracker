require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const sessionRoutes = require('./routes/sessionRoutes');

const app = express();
const server = http.createServer(app);

// CORS Configuration
const allowedOrigins = [
    process.env.CLIENT_URL,
    "https://tracker-3-2lcg.onrender.com",
    "http://localhost:5173",
    "http://localhost:5174"
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // For Leaflet maps
}));
app.use(cors({
    origin: allowedOrigins
}));
app.use(express.json());
app.set('io', io); // Store io instance in app

// Middleware to attach io to req
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100 
});
app.use('/api/', limiter);

// Database Connection
console.log('Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
})
    .then(() => console.log('✅ Connected to MongoDB Successfully'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        console.log('Please check your internet connection and MongoDB Atlas IP whitelist.');
    });

// Routes
app.use('/api', sessionRoutes);

// Serve Static Frontend in Production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
}

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-session', async (sessionId) => {
        try {
            socket.join(sessionId);
            socket.sessionId = sessionId; // Attach to socket for disconnect handling
            
            // Update status to online
            if (mongoose.connection.readyState === 1) {
                const Session = require('./models/Session');
                await Session.findOneAndUpdate({ sessionId }, { isOnline: true, lastSeen: new Date() });
                io.to(sessionId).emit('status-changed', { isOnline: true });
                console.log(`User ${socket.id} joined session: ${sessionId}`);
            } else {
                console.warn('Database not ready, skipping status update for session:', sessionId);
            }
        } catch (err) {
            console.error('Error in join-session socket handler:', err.message);
        }
    });

    socket.on('update-location', (data) => {
        const { sessionId, latitude, longitude, accuracy, deviceInfo, address } = data;
        io.to(sessionId).emit('location-updated', {
            latitude,
            longitude,
            accuracy,
            deviceInfo,
            address,
            timestamp: new Date()
        });
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
        if (socket.sessionId) {
            const Session = require('./models/Session');
            // Wait a bit to see if it was just a refresh
            setTimeout(async () => {
                try {
                    const room = io.sockets.adapter.rooms.get(socket.sessionId);
                    if ((!room || room.size === 0) && mongoose.connection.readyState === 1) {
                        await Session.findOneAndUpdate({ sessionId: socket.sessionId }, { isOnline: false, lastSeen: new Date() });
                        io.to(socket.sessionId).emit('status-changed', { isOnline: false });
                    }
                } catch (err) {
                    console.error('Error in disconnect socket handler:', err.message);
                }
            }, 3000);
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
