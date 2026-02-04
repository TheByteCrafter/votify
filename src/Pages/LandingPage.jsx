import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '../../supabase';

export default function LandingPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        const { data, error } = supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            alert(error.message);
        } else {
            navigate('/user');
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
                    <h2 className="text-2xl font-black text-slate-800 mb-6">Voter Login</h2>

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
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-200"
                        >
                            SIGN IN TO PORTAL <ArrowRight size={18} />
                        </button>
                    </form>
                    <div className="mt-8 pt-6 border-t border-slate-100 space-y-4 text-center">
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