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

        // 2. Permission Check: Already Granted
        if (Notification.permission === 'granted') {
            try {
                console.log("💎 Notifications already granted. Checking subscription status in background...");
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();

                if (!subscription) {
                    console.log('🔄 No subscription found. Re-subscribing...');
                    await subscribeUserToPush();
                }
            } catch (error: unknown) {
                console.error('❌ Background subscription check failed:', error);
            }
            return;
        }

        // 2b. Permission Check: Blocked - DO NOT show automatically anymore
        if (Notification.permission === 'denied') {
            console.log("🚫 Notifications are blocked. Waiting for manual trigger.");
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
    }, [status]);

    useEffect(() => {
        if (status === 'authenticated') {
            const timer = setTimeout(() => {
                checkSubscription();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [status, checkSubscription]);

    const handleSubscribe = async () => {
        setIsProcessing(true);
        try {
            // Check for VAPID key first
            if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
                throw new Error('Push configuration is missing (VAPID key).');
            }

            // Handle Blocked State Manually - REMOVED RESTRICTIVE ALERT
            // We just let the system prompt attempt to trigger if possible, or fail gracefully.

            // Trigger system prompt
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                // Now wait for SW and subscribe
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
            let errorMessage = error instanceof Error ? error.message : 'Setup failed. Please try again.';

            // Add custom guidance for common mobile issues
            if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('activate')) {
                errorMessage += " NOTE: On Redmi/Xiaomi, please ensure 'Battery Saver' is disabled and 'Auto-start' is enabled for your browser.";
            }

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
