import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import LoginPage from '../Pages/LoginPage';
import Admin from '../Pages/Admin';
import WaveLoader from '../Components/WaveLoader';

function RequireAdminLogin({ refreshSystemStatus }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  if (loading) return <WaveLoader />;

  if (!session) {
    return <LoginPage />;
  }

  return <Admin refreshSystemStatus={refreshSystemStatus} />;
};

export default RequireAdminLogin;