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
        if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return;

        // Only ask if permission is default (not yet asked or reset)
        if (Notification.permission === 'default') {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                const subscription = registration ? await registration.pushManager.getSubscription() : null;

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
        } catch (error) {
            console.error(error);
            setModalState({
                isOpen: true,
                title: 'Error',
                message: 'Failed to enable notifications.',
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
