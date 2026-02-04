import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './Pages/LandingPage';
import Admin from './Pages/Admin';
import UserPortal from './Pages/UserPortal';
import RegisterVoter from './Pages/VoterSignUp';
import AspirantRegistration from './Pages/AspirantRegistration';
import LoginPage from './Pages/LoginPage';
import { supabase } from '../supabase';
import SystemLocked from './Pages/SytstemLocked';

function App() {
  const [session, setSession] = useState(null);
  const [isSystemActive, setIsSystemActive] = useState(null); 

  useEffect(() => {
   
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

 
    const checkSystemStatus = async () => {
      const { data, error } = await supabase
        .from('System')
        .select('ISSystemActive')
        .single();

      if (!error && data) {
        setIsSystemActive(data.ISSystemActive);
      } else {
        setIsSystemActive(false); 
      }
    };

    checkSystemStatus();
    return () => subscription.unsubscribe();
  }, []);

  if (isSystemActive === null) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
       
        <Route path="/" element={isSystemActive ? <LandingPage /> : <SystemLocked />} />
        
     
        <Route path="/voter" element={isSystemActive ? <RegisterVoter /> : <Navigate to="/" />} />
        <Route path="/user" element={isSystemActive ? <UserPortal /> : <Navigate to="/" />} />
        <Route path="/admin" element={!session ? <LoginPage /> : <Admin />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;