'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { subscribeUserToPush } from '@/lib/push-notifications';
import Modal, { ModalType } from '@/components/ui/Modal';

export default function NotificationPrompt() {
    const { status } = useSession();
    const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string; type: ModalType }>({
        isOpen: false, title: '', message: '', type: 'info'
    });
    const [isProcessing, setIsProcessing] = useState(false);

    const checkSubscription = useCallback(async () => {
        if (typeof window === 'undefined') return;

        // 1. Basic Support Check
        const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
        if (!isSupported) {
            console.warn('Notifications not supported');
            return;
        }

        // 2. Permission Check: Silent Auto-Subscription or Denied Guidance
        if (Notification.permission === 'granted') {
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();

                if (!subscription) {
                    console.log('🔄 Notifications allowed but not active. Auto-subscribing in background...');
                    await subscribeUserToPush();
                }
            } catch (error: unknown) {
                console.error('Silent subscription failed:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                if (errorMessage.includes('VAPID') || errorMessage.includes('Configuration')) {
                    setModalState({
                        isOpen: true,
                        title: 'Auto-Setup Issue',
                        message: `Notifications are allowed, but background setup failed: ${errorMessage}`,
                        type: 'error'
                    });
                }
            }
            return;
        }

        if (Notification.permission === 'denied') {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            setModalState({
                isOpen: true,
                title: 'Alerts Blocked',
                message: isIOS
                    ? 'Notifications are blocked in your iOS settings. Go to Settings > Notifications > Billzzy to allow them.'
                    : 'Notifications are blocked by your browser. Tap the "Lock" or "Info" icon in the address bar and select "Allow" or "Reset Permission".',
                type: 'error'
            });
            return;
        }

        // 3. New User / Permission Default: Request Permission
        if (Notification.permission === 'default') {
            try {
                // Wait for the SW to be ready, but without blocking the UI thread forever if it fails
                const registration = await navigator.serviceWorker.ready;

                if (!registration || !registration.pushManager) {
                    console.warn("PushManager not found or SW not ready.");
                    return;
                }

                // Check for iOS (iPhone/iPad/iPod)
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '');
                // Check if it's running as a PWA (Standalone mode)
                const nav = navigator as unknown as { standalone?: boolean };
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && nav.standalone === true);

                if (isIOS) {
                    if (!isStandalone) {
                        // iOS Browser (Safari/Chrome) - Apple NEVER allows push here. Must install PWA.
                        console.log("📱 iOS Browser detected. Must install PWA for push.");
                        setModalState({
                            isOpen: true,
                            type: 'info',
                            title: 'Mobile Alerts',
                            message: 'To receive alerts on iPhone, tap the "Share" icon below and select "Add to Home Screen". Then open the app from your home screen.'
                        });
                        return;
                    } else {
                        // iOS PWA - Apple REQUIRES a user gesture (button click) to show the native prompt.
                        console.log("📱 iOS PWA detected. Showing custom prompt to capture user gesture.");
                        setModalState({
                            isOpen: true,
                            type: 'ask',
                            title: 'Enable Alerts?',
                            message: 'Receive real-time updates about sales even when the app is closed. Tap Enable to allow.'
                        });
                        return;
                    }
                }

                // For Android and Desktop: Auto-request usually works fine without a user gesture.
                console.log("🔔 Auto-requesting notification permission (Android/Desktop)...");
                // We wrap this in a try/catch because some older Android WebViews might throw if no user gesture
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        console.log('✅ Permission granted! Subscribing...');
                        await subscribeUserToPush();
                        setModalState({
                            isOpen: true,
                            title: 'Updates Active!',
                            message: 'You are now ready to receive real-time notifications.',
                            type: 'success'
                        });
                    } else {
                        console.log('❌ Permission denied or dismissed.');
                    }
                } catch (permError) {
                    console.error("Auto-request failed (likely needs user gesture on this specific Android browser):", permError);
                    // Fallback for Android browsers that suddenly decide they need a user gesture
                    setModalState({
                        isOpen: true,
                        type: 'ask',
                        title: 'Enable Alerts?',
                        message: 'Tap Enable to allow real-time notifications on this device.'
                    });
                }

            } catch (error) {
                console.error('Error during default permission check:', error);
            }
        }
    }, [status]);

    useEffect(() => {
        if (status === 'authenticated') {
            // Small Delay to let the app load smoothly
            const timer = setTimeout(() => {
                checkSubscription();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [status, checkSubscription]);

    const handleSubscribe = async () => {
        setIsProcessing(true);
        try {
            const registration = await navigator.serviceWorker.ready;

            if (!registration.pushManager) {
                throw new Error('Push messaging is not supported in this browser environment.');
            }

            if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
                throw new Error('Configuration error: VAPID Key is missing. Please check build environment.');
            }

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await subscribeUserToPush();
                setModalState({
                    isOpen: true,
                    title: 'Updates Active!',
                    message: 'You are now ready to receive real-time notifications.',
                    type: 'success'
                });
            } else {
                setModalState({ isOpen: false, title: '', message: '', type: 'info' });
            }
        } catch (error: unknown) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to enable notifications. Please try again.';
            setModalState({
                isOpen: true,
                title: 'Setup Error',
                message: errorMessage,
                type: 'error'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal
            isOpen={modalState.isOpen}
            onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
            onAction={modalState.type === 'ask' ? handleSubscribe : undefined}
            actionLabel={modalState.type === 'ask' ? (isProcessing ? 'Enabling...' : 'Enable now') : undefined}
            title={modalState.title}
            message={modalState.message}
            type={modalState.type}
        />
    );
}
