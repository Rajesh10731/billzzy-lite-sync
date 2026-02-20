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

        // 2. Permission Check: Silent Auto-Subscription
        if (Notification.permission === 'granted') {
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();

                // If permission is already granted but no subscription exists (e.g. browser cleared it),
                // we should still try to subscribe them silently in the background.
                if (!subscription) {
                    console.log('🔄 Notifications allowed but not active. Auto-subscribing in background...');
                    await subscribeUserToPush();
                }
            } catch (error: unknown) {
                console.error('Silent subscription failed:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                // If it's a configuration error (like missing VAPID key), we want to show it
                if (errorMessage.includes('VAPID') || errorMessage.includes('Configuration')) {
                    setModalState({
                        isOpen: true,
                        title: 'Auto-Setup Issue',
                        message: `Notifications are allowed, but background setup failed: ${errorMessage}`,
                        type: 'error'
                    });
                }
            }
            return; // Already granted, no need to show the modal
        }

        // 3. New User / Permission Default: Show Prompt
        if (Notification.permission === 'default') {
            try {
                const registration = await navigator.serviceWorker.ready;

                // Mobile/iOS Standalone Check
                // @ts-expect-error - standalone is a non-standard iOS property
                const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

                if (isIOS && !isStandalone) {
                    console.log("iOS detected but not in PWA standalone mode. Skipping prompt.");
                    return;
                }

                if (!registration.pushManager) {
                    console.warn("PushManager not found.");
                    return;
                }

                const subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    setModalState({
                        isOpen: true,
                        type: 'ask',
                        title: 'Enable Alerts?',
                        message: 'Receive real-time updates about sales even when the app is closed.'
                    });
                }
            } catch (error) {
                console.error('Error checking subscription:', error);
            }
        }
    }, []);

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
