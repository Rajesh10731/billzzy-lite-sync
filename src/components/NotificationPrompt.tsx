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

    const checkSubscription = useCallback(async () => {
        if (typeof window === 'undefined') return;

        // 0. CHECK DISMISSAL - Don't show if dismissed within the last 7 days
        const nav = navigator as unknown as { standalone?: boolean };
        const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || ('standalone' in navigator && nav.standalone === true);
        const dismissedUntil = localStorage.getItem('notification_prompt_dismissed_until');

        // PWA Users: Bypass dismissal logic so the button is always available in the UI if not enabled
        if (!isStandalone && dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
            console.log("🤫 Notification prompt is currently silenced (Non-PWA).");
            return;
        }

        // 1. Strict Support Check
        // Must support Notifications, Service Workers, AND the Push API.
        // If PushManager is missing (e.g., iOS standalone missing, or Android in-app browsers like FB/IG), 
        // we silently hide the prompt entirely to prevent confusing setup errors.
        const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
        if (!isSupported) {
            console.log('🔇 Notifications/Push not supported in this specific browser environment. Hiding prompt.');
            return;
        }

        // 2. Permission Check: Already Granted
        if (Notification.permission === 'granted') {
            try {
                console.log("💎 Notifications already granted. Checking subscription status in background...");
                const registrations = await navigator.serviceWorker.getRegistrations();
                const registration = registrations.find(r => r.active || r.waiting || r.installing);

                if (!registration?.active) {
                    console.log("⏳ Worker not active yet. Skipping background sync.");
                    return;
                }

                const subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    console.log('🔄 No subscription found. Attempting silent re-subscribe...');
                    // SILENT re-subscribe in background
                    await subscribeUserToPush().catch(e => console.warn("⚠️ Background re-subscribe failed:", e));
                }
            } catch (error: unknown) {
                console.warn('⚠️ Background subscription check skipped:', error);
            }
            return;
        }

        // 2b. Permission Check: Blocked - Show instructions for PWA users
        if (Notification.permission === 'denied') {
            console.log("🚫 Notifications are blocked.");
            if (isStandalone) {
                setModalState({
                    isOpen: true,
                    type: 'info',
                    title: 'Notifications Blocked',
                    message: 'Alerts are disabled in your device settings. Please go to your browser/app settings and allow notifications for this app to receive updates.'
                });
            }
            return;
        }

        // 3. Permission Check: Permission Default (Ask)
        if (Notification.permission === 'default') {
            const userAgent = navigator.userAgent || '';
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            const isIOS = /iPad|iPhone|iPod/.test(userAgent);
            const nav = navigator as unknown as { standalone?: boolean };
            const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || ('standalone' in navigator && nav.standalone === true);

            console.log(`📱 Device info: isMobile: ${isMobile}, isIOS: ${isIOS}, isStandalone: ${isStandalone}`);

            // 🔴 MOBILE: Show custom modal to capture user gesture
            if (isMobile) {
                if (isIOS && !isStandalone) {
                    console.log("📱 iOS Safari: Guidance.");
                    setModalState({
                        isOpen: true,
                        type: 'info',
                        title: 'Mobile Alerts',
                        message: 'To receive alerts on iPhone, tap the "Share" icon below and select "Add to Home Screen". Then open the app from your home screen.'
                    });
                } else {
                    console.log("📱 Mobile: Custom Modal.");
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
            console.log("🔔 Desktop: Auto-requesting...");
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    await subscribeUserToPush();
                    setModalState({
                        isOpen: true,
                        title: 'Updates Active!',
                        message: 'You are now ready to receive real-time notifications.',
                        type: 'success'
                    });
                }
            } catch (permError) {
                console.error("❌ Desktop auto-request failed:", permError);
                setModalState({
                    isOpen: true,
                    type: 'ask',
                    title: 'Enable Alerts?',
                    message: 'Tap Enable to allow real-time notifications on this device.'
                });
            }
        }
    }, []);

    useEffect(() => {
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

    const handleSubscribe = async () => {
        setIsProcessing(true);

        // Immediate check for explicitly blocked permissions
        if ('Notification' in window && Notification.permission === 'denied') {
            setModalState({
                isOpen: true,
                title: 'Permission Blocked',
                message: "Notifications are BLOCKED. You must tap the lock icon 🔒 in your browser address bar, go to Site Settings, and change Notifications to 'Allow'.",
                type: 'error'
            });
            setIsProcessing(false);
            return;
        }

        try {
            if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
                throw new Error('Push configuration is missing (VAPID key).');
            }

            // Delegate everything to subscribeUserToPush
            await subscribeUserToPush();

            setModalState({
                isOpen: true,
                title: 'Updates Active!',
                message: 'You are now ready to receive real-time notifications.',
                type: 'success'
            });
        } catch (error: unknown) {
            console.error("❌ Subscription Error:", error);

            let errorMessage = "Setup failed. Please try again.";
            let title = 'Setup Error';

            if (error instanceof Error) {
                errorMessage = error.message;
                if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('denied')) {
                    title = 'Action Required';
                    errorMessage = "Your browser blocked the request. You must go to your browser settings to manually Allow notifications for this site.";
                } else if (errorMessage.toLowerCase().includes('not supported') || errorMessage.toLowerCase().includes('pushmanager')) {
                    title = 'Not Supported Here';
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    if (isIOS) {
                        errorMessage = `Your current browser setup doesn't support background alerts yet. On iPhone/iPad, you MUST open Safari and tap 'Share' then 'Add to Home Screen' first. (Error: ${errorMessage})`;
                    } else {
                        errorMessage = `Your current browser (or in-app browser) lacks push support. Please open this app in Chrome. (Error: ${errorMessage})`;
                    }
                } else if (errorMessage.toLowerCase().includes('vapid')) {
                    title = 'Config Error';
                    errorMessage = "Push notification keys are missing. Please contact support.";
                } else if (errorMessage.toLowerCase().includes('server')) {
                    title = 'Connection Error';
                    errorMessage = "We couldn't sync your device with our server. Please check your internet and try again.";
                } else {
                    errorMessage = `We couldn't set up notifications right now (${errorMessage}). Please check your connection and try again.`;
                }
            }

            setModalState({
                isOpen: true,
                title: title,
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
