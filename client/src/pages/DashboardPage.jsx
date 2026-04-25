import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { Map as MapIcon, Users, Clock, Navigation, AlertCircle, Copy, Check, Trash2, Bell, BellOff } from 'lucide-react';
import axios from 'axios';

// Fix for Leaflet marker icon in Vite/React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const RecenterMap = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.setView(position, map.getZoom());
        }
    }, [position, map]);
    return null;
};

const DashboardPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);
    const [copied, setCopied] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const socketRef = useRef(null);
    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const { data } = await getSession(sessionId);
                setSession(data.session);
                setIsLive(data.session.isOnline);
                setHistory(data.session.locationHistory || []);
                if (data.session.locationHistory?.length > 0) {
                    const last = data.session.locationHistory[data.session.locationHistory.length - 1];
                    setCurrentLocation([last.latitude, last.longitude]);
                }
            } catch (err) {
                console.error(err);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        fetchSession();

        const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? 'https://trackers-oplf.onrender.com' : 'http://localhost:5000');
        socketRef.current = io(socketUrl);
        socketRef.current.emit('join-session', sessionId);

        socketRef.current.on('status-changed', (data) => {
            setIsLive(data.isOnline);
        });

        socketRef.current.on('location-updated', (data) => {
            if (soundEnabled) audioRef.current.play().catch(e => console.log('Sound blocked'));
            
            const newPos = [data.latitude, data.longitude];
            setCurrentLocation(newPos);
            setHistory(prev => [...prev, data]);
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [sessionId, soundEnabled, navigate]);

    const copyLink = () => {
        const shareUrl = `${window.location.origin}/share/${sessionId}`;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this session and all its data? This cannot be undone.')) {
            try {
                const { deleteSession: delApi } = await import('../services/api');
                await delApi(sessionId);
                navigate('/');
            } catch (err) {
                alert('Failed to delete session');
            }
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="animate-pulse font-mono tracking-widest text-xs">INITIALIZING ENCRYPTED DASHBOARD...</p>
        </div>
    );

    const lastUpdate = history.length > 0 ? new Date(history[history.length - 1].timestamp).toLocaleTimeString() : 'N/A';

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
            {/* Header */}
            <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-10 shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-900/20">
                        <Navigation size={22} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-white leading-none tracking-tight">{session?.title}</h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-slate-600'}`}></span>
                            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                                {isLive ? 'Live Connection' : 'Target Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-2 rounded-lg transition-all ${soundEnabled ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 bg-slate-800'}`}
                        title={soundEnabled ? "Mute Alerts" : "Enable Alerts"}
                    >
                        {soundEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                    </button>

                    <button 
                        onClick={handleDelete}
                        className="p-2 text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all"
                        title="Delete Session"
                    >
                        <Trash2 size={18} />
                    </button>
                    
                    <button 
                        onClick={copyLink}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg transition-all border border-slate-700"
                    >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Share Link'}
                    </button>

                    <div className="h-6 w-px bg-slate-800 mx-2"></div>

                    <div className="flex items-center gap-4 text-slate-400 bg-black/20 px-4 py-1.5 rounded-full border border-slate-800">
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] uppercase font-black text-slate-500 tracking-tighter">Last Ping</span>
                            <span className="text-xs font-mono font-bold text-blue-400">{lastUpdate}</span>
                        </div>
                        <Clock size={16} className="text-slate-600" />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">
                {/* Sidebar */}
                <div className="w-full md:w-80 space-y-4 overflow-y-auto custom-scrollbar">
                    {/* Address Card */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <MapIcon size={14} className="text-blue-500" /> Geolocation Intelligence
                        </h3>
                        {history.length > 0 && history[history.length - 1].address ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-600/5 border border-blue-500/20 rounded-xl">
                                    <label className="text-[9px] uppercase font-black text-blue-500/60 block mb-1">Current Village / suburb</label>
                                    <p className="text-sm font-bold text-white">{history[history.length - 1].address.village}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
                                        <label className="text-[9px] uppercase font-black text-slate-500 block mb-1">Pincode</label>
                                        <p className="text-xs font-mono font-bold text-slate-300">{history[history.length - 1].address.pincode}</p>
                                    </div>
                                    <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
                                        <label className="text-[9px] uppercase font-black text-slate-500 block mb-1">State Code</label>
                                        <p className="text-xs font-bold text-slate-300">{history[history.length - 1].address.state.substring(0, 5)}</p>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
                                    <label className="text-[9px] uppercase font-black text-slate-500 block mb-1">City & Region</label>
                                    <p className="text-xs font-bold text-slate-300">
                                        {history[history.length - 1].address.city}, {history[history.length - 1].address.state}
                                    </p>
                                </div>

                                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                    <label className="text-[9px] uppercase font-black text-amber-500/60 block mb-1">Full Identified Address</label>
                                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                                        {history[history.length - 1].address.fullAddress}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                                <AlertCircle size={32} className="mb-2" />
                                <p className="text-[10px] uppercase font-bold tracking-widest">Awaiting Signal...</p>
                            </div>
                        )}
                    </div>

                    {/* Stats Card */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Navigation size={14} className="text-blue-500" /> Digital Signature
                        </h3>
                        {currentLocation ? (
                            <div className="space-y-3 font-mono">
                                <div className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Lat</span>
                                    <span className="text-xs text-blue-400 font-bold">{currentLocation[0].toFixed(6)}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Lng</span>
                                    <span className="text-xs text-blue-400 font-bold">{currentLocation[1].toFixed(6)}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Samples</span>
                                    <span className="text-xs text-white font-bold">{history.length}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[10px] text-slate-600 italic text-center py-4 font-mono uppercase tracking-tighter">Encrypted data pending...</p>
                        )}
                    </div>
                </div>

                {/* Map Container */}
                <div className="flex-1 bg-slate-900 rounded-2xl shadow-inner border border-slate-800 overflow-hidden relative min-h-[400px]">
                    <MapContainer 
                        center={currentLocation || [20, 0]} 
                        zoom={currentLocation ? 16 : 3} 
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%', filter: 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        
                        {currentLocation && (
                            <>
                                <RecenterMap position={currentLocation} />
                                <Marker position={currentLocation}>
                                    <Popup className="dark-popup">
                                        <div className="p-2 text-slate-900">
                                            <p className="font-bold border-b pb-1 mb-1">Target Position</p>
                                            <p className="text-[10px] opacity-70">Identified at {lastUpdate}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                                <Circle 
                                    center={currentLocation} 
                                    radius={40} 
                                    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }} 
                                />
                                <Circle 
                                    center={currentLocation} 
                                    radius={5} 
                                    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1 }} 
                                />
                            </>
                        )}
                    </MapContainer>

                    {!currentLocation && (
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-8">
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center p-6 bg-blue-600/10 text-blue-500 rounded-full mb-4 border border-blue-500/20">
                                    <Navigation size={48} className="animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 tracking-widest uppercase">Waiting for Uplink</h3>
                                <p className="text-slate-500 text-xs max-w-xs mx-auto uppercase tracking-wider leading-relaxed">
                                    Connection established. Awaiting target to initialize location transmission.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Dark map overlay fix */}
                    <style>{`
                        .leaflet-tile { filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) !important; }
                        .leaflet-container { background: #020617 !important; }
                        .dark-popup .leaflet-popup-content-wrapper { background: #1e293b; color: white; border-radius: 8px; }
                        .dark-popup .leaflet-popup-tip { background: #1e293b; }
                    `}</style>
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
