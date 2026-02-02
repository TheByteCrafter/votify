import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './Pages/LandingPage';
import Admin from './Pages/Admin';
import UserPortal from './Pages/UserPortal';
import RegisterVoter from './Pages/VoterSignUp';
import AspirantRegistration from './Pages/AspirantRegistration';
import LoginPage from './Pages/LoginPage';
import { supabase } from '../supabase';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={!session ? <LoginPage /> : <Admin />} />
        <Route path="/user" element={<UserPortal />} />
        <Route path="/voter" element={<RegisterVoter />} />
        <Route path="/aspirant-registration" element={<AspirantRegistration />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;