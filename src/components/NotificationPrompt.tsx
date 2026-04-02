'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { subscribeUserToPush } from '@/lib/push-notifications';
import Modal, { ModalType } from '@/components/ui/Modal';

export default function NotificationPrompt() {
    const { status } = useSession();
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: ModalType;
        onAction?: () => void;
        actionLabel?: string;
    }>({
        isOpen: false, title: '', message: '', type: 'info'
    });
    const [isProcessing, setIsProcessing] = useState(false);

    const getDeviceInfo = useCallback(() => {
        const nav = navigator as unknown as { standalone?: boolean };
        const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || 
                          ('standalone' in navigator && nav.standalone === true);
        const userAgent = navigator.userAgent || '';
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        return { isStandalone, isMobile, isIOS };
    }, []);

    const handleGrantedSync = useCallback(async () => {
        try {
            console.log("💎 Notifications already granted. Checking subscription status...");
            const registrations = await navigator.serviceWorker.getRegistrations();
            const registration = registrations.find(r => r.active || r.waiting || r.installing);

            if (registration?.active) {
                const subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    await subscribeUserToPush().catch(e => console.warn("⚠️ Background re-subscribe failed:", e));
                }
            }
        } catch (error) {
            console.warn('⚠️ Background subscription check skipped:', error);
        }
    }, []);

    const handleDefaultAsk = useCallback(async (device: { isMobile: boolean, isIOS: boolean, isStandalone: boolean }) => {
        if (device.isMobile) {
            if (device.isIOS && !device.isStandalone) {
                setModalState({
                    isOpen: true, type: 'info', title: 'Mobile Alerts',
                    message: 'To receive alerts on iPhone, tap the "Share" icon below and select "Add to Home Screen".'
                });
            } else {
                setModalState({
                    isOpen: true, type: 'ask', title: 'Enable Alerts?',
                    message: 'Receive real-time updates about sales even when the app is closed.'
                });
            }
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await subscribeUserToPush();
                setModalState({
                    isOpen: true, type: 'success', title: 'Updates Active!',
                    message: 'You are now ready to receive real-time notifications.'
                });
            }
        } catch {
            setModalState({
                isOpen: true, type: 'ask', title: 'Enable Alerts?',
                message: 'Tap Enable to allow real-time notifications on this device.'
            });
        }
    }, []);

    const checkSubscription = useCallback(async () => {
        if (typeof window === 'undefined') return;

        const device = getDeviceInfo();
        const dismissedUntil = localStorage.getItem('notification_prompt_dismissed_until');

        if (!device.isStandalone && dismissedUntil && Date.now() < Number.parseInt(dismissedUntil, 10)) return;

        const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
        if (!isSupported) return;

        if (Notification.permission === 'granted') {
            await handleGrantedSync();
        } else if (Notification.permission === 'denied' && device.isStandalone) {
            setModalState({
                isOpen: true, type: 'info', title: 'Notifications Blocked',
                message: 'Alerts are disabled. Please enable notifications in your device settings.'
            });
        } else if (Notification.permission === 'default') {
            await handleDefaultAsk(device);
        }
    }, [getDeviceInfo, handleGrantedSync, handleDefaultAsk]);

    useEffect(() => {
        // PRE-REGISTER Service Worker early for speed on older devices!
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(e => console.warn('Early SW registration failed', e));
        }

        if (status === 'authenticated' && typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                console.log("💎 Permission granted. Syncing subscription in background...");
                // Silent sync after a short delay to ensure SW is ready
                const timer = setTimeout(() => {
                    subscribeUserToPush().catch(err => {
                        console.warn("⚠️ Silent auto-sync failed:", err);
                    });
                }, 3000);
                return () => clearTimeout(timer);
            }

            // For not-yet-granted, show prompt after delay
            const timer = setTimeout(() => {
                checkSubscription();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [status, checkSubscription]);

    const handleClose = useCallback(() => {
        const nextDay = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem('notification_prompt_dismissed_until', nextDay.toString());
        setModalState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const getSubscriptionError = useCallback((error: unknown) => {
        const errorMessage = "Setup failed. Please try again.";
        const title = 'Setup Error';

        if (!(error instanceof Error)) return { title, message: errorMessage };

        const msg = error.message.toLowerCase();
        if (msg.includes('permission') || msg.includes('denied')) {
            return {
                title: 'Action Required',
                message: "Your browser blocked the request. You must go to your browser settings to manually Allow notifications for this site."
            };
        }

        if (msg.includes('not supported') || msg.includes('pushmanager')) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            return {
                title: 'Not Supported Here',
                message: isIOS
                    ? "Your current browser setup doesn't support background alerts yet. On iPhone/iPad, you MUST open Safari and tap 'Share' then 'Add to Home Screen' first."
                    : "Your current browser (or in-app browser) lacks push support. Please open this app in Chrome."
            };
        }

        if (msg.includes('vapid')) {
            return { title: 'Config Error', message: "Push notification keys are missing. Please contact support." };
        }

        if (msg.includes('server')) {
            return { title: 'Connection Error', message: "We couldn't sync your device with our server. Please check your internet and try again." };
        }

        return { title, message: `We couldn't set up notifications right now (${error.message}). Please check your connection and try again.` };
    }, []);

    const handleSubscribe = async () => {
        setIsProcessing(true);

        if ('Notification' in window && Notification.permission === 'denied') {
            setModalState({
                isOpen: true, type: 'error', title: 'Permission Blocked',
                message: "Notifications are BLOCKED. You must tap the lock icon 🔒 in your browser address bar and change Notifications to 'Allow'."
            });
            setIsProcessing(false);
            return;
        }

        try {
            if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) throw new Error('Push configuration is missing (VAPID key).');

            let granted = Notification.permission === 'granted';
            if (!granted && 'Notification' in window && Notification.permission !== 'denied') {
                granted = (await Notification.requestPermission()) === 'granted';
            }

            if (!granted) throw new Error("Notification permission was not granted.");

            setModalState({
                isOpen: true, type: 'success', title: 'Updates Active!',
                message: 'You are now ready to receive real-time notifications.'
            });

            subscribeUserToPush().catch(bgError => console.error("❌ Background Subscription Error:", bgError));
        } catch (error) {
            const { title, message } = getSubscriptionError(error);
            setModalState({ isOpen: true, title, message, type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal
            isOpen={modalState.isOpen}
            onClose={handleClose}
            onAction={modalState.type === 'ask' ? handleSubscribe : modalState.onAction}
            actionLabel={modalState.type === 'ask' ? 'Enable' : modalState.actionLabel}
            title={modalState.title}
            message={modalState.message}
            type={modalState.type}
            isLoading={isProcessing}
        />
    );
}
