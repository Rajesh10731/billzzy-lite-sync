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

        // 1. Basic Support Check
        const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
        if (!isSupported) {
            console.warn('Notifications not supported');
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
        if (status === 'authenticated') {
            // Pre-register Service Worker in background for faster enablement
            if ('serviceWorker' in navigator) {
                console.log("🛠️ Pre-registering Service Worker...");
                navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(err => {
                    console.warn("⚠️ Service Worker pre-registration failed:", err);
                });
            }

            const timer = setTimeout(() => {
                checkSubscription();
            }, 500); // 500ms initial delay instead of 2000ms
            return () => clearTimeout(timer);
        }
    }, [status, checkSubscription]);

    const dismissForADay = () => {
        const nextDay = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem('notification_prompt_dismissed_until', nextDay.toString());
    };

    const handleClose = () => {
        dismissForADay();
        setModalState(prev => ({ ...prev, isOpen: false }));
    };

    const handleSubscribe = async () => {
        setIsProcessing(true);
        try {
            if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
                throw new Error('Push configuration is missing (VAPID key).');
            }

            // Parallelize permission request with SW ready check (optimistic)
            const permissionPromise = Notification.requestPermission();

            // Trigger pre-registration again just in case (fast if already done)
            const subscribePromise = subscribeUserToPush();

            const permission = await permissionPromise;

            if (permission === 'granted') {
                await subscribePromise;
                setModalState({
                    isOpen: true,
                    title: 'Updates Active!',
                    message: 'You are now ready to receive real-time notifications.',
                    type: 'success'
                });
            } else {
                handleClose();
            }
        } catch (error: unknown) {
            console.error("❌ Subscription Error:", error);
            const isDelay = error instanceof Error && (error.message.includes('SYSTEM_DELAY') || error.message.toLowerCase().includes('timeout'));

            let errorMessage = "Setup failed. Please try again.";
            let title = 'System Delay';

            if (isDelay) {
                const ua = navigator.userAgent.toLowerCase();
                const isXiaomi = /xiaomi|redmi|miui/.test(ua);
                const isOppo = /oppo|realme/.test(ua);
                const isVivo = /vivo/.test(ua);
                const isSamsung = /samsung/.test(ua);

                if (isXiaomi || isOppo || isVivo) {
                    errorMessage = "Your device background system is restricted. Please enable 'Auto-start' or 'Background Activity' for this browser in your phone's Settings and try again.";
                } else if (isSamsung) {
                    errorMessage = "The app preparation is taking a moment. Please ensure 'Background Data' is enabled for this browser in Settings and try again.";
                } else {
                    errorMessage = "The system is taking longer than usual to wake up. This often happens on first launch. Please wait a second and try again.";
                }
            } else {
                errorMessage = error instanceof Error ? error.message : errorMessage;
                if (errorMessage.toLowerCase().includes('permission')) {
                    title = 'Permission Needed';
                    errorMessage = "Notifications are blocked. Please allow them in your browser settings to receive updates.";
                } else if (errorMessage.toLowerCase().includes('vapid')) {
                    title = 'Config Error';
                    errorMessage = "Push notification keys are missing. Please contact support.";
                } else if (errorMessage.toLowerCase().includes('server')) {
                    title = 'Connection Error';
                    errorMessage = "We couldn't sync your device with our server. Please check your internet and try again.";
                }
            }

            setModalState({
                isOpen: true,
                title: title,
                message: errorMessage,
                type: 'error',
                onAction: isDelay ? () => {
                    setModalState(prev => ({ ...prev, isOpen: false }));
                    handleSubscribe();
                } : undefined,
                actionLabel: isDelay ? "Try Again" : undefined
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal
            isOpen={modalState.isOpen}
            onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
            onAction={modalState.onAction}
            actionLabel={modalState.actionLabel}
            title={modalState.title}
            message={modalState.message}
            type={modalState.type}
        />
    );
}
