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

        // 2. Secret Check: Is the VAPID key even there?
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) {
            console.error('VAPID Public Key is missing. Build issue?');
        }

        // 3. Permission Check
        if (Notification.permission === 'default' || Notification.permission === 'granted') {
            try {
                const registration = await navigator.serviceWorker.ready;
                if (!registration.pushManager) return;

                const subscription = await registration.pushManager.getSubscription();

                // If permission is already granted but no subscription exists, 
                // we should still try to subscribe them (maybe the previous sync failed).
                if (!subscription) {
                    setModalState({
                        isOpen: true,
                        type: 'ask',
                        title: Notification.permission === 'granted' ? 'Finalize Alerts' : 'Enable Alerts?',
                        message: Notification.permission === 'granted'
                            ? 'Permission is granted, but we need to link your device to receive updates.'
                            : 'Receive real-time updates about sales even when the app is closed.'
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
