import React, { useState, useEffect  } from 'react';
import { Vote, Lock, Mail, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { rateLimiter } from '../States/rateLimit';
import { Ban,Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_APP_API_URL;


const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banTimeRemaining, setBanTimeRemaining] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    checkRateLimitStatus();
    const interval = setInterval(() => {
      if (isBanned) {
        const remaining = rateLimiter.getLocalBanTimeRemaining();
        setBanTimeRemaining(remaining);
        if (remaining <= 0) {
          setIsBanned(false);
          setFailedAttempts(0);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isBanned]);

  const checkRateLimitStatus = () => {

    if (rateLimiter.isLocallyBanned()) {
      setIsBanned(true);
      setBanTimeRemaining(rateLimiter.getLocalBanTimeRemaining());
      setFailedAttempts(rateLimiter.getFailedAttempts());
      return;
    }


    const storedRateLimit = rateLimiter.getStoredRateLimit();
    if (storedRateLimit && storedRateLimit.rateLimited) {
      const timeRemaining = Math.max(0, storedRateLimit.retryAfter - Math.floor((Date.now() - storedRateLimit.storedAt) / 1000));
      if (timeRemaining > 0) {
        setIsBanned(true);
        setBanTimeRemaining(timeRemaining);
        setError(`Rate limited. Please wait ${formatTime(timeRemaining)} before trying again.`);
      } else {
        rateLimiter.clearRateLimit();
      }
    }

    setFailedAttempts(rateLimiter.getFailedAttempts());
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
    return `${Math.ceil(seconds / 3600)} hours`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();


    // Check local ban first
    if (rateLimiter.isLocallyBanned()) {
      const remaining = rateLimiter.getLocalBanTimeRemaining();
      setIsBanned(true);
      setBanTimeRemaining(remaining);
      setError(`Too many failed attempts. Please wait ${formatTime(remaining)} before trying again.`);
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password: password }),
      });

      const data = await response.json();


      if (response.status === 429) {

        rateLimiter.storeRateLimit({
          rateLimited: true,
          retryAfter: data.retryAfter || 300,
          error: data.error,
        });

        rateLimiter.trackFailedAttempt();

        setIsBanned(true);
        setBanTimeRemaining(data.retryAfter || 300);
        setFailedAttempts(rateLimiter.getFailedAttempts());

        setError(`🚨 ${data.error} Please wait ${formatTime(data.retryAfter || 300)}.`);
        throw new Error(data.error);
      }

      if (!response.ok) {

        const attempts = rateLimiter.trackFailedAttempt();
        setFailedAttempts(attempts);


        if (attempts >= 3) {
          setIsBanned(true);
          setBanTimeRemaining(rateLimiter.getLocalBanTimeRemaining());
        }

        setError(`❌ ${data.error || 'Login failed'}`);
        throw new Error(data.error || 'Login failed');
      }
      // Successful login
      rateLimiter.resetFailedAttempts();
      rateLimiter.clearRateLimit();
      setIsBanned(false);
      setFailedAttempts(0);

      setMessage('Identity verified. Access granted...');


      if (onLoginSuccess) {
        console.log('Calling onLoginSuccess callback with:', data.admin);
        onLoginSuccess(data.admin);
      } else {
        console.warn('onLoginSuccess prop not provided!');

        setTimeout(() => {
          window.location.href = '/admin';
        }, 1500);
      }

    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  /*const resetLocalBan = () => {
    if (confirm('Are you sure you want to reset your local ban? This may not clear server-side restrictions.')) {
      rateLimiter.resetFailedAttempts();
      rateLimiter.clearRateLimit();
      setIsBanned(false);
      setFailedAttempts(0);
      setError(null);
      setMessage('Local ban cleared. You may try logging in again.');
    }
  };
  */
  if (isBanned) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-900 to-rose-900 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-lg bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 border border-red-500/30 rounded-2xl mb-6">
              <Ban className="w-10 h-10 text-red-300" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Access Temporarily Restricted</h1>
            <p className="text-rose-200">Security protocol activated</p>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="h-6 w-6 text-red-300" />
                <h2 className="text-xl font-bold text-white">Multiple Failed Attempts</h2>
              </div>
              <p className="text-red-100 mb-4">
                {failedAttempts >= 5
                  ? 'Multiple suspicious login attempts detected. This is a security measure to prevent unauthorized access.'
                  : 'Too many failed login attempts. Please wait before trying again.'}
              </p>

              <div className="flex items-center justify-between bg-red-900/30 p-4 rounded-xl mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-300" />
                  <span className="text-red-200 font-medium">Time remaining:</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {Math.floor(banTimeRemaining / 60)}:{String(banTimeRemaining % 60).padStart(2, '0')}
                </div>
              </div>

              <p className="text-red-200/80 text-sm">
                Attempts: <span className="font-bold">{failedAttempts}</span> •
                System will unlock automatically
              </p>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-300 mt-0.5" />
                <div>
                  <p className="text-amber-100 font-medium mb-1">Security Notice</p>
                  <p className="text-amber-200/80 text-sm">
                    {failedAttempts >= 5
                      ? '⚠️ Further violations may result in permanent IP restriction.'
                      : 'Each violation increases lock duration. Please verify your credentials.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
              >
                Refresh Status
              </button>

            
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-white/50 text-sm">
              Security Incident #{Date.now().toString().slice(-6)} • {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-105 bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative z-10">

        <div className="pt-12 pb-8 px-8 text-center bg-white">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 rounded-[1.8rem] mb-6 shadow-xl shadow-blue-500/10 transform -rotate-2">
            <Vote className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Portal</h1>
          <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">Secure Election Terminal</p>
        </div>

        <div className="px-10 pb-12">

          <div className="mb-8 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-[10px] text-amber-800 font-bold uppercase tracking-tight leading-tight">
              Authorized Personnel Only. All access is logged.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Identity Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  placeholder="admin@me.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm text-slate-800 font-medium placeholder:text-slate-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Secure Passphrase</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm text-slate-800 font-medium placeholder:text-slate-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all active:scale-95 text-sm disabled:opacity-50 shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  'Authorize Access'
                )}
              </button>
            </div>
          </form>


          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-[10px] text-red-700 font-black uppercase tracking-tight leading-tight">{error}</p>
            </div>
          )}

          {message && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-[10px] text-emerald-700 font-black uppercase tracking-tight leading-tight">{message}</p>
            </div>
          )}
        </div>

        {failedAttempts > 0 && failedAttempts < 3 && (
          <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <p className="text-xs text-amber-300 font-medium">
                {3 - failedAttempts} more failed attempt{3 - failedAttempts > 1 ? 's' : ''} will result in temporary ban.
              </p>
            </div>
          </div>
        )}

        <div className="mt-auto bg-slate-50 py-4 px-8 border-t border-slate-100 flex justify-between items-center">
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">AES-256 Encrypted</span>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Identity Node 01</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;