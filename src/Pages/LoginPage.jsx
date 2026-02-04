import React, { useState } from 'react';
import { supabase } from '../../supabase'; 
import { Vote, Lock, Mail, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (loginError) {
      setError(loginError.message);
      alert('Access Denied: ' + loginError);
    } else {
      setMessage('Identity verified. Accessing secure terminal...');
      
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-105 bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative z-10">
        {/* Brand Header */}
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 text-slate-500">Identity Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  placeholder="admin@agency.gov"
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

        <div className="mt-auto bg-slate-50 py-4 px-8 border-t border-slate-100 flex justify-between items-center">
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">AES-256 Encrypted</span>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Identity Node 01</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;