import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

type StartupSplashContextValue = {
  dashboardReady: boolean;
  setDashboardReady: (ready: boolean) => void;
  startupCompleted: boolean;
  setStartupCompleted: (completed: boolean) => void;
};

const StartupSplashContext = createContext<StartupSplashContextValue | undefined>(undefined);

type StartupSplashProviderProps = {
  children: ReactNode;
};

export function StartupSplashProvider({ children }: StartupSplashProviderProps) {
  const [dashboardReady, setDashboardReady] = useState(false);
  const [startupCompleted, setStartupCompleted] = useState(false);
  const value = useMemo(
    () => ({
      dashboardReady,
      setDashboardReady,
      startupCompleted,
      setStartupCompleted,
    }),
    [dashboardReady, startupCompleted]
  );

  return <StartupSplashContext.Provider value={value}>{children}</StartupSplashContext.Provider>;
}

export const useStartupSplash = () => {
  const context = useContext(StartupSplashContext);

  if (!context) {
    throw new Error('useStartupSplash must be used within a StartupSplashProvider');
  }

  return context;
};

export { StartupSplashContext };
