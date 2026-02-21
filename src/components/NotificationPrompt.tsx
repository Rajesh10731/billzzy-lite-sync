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
                console.log("💎 Notifications already granted. Checking subscription status...");

                // Use a timeout for SW readiness here as well
                const swTimeout = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("Service Worker registration timed out (5s)")), 5000);
                });

                const registration = await Promise.race([
                    navigator.serviceWorker.ready,
                    swTimeout
                ]) as ServiceWorkerRegistration;

                const subscription = await registration.pushManager.getSubscription();

                if (!subscription) {
                    console.log('🔄 Notifications allowed but no subscription found. Re-subscribing in background...');
                    await subscribeUserToPush();
                } else {
                    console.log('✅ User is already active and subscribed.');
                }
            } catch (error: unknown) {
                console.error('❌ Background subscription check failed:', error);
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
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '');
            const nav = navigator as unknown as { standalone?: boolean };
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && nav.standalone === true);

            setModalState({
                isOpen: true,
                title: 'Permissions Blocked',
                message: isIOS
                    ? (isStandalone
                        ? 'Notifications are blocked in your iOS settings. Please go to Settings > Notifications > Billzzy and set "Allow Notifications" to ON.'
                        : 'Notifications are blocked in Safari. You must click the "Share" icon, Add to Home Screen, and then allow notifications from the home screen app.')
                    : 'Your browser is blocking notifications. To fix this:\n1. Click the "Lock" icon in the address bar.\n2. Set "Notifications" to "Allow".\n3. Refresh this page.',
                type: 'error'
            });
            return;
        }

        // 3. New User / Permission Default: Request Permission
        if (Notification.permission === 'default') {
            try {
                console.log("🔍 Checking first-time notification readiness...");

                // Wait for the SW to be ready with a timeout to prevent hanging
                const swTimeout = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("Service Worker registration timed out (5s)")), 5000);
                });

                const registration = await Promise.race([
                    navigator.serviceWorker.ready,
                    swTimeout
                ]) as ServiceWorkerRegistration;

                if (!registration || !registration.pushManager) {
                    console.warn("⚠️ PushManager not found or SW not ready.");
                    return;
                }

                const userAgent = navigator.userAgent || '';
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
                const isIOS = /iPad|iPhone|iPod/.test(userAgent);
                const nav = navigator as unknown as { standalone?: boolean };
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && nav.standalone === true);

                console.log(`📱 Device info: isMobile: ${isMobile}, isIOS: ${isIOS}, isStandalone: ${isStandalone}`);

                // 🔴 ALL MOBILE DEVICES: Use custom prompt to capture user gesture
                // Browsers are increasingly restrictive, so we force-opt-in via gesture.
                if (isMobile) {
                    if (isIOS && !isStandalone) {
                        console.log("📱 iOS Safari: Showing installation guidance.");
                        setModalState({
                            isOpen: true,
                            type: 'info',
                            title: 'Mobile Alerts',
                            message: 'To receive alerts on iPhone, tap the "Share" icon below and select "Add to Home Screen". Then open the app from your home screen.'
                        });
                    } else {
                        console.log("📱 Mobile PWA/Browser: Showing custom prompt for gesture.");
                        setModalState({
                            isOpen: true,
                            type: 'ask',
                            title: 'Enable Alerts?',
                            message: 'Receive real-time updates about sales even when the app is closed. Tap Enable to allow.'
                        });
                    }
                    return;
                }

                // 🟢 DESKTOP: Try auto-request
                console.log("🔔 Desktop: Auto-requesting notification permission...");
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        console.log('✅ Desktop: Permission granted! Subscribing...');
                        await subscribeUserToPush();
                        setModalState({
                            isOpen: true,
                            title: 'Updates Active!',
                            message: 'You are now ready to receive real-time notifications.',
                            type: 'success'
                        });
                    } else {
                        console.log(`❌ Desktop: Permission ${permission}.`);
                    }
                } catch (permError) {
                    console.error("❌ Desktop: Auto-request failed:", permError);
                    setModalState({
                        isOpen: true,
                        type: 'ask',
                        title: 'Enable Alerts?',
                        message: 'Tap Enable to allow real-time notifications on this device.'
                    });
                }

            } catch (error) {
                console.error('❌ Error during notification readiness check:', error);
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
