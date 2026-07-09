import React, { useState, useEffect } from 'react';
import LoginPage from '../Pages/LoginPage';
import Admin from '../Pages/Admin';
import WaveLoader from '../Components/WaveLoader';


const API_URL = import.meta.env.REACT_APP_API_URL;

function RequireAdminLogin({ 
  refreshSystemStatus, 
  onRateLimitViolation, 
  incrementLoginAttempts,
  resetLoginAttempts 
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(null);

  useEffect(() => {
    if (resetLoginAttempts) {
      resetLoginAttempts();
    }
  }, []);

  const handleLogin = async (credentials) => {
    setLoading(true);
    setRateLimitError(null);
    
    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

     
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60;
        
 
        if (onRateLimitViolation) {
          onRateLimitViolation(retryAfter);
        }
        
        return { 
          success: false, 
          error: `Too many attempts. System locked for ${retryAfter} seconds.`,
          rateLimited: true 
        };
      }

      const data = await response.json();

      if (!response.ok) {
      
        if (incrementLoginAttempts) {
          incrementLoginAttempts();
        }
        
        throw new Error(data.error || 'Login failed');
      }

     
      if (resetLoginAttempts) {
        resetLoginAttempts();
      }
      
      setAdmin(data.admin);
      setIsAuthenticated(true);
      return { success: true };
      
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        rateLimited: false 
      };
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdmin(null);
  };

  if (loading) {
    return <WaveLoader />;
  }

  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLoginSuccess={(adminData) => {
          setAdmin(adminData);
          setIsAuthenticated(true);
        }}
        onLogin={handleLogin}
      />
    );
  }

  return <Admin refreshSystemStatus={refreshSystemStatus} admin={admin} onLogout={handleLogout} />;
}

export default RequireAdminLogin;