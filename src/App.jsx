import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './Pages/LandingPage';
import UserPortal from './Pages/UserPortal';
import AspirantRegistration from './Pages/AspirantRegistration';
import LoginPage from './Pages/LoginPage';
import { supabase } from '../supabase';
import SystemLocked from './Pages/SytstemLocked';
import WaveLoader from './Components/WaveLoader';
import RequireAdminLogin from './States/authSession';
import TestBackend from './Pages/TestBanckend';
import { AlertTriangle, Shield, Lock, AlertCircle } from 'lucide-react';


function App() {
  const [session, setSession] = useState(null);
  const [adminSession, setAdminSession] = useState(null);
  const [isSystemActive, setIsSystemActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const pollIntervalRef = useRef(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitTimer, setRateLimitTimer] = useState(0);
  const rateLimitTimerRef = useRef(null);

  useEffect(() => {
    if (rateLimitTimerRef.current) {
      clearInterval(rateLimitTimerRef.current);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAdminSession(null);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setAdminSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

 
    fetchSystemStatus();

 
    pollIntervalRef.current = setInterval(() => {
      fetchSystemStatus();
    }, 5000);

    return () => {
      subscription.unsubscribe();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (rateLimitTimerRef.current) {
        clearInterval(rateLimitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Start rate limit timer if rate limited
    if (isRateLimited && rateLimitTimer > 0) {
      rateLimitTimerRef.current = setInterval(() => {
        setRateLimitTimer(prev => {
          if (prev <= 1) {
            clearInterval(rateLimitTimerRef.current);
            setIsRateLimited(false);
            setLoginAttempts(0);
            setRateLimitInfo(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (rateLimitTimerRef.current) {
        clearInterval(rateLimitTimerRef.current);
      }
    };
  }, [isRateLimited, rateLimitTimer]);

  const fetchSystemStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('System')
        .select('ISSystemActive, updated_at')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Error fetching system status:', error);
        setError('Failed to fetch system status');
        setIsSystemActive(false);
      } else if (data) {
        const previousState = isSystemActive;
        setIsSystemActive(data.ISSystemActive);
        setLastUpdated(new Date().toLocaleTimeString());

        if (previousState !== null && previousState !== data.ISSystemActive) {
          console.log(`System status changed from ${previousState} to ${data.ISSystemActive}`);
        }

        setError(null);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRateLimitViolation = (retryAfter = 60) => {
    setIsRateLimited(true);
    setRateLimitTimer(retryAfter);
    setRateLimitInfo({
      message: `Too many login attempts. System locked for ${retryAfter} seconds.`,
      retryAfter,
      timestamp: new Date().toISOString()
    });

    // Log the violation
    console.warn(`Rate limit violation detected. Locking system for ${retryAfter} seconds.`);
  };

  const resetRateLimit = () => {
    setIsRateLimited(false);
    setRateLimitTimer(0);
    setLoginAttempts(0);
    setRateLimitInfo(null);
    if (rateLimitTimerRef.current) {
      clearInterval(rateLimitTimerRef.current);
    }
  };

  const incrementLoginAttempts = () => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);

    // Trigger rate limiting after 5 failed attempts
    if (newAttempts >= 5) {
      handleRateLimitViolation(300); // 5 minutes lock
    } else if (newAttempts >= 3) {
      // Warning after 3 attempts
      setRateLimitInfo({
        message: `Warning: ${5 - newAttempts} more failed attempts will lock the system.`,
        warning: true
      });
    }

    return newAttempts;
  };

  const refreshSystemStatus = () => {
    fetchSystemStatus();
  };

  // Rate Limited Screen Component
  const RateLimitedScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-rose-900 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 border border-red-500/30 rounded-2xl mb-6">
            <Lock className="h-10 w-10 text-red-300" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">System Locked</h1>
          <p className="text-rose-200">Security protocol activated</p>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-red-300" />
              <h2 className="text-xl font-bold text-white">Rate Limit Exceeded</h2>
            </div>
            <p className="text-red-100 mb-4">
              Multiple failed login attempts detected. This is a security measure to prevent unauthorized access.
            </p>
            <div className="flex items-center justify-between bg-red-900/30 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-300" />
                <span className="text-red-200 font-medium">Time remaining:</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {Math.floor(rateLimitTimer / 60)}:{String(rateLimitTimer % 60).padStart(2, '0')}
              </div>
            </div>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-300 mt-0.5" />
              <div>
                <p className="text-amber-100 font-medium mb-1">Security Notice</p>
                <p className="text-amber-200/80 text-sm">
                  System will automatically unlock in {rateLimitTimer} seconds. 
                  This incident has been logged for security review.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={resetRateLimit}
            disabled={rateLimitTimer > 0}
            className={`w-full py-4 px-6 rounded-2xl font-bold transition-all ${
              rateLimitTimer > 0
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {rateLimitTimer > 0 ? 'System Locked' : 'Unlock System'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-center text-white/50 text-sm">
            Security Protocol • Incident #{Date.now().toString().slice(-6)}
          </p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <WaveLoader />
        <p className="mt-4 text-gray-400">Initializing secure system...</p>
      </div>
    );
  }

  // Show rate limited screen if rate limited
  if (isRateLimited) {
    return <RateLimitedScreen />;
  }

  return (
    <>
      {/* Rate Limit Warning Banner */}
      {rateLimitInfo?.warning && (
        <div className="fixed top-4 right-4 z-50 bg-amber-500/10 border border-amber-500/30 text-amber-200 px-6 py-4 rounded-2xl shadow-2xl max-w-sm animate-in slide-in-from-right">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0" />
            <div>
              <p className="font-bold text-sm mb-1">Security Warning</p>
              <p className="text-sm opacity-90">{rateLimitInfo.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="fixed top-4 left-4 z-50 bg-red-500/10 border border-red-500/30 text-red-200 px-6 py-4 rounded-2xl shadow-2xl max-w-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-300 shrink-0" />
            <div>
              <p className="font-bold text-sm mb-1">System Error</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        </div>
      )}

      <Router>
        <Routes>
          <Route path="/" element={isSystemActive ? <LandingPage /> : <SystemLocked />} />
          <Route path="/user" element={isSystemActive ? <UserPortal /> : <Navigate to="/" />} />
          <Route path="/aspirant" element={isSystemActive ? <AspirantRegistration /> : <Navigate to="/" />} />
          <Route
            path="/admin"
            element={
              <RequireAdminLogin 
                refreshSystemStatus={refreshSystemStatus}
                onRateLimitViolation={handleRateLimitViolation}
                incrementLoginAttempts={incrementLoginAttempts}
                resetLoginAttempts={resetRateLimit}
              />
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/test" element={<TestBackend />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;