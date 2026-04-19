import { makeMutable, withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { create } from 'zustand';

// undefined = in-place (feed), 'overlay' = fullscreen via portal overlay in _layout
type Destination = undefined | 'overlay';

type Frame = { x: number; y: number; width: number; height: number };
type MeasureFn = () => Promise<Frame>;

interface ImageTransitionState {
  destination: Destination;
  id?: string;
  frame: Frame;
  /** UI-thread frame coordinates — used in worklets for stutter-free animations */
  frameX: SharedValue<number>;
  frameY: SharedValue<number>;
  images: string[];
  currentIndex: number;
  measureFns: Record<string, MeasureFn>;
  scrollToCard: ((index: number, animated?: boolean) => void) | null;
  progress: SharedValue<number>;
  registerMeasure: (id: string, fn: MeasureFn) => void;
  unregisterMeasure: (id: string) => void;
  registerScrollToCard: (fn: (index: number, animated?: boolean) => void) => void;
  unregisterScrollToCard: () => void;
  setFrame: (frame: Frame) => void;
  goToFullScreen: (frame: Frame) => void;
  goToFeed: (onFinish?: () => void) => void;
}

const SPRING_CONFIG = { mass: 2.8, damping: 450, stiffness: 1000 };
const DEFAULT_FRAME: Frame = { x: 0, y: 0, width: 0, height: 0 };

export const useImageTransitionStore = create<ImageTransitionState>((set, get) => ({
  destination: undefined,
  id: undefined,
  frame: DEFAULT_FRAME,
  frameX: makeMutable(0),
  frameY: makeMutable(0),
  images: [],
  currentIndex: 0,
  measureFns: {},
  scrollToCard: null,
  progress: makeMutable(0),
  registerMeasure: (id, fn) => {
    set((state) => ({ measureFns: { ...state.measureFns, [id]: fn } }));
  },
  unregisterMeasure: (id) => {
    set((state) => {
      const { [id]: _, ...rest } = state.measureFns;
      return { measureFns: rest };
    });
  },
  registerScrollToCard: (fn) => {
    set({ scrollToCard: fn });
  },
  unregisterScrollToCard: () => {
    set({ scrollToCard: null });
  },
  /** Update frame on both JS and UI threads simultaneously */
  setFrame: (frame: Frame) => {
    get().frameX.value = frame.x;
    get().frameY.value = frame.y;
    set({ frame });
  },
  goToFullScreen: (frame: Frame) => {
    get().frameX.value = frame.x;
    get().frameY.value = frame.y;
    set({ destination: 'overlay', frame });
    get().progress.set(withSpring(1, SPRING_CONFIG));
  },
  goToFeed: (onFinish) => {
    set({ destination: 'overlay' });
    const finish = () => {
      get().frameX.value = 0;
      get().frameY.value = 0;
      set({ destination: undefined, id: undefined, frame: DEFAULT_FRAME, images: [], currentIndex: 0 });
      onFinish?.();
    };
    get().progress.set(
      withSpring(0, SPRING_CONFIG, () => {
        scheduleOnRN(finish);
      })
    );
  },
}));
