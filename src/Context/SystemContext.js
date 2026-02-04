import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabase';
const SystemContext = createContext();

export const SystemProvider = ({ children }) => {
  const [isSystemActive, setIsSystemActive] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStatus();
    const subscription = supabase
      .channel('system-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'System',
          filter: 'id=eq.1',
        },
        (payload) => {
          if (payload.new && 'ISSystemActive' in payload.new) {
            setIsSystemActive(payload.new.ISSystemActive);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('System')
        .select('ISSystemActive')
        .eq('id', 1)
        .single();

      if (!error && data) {
        setIsSystemActive(data.ISSystemActive);
      } else {
        setIsSystemActive(false);
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
      setIsSystemActive(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SystemContext.Provider value={{ isSystemActive, setIsSystemActive, loading }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};