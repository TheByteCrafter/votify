import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, AlertCircle, Shield } from 'lucide-react';
import { supabase } from '../../supabase';

const API_URL = 'https://votifybackend-h0yt.onrender.com/api';

export default function LandingPage({ onBanTrigger, checkBanStatus }) {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [securityWarning, setSecurityWarning] = useState('');

    const handleAspirantSignup = () => {
        navigate('/aspirant');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSecurityWarning('');
        setLoading(true);

        try {

            const rateLimitCheck = await fetch(`${API_URL}/voter/login-check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const checkData = await rateLimitCheck.json();

            // 🚨 CHECK FOR PRE-EXISTING BAN - Using checkData, not updatedData
            if (checkData.violations?.ipViolations >= 15 || checkData.violations?.emailViolations >= 10) {
                // User is already banned - trigger global ban immediately
                onBanTrigger(email, checkData.violations);
                setLoading(false);
                return;
            }

            // Step 2: Check if rate limited (but not banned)
            if (!rateLimitCheck.ok) {
                if (checkData.rateLimited) {
                    const hours = Math.floor(checkData.retryAfter / 3600);
                    const minutes = Math.floor((checkData.retryAfter % 3600) / 60);

                    let timeMessage = '';
                    if (hours > 0) timeMessage += `${hours} hour${hours > 1 ? 's' : ''} `;
                    if (minutes > 0) timeMessage += `${minutes} minute${minutes > 1 ? 's' : ''}`;

                    setError(`⏰ Too many attempts. Try again in ${timeMessage.trim()}.`);
                    setLoading(false);
                    return;
                }
                setError('⚠️ Security verification failed.');
                setLoading(false);
                return;
            }

            // Step 3: Progressive warnings
            const ipWarnings = checkData.violations?.ipViolations || 0;
            const emailWarnings = checkData.violations?.emailViolations || 0;

            if (ipWarnings >= 12 || emailWarnings >= 8) {
                const remainingAttempts = 15 - ipWarnings;
                setSecurityWarning(
                    `⚠️ FINAL WARNING: ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining before 24-hour LOCKOUT
• Incorrect credentials will result in automatic ban
• Contact administrator if you've forgotten your password`
                );
            } else if (ipWarnings >= 8 || emailWarnings >= 5) {
                const remainingAttempts = 10 - emailWarnings;
                setSecurityWarning(
                    `⚠️ SECURITY ALERT: ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining
• Multiple failures will trigger temporary account lock
• Verify your credentials before continuing`
                );
            }

            // Step 4: Attempt authentication
            const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            // Step 5: Handle authentication failure
            if (supabaseError) {
                // Track failed attempt (this will increment the violation counter)
                await fetch(`${API_URL}/voter/login-failed`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                }).catch(() => { });

                // Get UPDATED violation count after tracking
                const updatedCheck = await fetch(`${API_URL}/voter/login-check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                const updatedData = await updatedCheck.json();

                // 🚨 CHECK IF THIS ATTEMPT CAUSED A BAN - NOW updatedData EXISTS
                if (updatedData.violations?.ipViolations >= 15 || updatedData.violations?.emailViolations >= 10) {
                    // TRIGGER GLOBAL BAN - This will show BanScreen and block ALL routes
                    onBanTrigger(email, updatedData.violations);
                    setLoading(false);
                    return;
                }

                // Show appropriate error message for non-ban failures
                if (supabaseError.message.includes('Invalid login credentials')) {
                    const remainingAttempts = 10 - (updatedData.violations?.emailViolations || 0);
                    setError(`❌ Invalid email or password. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining before 24-hour lockout.`);
                } else if (supabaseError.message.includes('Email not confirmed')) {
                    setError('📧 Please verify your email before logging in. Check your inbox for confirmation link.');
                } else {
                    setError(`❌ Login failed: ${supabaseError.message}`);
                }

                setLoading(false);
                return;
            }

            // Step 6: SUCCESS - Reset violations and navigate
            await fetch(`${API_URL}/voter/login-success`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            }).catch(() => { });

            // Clear ban state on successful login
            if (checkBanStatus) {
                await checkBanStatus(email); // This will clear the ban if it existed
            }

            // Clear any existing warnings
            setSecurityWarning('');
            setError('');

            // Full system access granted
            navigate('/user', {
                state: {
                    welcome: true,
                    message: '✅ Secure access granted. Welcome to Votify EMS.'
                }
            });

        } catch (err) {
            console.error('Login system error:', err);
            setError(
                `🔴 SYSTEM UNAVAILABLE
            
Unable to connect to the secure authentication service.
            
• Check your internet connection
• Try again in a few minutes
• Contact support if issue persists
            
Error: ${err.message || 'Connection failed'}`
            );
            setLoading(false);
        }
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
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl whitespace-pre-line">
                            <div className="flex items-start gap-2">
                                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                <p className="text-red-700 text-sm font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    {securityWarning && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl whitespace-pre-line">
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
                        <button
                            onClick={handleAspirantSignup}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-200 disabled:shadow-none"
                        >
                            Sign Up as An Aspirant
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