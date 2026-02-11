import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, AlertCircle, Shield } from 'lucide-react';
import { supabase } from '../../supabase';

const API_URL = 'https://votifybackend-h0yt.onrender.com/api';

export default function LandingPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [securityWarning, setSecurityWarning] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSecurityWarning('');
        setLoading(true);

        try {
            // Step 1: Check rate limiting FIRST
            const rateLimitCheck = await fetch(`${API_URL}/voter/login-check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const checkData = await rateLimitCheck.json();
            
            // If rate limited, show error and STOP
            if (!rateLimitCheck.ok) {
                if (checkData.rateLimited) {
                    const hours = Math.floor(checkData.retryAfter / 3600);
                    const minutes = Math.floor((checkData.retryAfter % 3600) / 60);
                    
                    let timeMessage = '';
                    if (hours > 0) timeMessage += `${hours} hour${hours > 1 ? 's' : ''} `;
                    if (minutes > 0) timeMessage += `${minutes} minute${minutes > 1 ? 's' : ''}`;
                    
                    setError(`⏰ Too many failed attempts. Please try again in ${timeMessage.trim()}.`);
                    setLoading(false);
                    return;
                }
                setError('⚠️ Security check failed. Please try again.');
                setLoading(false);
                return;
            }

            // Show warning if close to limit
            if (checkData.violations?.ipViolations >= 8 || checkData.violations?.emailViolations >= 7) {
                setSecurityWarning('⚠️ Multiple failed attempts detected. Next failure may result in temporary ban.');
            }

            // Step 2: Attempt authentication
            const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            // Step 3: Handle authentication result
            if (supabaseError) {
                // Track failed attempt
                await fetch(`${API_URL}/voter/login-failed`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                }).catch(() => {}); 
                
                // Show appropriate error message - DO NOT NAVIGATE
                if (supabaseError.message.includes('Invalid login credentials')) {
                    setError('❌ Invalid email or password. Please try again.');
                } else if (supabaseError.message.includes('Email not confirmed')) {
                    setError('📧 Please verify your email before logging in.');
                } else {
                    setError(`❌ ${supabaseError.message}`);
                }
                
                setLoading(false);
                return; // IMPORTANT: Stop here, don't navigate
            }

            // Step 4: SUCCESS - only reached if no errors
            // Track successful login
            await fetch(`${API_URL}/voter/login-success`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            }).catch(() => {});
            
            // Navigate to user portal
            navigate('/user');
            
        } catch (err) {
            console.error('Login error:', err);
            setError('🔴 Connection error. Please check your internet and try again.');
            setLoading(false);
        }
        // No need for finally block with setLoading(false) since we handle it in each branch
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black text-white italic tracking-tighter">
                        VOTIFY EMS <span className="text-emerald-500 not-italic text-2xl">v3</span>
                    </h1>
                    <p className="text-slate-400 mt-2 font-bold uppercase tracking-widest text-xs">
                        Electronic Management System
                    </p>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-2xl">
                    <div className="flex items-center gap-2 mb-6">
                        <Shield className="text-emerald-500" size={20} />
                        <h2 className="text-2xl font-black text-slate-800">Secure Voter Login</h2>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                            <div className="flex items-start gap-2">
                                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                <p className="text-red-700 text-sm font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    {securityWarning && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                            <div className="flex items-start gap-2">
                                <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-amber-700 text-sm font-medium">{securityWarning}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email Address</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="voter@example.com"
                                    className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-3.5 rounded-xl outline-none focus:border-emerald-500 transition-all"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-3.5 rounded-xl outline-none focus:border-emerald-500 transition-all"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-200 disabled:shadow-none"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    VERIFYING...
                                </>
                            ) : (
                                <>
                                    SIGN IN TO PORTAL <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 space-y-4 text-center">
                        <p className="text-xs text-slate-500">
                            <Shield size={12} className="inline mr-1" />
                            Protected by advanced rate limiting and security monitoring
                        </p>
                        
                        <button
                            onClick={() => navigate('/admin')}
                            className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                        >
                            — Admin Access Gateway —
                        </button>
                    </div>
                </div>

                <p className="text-center text-slate-500 text-[10px] mt-8 font-medium">
                    Official Votify Electoral Management System &copy; 2026
                </p>
            </div>
        </div>
    );
}