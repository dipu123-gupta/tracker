import React, { useState } from 'react';
import { createSession } from '../services/api';
import { Link2, MapPin, ShieldCheck, Zap, Copy, Check } from 'lucide-react';

const HomePage = () => {
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await createSession(title);
            setResult(data);
        } catch (error) {
            console.error('Error creating session:', error);
            alert('Failed to create session');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <header className="text-center mb-16">
                <div className="inline-flex items-center justify-center p-3 bg-primary-100 text-primary-600 rounded-2xl mb-6">
                    <MapPin size={40} />
                </div>
                <h1 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
                    Geo<span className="text-primary-600">Share</span>
                </h1>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                    Production-ready, consent-based real-time location sharing. 
                    Generate a link, share it, and track with permission.
                </p>
            </header>

            <div className="grid md:grid-cols-2 gap-8 mb-16">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Link2 className="text-primary-500" /> Generate Tracker
                    </h2>
                    
                    {!result ? (
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Session Title (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. My Trip to Paris"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-200 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Generating...' : <><Zap size={18} /> Create Secure Link</>}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                                <p className="text-green-700 font-medium flex items-center gap-2 text-sm mb-3">
                                    <ShieldCheck size={16} /> Link generated successfully!
                                </p>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Share with recipient:</label>
                                        <div className="flex gap-2">
                                            <input 
                                                readOnly 
                                                value={result.shareUrl}
                                                className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 overflow-hidden text-ellipsis"
                                            />
                                            <button 
                                                onClick={() => copyToClipboard(result.shareUrl)}
                                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                            >
                                                {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <a 
                                        href={result.dashboardUrl}
                                        className="block w-full py-3 bg-slate-900 text-white text-center font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg"
                                    >
                                        Open My Dashboard
                                    </a>
                                </div>
                            </div>
                            <button 
                                onClick={() => setResult(null)}
                                className="text-slate-500 text-sm font-medium hover:text-primary-600 underline underline-offset-4"
                            >
                                Create another session
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col justify-center space-y-8">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary-500 border border-slate-100">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">100% Consent Based</h3>
                            <p className="text-slate-500">Tracking only starts after the recipient explicitly clicks "Allow" in their browser.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary-500 border border-slate-100">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Real-time Updates</h3>
                            <p className="text-slate-500">See movement on the map instantly using high-frequency location polling or WebSockets.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary-500 border border-slate-100">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Precise Mapping</h3>
                            <p className="text-slate-500">Beautifully rendered maps using Leaflet.js with interactive markers and history.</p>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="text-center text-slate-400 text-sm">
                Built with Privacy First Design &copy; 2026 GeoShare Systems
            </footer>
        </div>
    );
};

export default HomePage;
