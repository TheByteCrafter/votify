import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './Pages/LandingPage';
import Admin from './Pages/Admin';
import UserPortal from './Pages/UserPortal';
import AspirantRegistration from './Pages/AspirantRegistration';
import LoginPage from './Pages/LoginPage';
import { supabase } from '../supabase';
import SystemLocked from './Pages/SytstemLocked';
import WaveLoader from './Components/WaveLoader';
import RequireAdminLogin from './States/authSession';

function App() {
  const [session, setSession] = useState(null);
  const [adminSession, setAdminSession] = useState(null);
  const [isSystemActive, setIsSystemActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAdminSession(null); //admin needs to login every time they access the admin page, so we don't persist their session in state. This is a security measure to ensure that admin access is always verified through login.
    });

    //once we have the admin session, we can set up the auth state change listener to update the admin session state accordingly
    supabase.auth.onAuthStateChange((_event, session) => {
      setAdminSession(session);
    });




    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Initial fetch
    fetchSystemStatus();

    // Start polling every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchSystemStatus();
    }, 5000); // 5 seconds

    return () => {
      subscription.unsubscribe();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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
          console.log(`System status changed from ${previousState} to ${data.ISSystemActive} at ${new Date().toLocaleTimeString()}`);
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


  const refreshSystemStatus = () => {
    fetchSystemStatus();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <WaveLoader />
        <p className="mt-4 text-gray-600">Loading system...</p>
      </div>
    );
  }

  return (
    <>

      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{error}</span>
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
            element={<RequireAdminLogin refreshSystemStatus={refreshSystemStatus} />}
          />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;