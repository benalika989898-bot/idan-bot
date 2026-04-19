import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AppSettings, getAppSettings } from '@/services/settings';
import { useQueryClient } from '@tanstack/react-query';

interface SettingsContextType {
  settings: AppSettings | null;
  isLoading: boolean;
  error: any;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  isLoading: true,
  error: null,
});

interface SettingsProviderProps {
  children: React.ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Initial load
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await getAppSettings();

        if (error) {
          setError(error);
        } else {
          setSettings(data);
        }
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();

    const channel = supabase
      .channel('settings-updates')
      .on('broadcast', { event: 'settings-changed' }, (payload) => {
        setSettings(payload.payload.updatedSettings);
        queryClient.invalidateQueries({ queryKey: ['appSettings'] });
        queryClient.setQueryData(['appSettings'], payload.payload.updatedSettings);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const value: SettingsContextType = {
    settings,
    isLoading,
    error,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
