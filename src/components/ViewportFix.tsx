'use client';

import { useEffect } from 'react';


export default function ViewportFix() {
    useEffect(() => {
        // 1. Prevent Pinch Zoom (iOS Safari 10+)
        const handleGestureStart = (e: Event) => {
            e.preventDefault();
        };

        // 2. Prevent double-tap to zoom (Handled by touch-action: manipulation in CSS, but extra safety here)
        // document.addEventListener('gesturestart', handleGestureStart);

        // 3. More aggressive pinch-zoom prevention if needed
        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        };

        // Note: gesturestart is cleaner for iOS
        document.addEventListener('gesturestart', handleGestureStart);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            document.removeEventListener('gesturestart', handleGestureStart);
            document.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    return null;
}
