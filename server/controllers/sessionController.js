const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

exports.createSession = async (req, res) => {
    try {
        const { title } = req.body;
        const sessionId = uuidv4();
        const previewIndex = Math.floor(Math.random() * 7); // Random index for 7 images
        
        const newSession = new Session({
            sessionId,
            title: title || 'Private Message',
            previewIndex
        });

        await newSession.save();
        const baseUrl = process.env.CLIENT_URL?.endsWith('/') 
            ? process.env.CLIENT_URL.slice(0, -1) 
            : (process.env.CLIENT_URL || 'http://localhost:5173');

        res.status(201).json({ 
            success: true, 
            sessionId,
            shareUrl: `${baseUrl}/#/share/${sessionId}`,
            dashboardUrl: `${baseUrl}/#/dashboard/${sessionId}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSession = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await Session.findOne({ sessionId: id });
        
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        res.json({ success: true, session });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateLocation = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { latitude, longitude, accuracy, deviceInfo } = req.body;

        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        const newLocation = {
            latitude,
            longitude,
            accuracy,
            deviceInfo,
            address: req.body.address || {},
            timestamp: new Date()
        };

        session.locationHistory.push(newLocation);
        await session.save();

        // Emit update via socket
        if (req.io) {
            req.io.to(sessionId).emit('location-updated', newLocation);
        }

        res.json({ success: true, message: 'Location updated', address });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await Session.findOneAndDelete({ sessionId });
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }
        res.json({ success: true, message: 'Session deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
