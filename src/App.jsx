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
import BanScreen from './Components/isBanned';
import { AlertTriangle, Shield, Lock, AlertCircle, Fingerprint } from 'lucide-react';
import emailjs from '@emailjs/browser';

const API_URL = import.meta.env.REACT_APP_API_URL || 'https://votifybackend-h0yt.onrender.com/api';

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
  const [isBanned, setIsBanned] = useState(false);

  const [banInfo, setBanInfo] = useState({
    ipViolations: 0,
    emailViolations: 0,
    deviceViolations: 0,
    retryAfter: 86400,
    email: null,
    ipAddress: null,
    deviceId: null,
    userAgent: null,
    timestamp: null,
    banType: 'email'
  });
  const [banCheckComplete, setBanCheckComplete] = useState(false);


  useEffect(() => {
    // Initialize EmailJS once when the app loads
    emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
    console.log(' EmailJS initialized');
  }, []);

  const generateDeviceFingerprint = () => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');

      const components = [
        navigator.userAgent,
        navigator.language,
        navigator.platform,
        screen.colorDepth,
        screen.width + 'x' + screen.height + 'x' + screen.pixelDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency,
        navigator.deviceMemory || 'unknown',
        debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
        Intl.DateTimeFormat().resolvedOptions().timeZone
      ];

      // Create a hash
      const fingerprint = btoa(components.join('|')).replace(/=/g, '');

      // Store in localStorage as backup but server is primary
      localStorage.setItem('device_fingerprint', fingerprint);

      return fingerprint;
    } catch (e) {
      // Fallback fingerprint
      const fallback = btoa(navigator.userAgent + screen.width + screen.height).replace(/=/g, '');
      localStorage.setItem('device_fingerprint', fallback);
      return fallback;
    }
  };


  const getClientIP = async () => {

    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://api.my-ip.io/ip.json',
      'https://ipapi.co/json/'
    ];

    for (const service of ipServices) {
      try {
        const response = await fetch(service);
        const data = await response.json();
        const ip = data.ip || data.address || data;
        if (ip) {
          localStorage.setItem('client_ip', ip);
          return ip;
        }
      } catch (e) {
        console.warn(`IP service failed: ${service}`);
      }
    }
    return localStorage.getItem('client_ip') || '0.0.0.0';
  };

  const checkBanStatus = async (email = null, ip = null, deviceId = null) => {
    try {
      const deviceFingerprint = deviceId || localStorage.getItem('device_fingerprint') || generateDeviceFingerprint();
      const clientIP = ip || localStorage.getItem('client_ip') || await getClientIP();
      const userAgent = navigator.userAgent;

      // Get all potential identifiers
      const bannedEmail = email || localStorage.getItem('banned_email');
      const bannedIP = localStorage.getItem('banned_ip');
      const bannedDevice = localStorage.getItem('banned_device');

      const response = await fetch(`${API_URL}/voter/check-ban-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: bannedEmail,
          ip: clientIP
        }),
      });

      const data = await response.json();
      if (data.isBanned) {
        setIsBanned(true);
        setBanInfo({
          ipViolations: data.violations?.ipViolations || 0,
          emailViolations: data.violations?.emailViolations || 0,
          deviceViolations: data.violations?.deviceViolations || 0,
          retryAfter: data.retryAfter || 86400,
          email: data.bannedEmail || bannedEmail,
          ipAddress: data.bannedIP || clientIP,
          deviceId: data.bannedDevice || deviceFingerprint,
          userAgent: userAgent,
          timestamp: new Date().toISOString(),
          banType: data.banType || 'hybrid',
          banReason: data.banReason || 'Multiple security violations detected'
        });

        // Persist ALL ban identifiers
        if (data.bannedEmail) localStorage.setItem('banned_email', data.bannedEmail);
        if (data.bannedIP) localStorage.setItem('banned_ip', data.bannedIP);
        if (data.bannedDevice) localStorage.setItem('banned_device', data.bannedDevice);
        localStorage.setItem('ban_active', 'true');
        localStorage.setItem('ban_timestamp', new Date().toISOString());

        // Clear any existing session
        await supabase.auth.signOut();
        setSession(null);
      } else {
        // No active ban
        setIsBanned(false);
        ['ban_active', 'banned_email', 'banned_ip', 'banned_device', 'ban_timestamp'].forEach(
          key => localStorage.removeItem(key)
        );
      }
    } catch (error) {
      console.error('Ban check failed:', error);
      // Conservative approach - if we can't check, assume not banned
      setIsBanned(false);
    } finally {
      setBanCheckComplete(true);
    }
  };

  // 🔴 Initialize security on app load
  useEffect(() => {
    const initializeSecurity = async () => {
      setLoading(true);

      // Generate device fingerprint
      generateDeviceFingerprint();

      // Get client IP
      await getClientIP();

      // Check ban status with all identifiers
      await checkBanStatus();

      setLoading(false);
    };

    initializeSecurity();
  }, []);

  // 🔴 Clear ban state on successful login
  const clearBanState = () => {
    setIsBanned(false);
    setBanInfo({
      ipViolations: 0,
      emailViolations: 0,
      deviceViolations: 0,
      retryAfter: 86400,
      email: null,
      ipAddress: null,
      deviceId: null,
      userAgent: null,
      timestamp: null,
      banType: 'email',
      banReason: ''
    });

    ['ban_active', 'banned_email', 'banned_ip', 'banned_device', 'ban_timestamp'].forEach(
      key => localStorage.removeItem(key)
    );
  };

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

    if (newAttempts >= 5) {
      handleRateLimitViolation(300);
    } else if (newAttempts >= 3) {
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

  // 🚨 ENHANCED BAN TRIGGER - Multi-factor ban
  const handleBanTrigger = async (email, violations, ipAddress = null, deviceId = null) => {
    const deviceFingerprint = deviceId || localStorage.getItem('device_fingerprint') || generateDeviceFingerprint();
    const clientIP = ipAddress || localStorage.getItem('client_ip') || await getClientIP();
    const userAgent = navigator.userAgent;

    setIsBanned(true);
    setBanInfo({
      ipViolations: violations.ipViolations || 0,
      emailViolations: violations.emailViolations || 0,
      deviceViolations: violations.deviceViolations || 0,
      retryAfter: 86400,
      email: email,
      ipAddress: clientIP,
      deviceId: deviceFingerprint,
      userAgent: userAgent,
      timestamp: new Date().toISOString(),
      banType: 'hybrid',
      banReason: 'Excessive failed login attempts across multiple identifiers'
    });

    // Persist ALL ban identifiers
    localStorage.setItem('ban_active', 'true');
    localStorage.setItem('banned_email', email);
    localStorage.setItem('banned_ip', clientIP);
    localStorage.setItem('banned_device', deviceFingerprint);
    localStorage.setItem('ban_timestamp', new Date().toISOString());

    // Sign out any existing session
    await supabase.auth.signOut();
    setSession(null);
  };

  const RateLimitedScreen = () => (
    <div className="min-h-screen bg-linear-to-br from-red-900 to-rose-900 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 border border-red-500/30 rounded-2xl mb-6">
            <Lock className="h-10 w-10 text-red-300" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">System Locked</h1>
          <p className="text-rose-200">Temporary security measure</p>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-red-300" />
              <h2 className="text-xl font-bold text-white">Rate Limit Exceeded</h2>
            </div>
            <p className="text-red-100 mb-4">
              Multiple failed attempts detected. This is a temporary security measure.
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
              <Fingerprint className="h-5 w-5 text-amber-300 mt-0.5" />
              <div>
                <p className="text-amber-100 font-medium mb-1">Security Protocol</p>
                <p className="text-amber-200/80 text-sm">
                  Your IP address and device signature have been temporarily restricted.
                  System will unlock automatically.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={resetRateLimit}
            disabled={rateLimitTimer > 0}
            className={`w-full py-4 px-6 rounded-2xl font-bold transition-all ${rateLimitTimer > 0
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
          >
            {rateLimitTimer > 0 ? 'System Locked' : 'Unlock System'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-center text-white/50 text-sm">
            Security Incident • ID: {Date.now().toString().slice(-8)}
          </p>
        </div>
      </div>
    </div>
  );

  if (loading || !banCheckComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <WaveLoader />
        <div className="mt-6 flex items-center gap-2 text-gray-400">
          <Shield className="h-4 w-4" />
          <p>Verifying security status...</p>
        </div>
      </div>
    );
  }


  if (isBanned) {
    return (
      <BanScreen
        failedAttempts={banInfo.emailViolations || 15}
        banTimeRemaining={banInfo.retryAfter || 86400}
        email={banInfo.email}
        ipAddress={banInfo.ipAddress}
        deviceId={banInfo.deviceId}
        banType={banInfo.banType}
        banReason={banInfo.banReason}
        timestamp={banInfo.timestamp}
      />
    );
  }

  if (isRateLimited) {
    return <RateLimitedScreen />;
  }

  return (
    <>
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
          <Route
            path="/"
            element={
              isSystemActive ?
                <LandingPage
                  onBanTrigger={handleBanTrigger}
                  checkBanStatus={checkBanStatus}
                  deviceFingerprint={localStorage.getItem('device_fingerprint')}
                  clientIP={localStorage.getItem('client_ip')}
                /> :
                <SystemLocked />
            }
          />
          <Route
            path="/user"
            element={
              isSystemActive && !isBanned ?
                <UserPortal /> :
                <Navigate to="/" />
            }
          />
          <Route
            path="/aspirant"
            element={
              isSystemActive && !isBanned ?
                <AspirantRegistration /> :
                <Navigate to="/" />
            }
          />
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