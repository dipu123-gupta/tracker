const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

exports.createSession = async (req, res) => {
    try {
        const { title } = req.body;
        const sessionId = uuidv4();
        
        const newSession = new Session({
            sessionId,
            title: title || 'Live Tracking Session'
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

        // Throttling: Only geocode if last history is > 5s ago
        let address = {};
        const lastLoc = session.locationHistory[session.locationHistory.length - 1];
        const timeDiff = lastLoc ? (new Date() - new Date(lastLoc.timestamp)) : 6000;

        if (timeDiff > 5000) {
            try {
                const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
                    headers: { 'User-Agent': 'GeoShare-App' }
                });
                
                if (response.data && response.data.address) {
                    const addr = response.data.address;
                    address = {
                        village: addr.village || addr.suburb || addr.neighbourhood || 'N/A',
                        city: addr.city || addr.town || addr.district || 'N/A',
                        pincode: addr.postcode || 'N/A',
                        state: addr.state || 'N/A',
                        country: addr.country || 'N/A',
                        fullAddress: response.data.display_name
                    };
                }
            } catch (geoError) {
                console.error('Geocoding error:', geoError.message);
                address = lastLoc?.address || {};
            }
        } else {
            address = lastLoc?.address || {};
        }

        const newLocation = {
            latitude,
            longitude,
            accuracy,
            deviceInfo,
            address,
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
