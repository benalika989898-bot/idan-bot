import { makeMutable, withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { create } from 'zustand';

type Destination = 'overlay' | 'home-image-viewer';

type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

interface HomeImageTransitionState {
  destination?: Destination;
  id?: string;
  frame: Frame;
  progress: SharedValue<number>;
  setId: (id: string) => void;
  setDestination: (destination?: Destination) => void;
  openViewer: (frame: Frame) => void;
  closeViewer: (onFinish?: () => void) => void;
  reset: () => void;
}

const SPRING_CONFIG = { mass: 2.8, damping: 450, stiffness: 1000 };

const DEFAULT_FRAME: Frame = { x: 0, y: 0, width: 0, height: 0 };

export const useHomeImageTransition = create<HomeImageTransitionState>((set, get) => ({
  destination: undefined,
  id: undefined,
  frame: DEFAULT_FRAME,
  progress: makeMutable(0),
  setId: (id) => set({ id }),
  setDestination: (destination) => set({ destination }),
  openViewer: (frame) => {
    set({ destination: 'overlay', frame });
    get().progress.set(withSpring(1, SPRING_CONFIG));
  },
  closeViewer: (onFinish) => {
    set({ destination: 'overlay' });
    const moveToHome = () => {
      set({ destination: undefined, id: undefined, frame: DEFAULT_FRAME });
      onFinish?.();
    };
    get().progress.set(
      withSpring(0, SPRING_CONFIG, () => {
        scheduleOnRN(moveToHome);
      })
    );
  },
  reset: () => set({ destination: undefined, id: undefined, frame: DEFAULT_FRAME }),
}));
