const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: {
        village: String,
        city: String,
        pincode: String,
        state: String,
        country: String,
        fullAddress: String
    },
    accuracy: { type: Number },
    timestamp: { type: Date, default: Date.now },
    deviceInfo: { type: Object }
});

const SessionSchema = new mongoose.Schema({
    sessionId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    title: { type: String, default: 'Untitled Session' },
    createdAt: { type: Date, default: Date.now },
    locationHistory: [LocationSchema],
    isActive: { type: Boolean, default: true },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    previewIndex: { type: Number, default: 0 },
    // Auto-delete session after 5 days (TTL)
    expiresAt: { 
        type: Date, 
        default: () => new Date(+new Date() + 5*24*60*60*1000),
        index: { expireAfterSeconds: 0 } 
    }
});

module.exports = mongoose.model('Session', SessionSchema);
