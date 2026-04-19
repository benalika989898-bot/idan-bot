import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

interface FabContextType {
  rotation: any;
  setIsPlus: (isPlus: boolean) => void;
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
}

const FabContext = createContext<FabContextType | undefined>(undefined);

export const FabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const rotation = useSharedValue(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const setIsPlus = useCallback((isPlus: boolean) => {
    rotation.value = withTiming(isPlus ? 0 : 45, { duration: 200 });
  }, [rotation]);

  const value = useMemo(
    () => ({ rotation, setIsPlus, isModalOpen, setIsModalOpen }),
    [isModalOpen, rotation, setIsPlus]
  );

  return (
    <FabContext.Provider value={value}>{children}</FabContext.Provider>
  );
};

export const useFab = () => {
  const context = useContext(FabContext);
  if (!context) {
    throw new Error('useFab must be used within a FabProvider');
  }
  return context;
};
