import { useCallback, useRef } from 'react';
import { Platform, StatusBar } from 'react-native';
import type { View } from 'react-native';

// On Android with edge-to-edge, measureInWindow returns Y relative to the
// content area (below the status bar), but PortalHost starts at the true
// window top (behind the status bar). Compensate by adding the status bar height.
const statusBarOffset =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

export function useMeasure() {
  const ref = useRef<View>(null);

  const measure = useCallback(
    () =>
      new Promise<{ x: number; y: number; width: number; height: number }>((resolve, reject) => {
        if (!ref.current) {
          reject(new Error('ref not attached'));
          return;
        }
        ref.current.measureInWindow((x, y, width, height) => {
          resolve({ x, y: y + statusBarOffset, width, height });
        });
      }),
    []
  );

  return { ref, measure };
}
