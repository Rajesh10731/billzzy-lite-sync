
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import CountryCodeSelector from '@/components/ui/CountryCodeSelector';
import { countries } from '@/lib/countries';


// Reuse the image from login for consistency
const HEADER_IMAGE_URL = '/assets/big-image-login.png';
const LOGO_URL = '/assets/lite-logo.png';

export default function VerifyPhonePage() {
    const { data: session, update } = useSession();
    const router = useRouter();

    const [step, setStep] = useState<'PHONE_INPUT' | 'OTP_INPUT'>('PHONE_INPUT');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [selectedCountryCode, setSelectedCountryCode] = useState('IN');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // If already verified, redirect to dashboard
    useEffect(() => {
        if (session?.user?.phoneNumber) {
            router.push('/dashboard');
        }
    }, [session, router]);

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const dialCode = countries.find(c => c.code === selectedCountryCode)?.dialCode || '+91';
            const fullPhoneNumber = dialCode.replace('+', '') + phoneNumber;

            const res = await fetch('/api/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: fullPhoneNumber }),
            });

            const data = await res.json();

            if (data.success) {
                setStep('OTP_INPUT');
            } else {
                setError(data.message || 'Failed to send OTP');
            }
        } catch (err) {
            setError('An error occurred. Please try again.' + err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const dialCode = countries.find(c => c.code === selectedCountryCode)?.dialCode || '+91';
            const fullPhoneNumber = dialCode.replace('+', '') + phoneNumber;

            const res = await fetch('/api/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: fullPhoneNumber, otp }),
            });

            const data = await res.json();

            if (data.success) {
                // Update session to include phone number so middleware lets us pass
                const dialCode = countries.find(c => c.code === selectedCountryCode)?.dialCode || '+91';
                const fullPhoneNumber = dialCode.replace('+', '') + phoneNumber;
                await update({ phoneNumber: fullPhoneNumber });
                router.push('/dashboard');
                router.refresh(); // Refresh middleware state
            } else {
                setError(data.message || 'Invalid OTP');
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative pb-8">

                {/* Header Image */}
                <div
                    className="relative h-48 overflow-hidden rounded-t-3xl"
                    style={{ clipPath: 'ellipse(120% 100% at 50% 0%)' }}
                >
                    <Image
                        src={HEADER_IMAGE_URL}
                        alt="Header Background"
                        fill
                        className="object-cover"
                    />
                </div>

                <div className="px-6 pt-4 pb-8">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <Image
                            src={LOGO_URL}
                            alt="Logo"
                            width={140}
                            height={35}
                            className="h-auto w-auto"
                        />
                    </div>

                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">
                            {step === 'PHONE_INPUT' ? 'Verify Phone Number' : 'Enter One-Time Password'}
                        </h2>
                        <p className="text-gray-600 text-sm mt-2">
                            {step === 'PHONE_INPUT'
                                ? 'We need to verify your phone number to secure your account. We will send an OTP via WhatsApp.'
                                : `We've sent a 6-digit code to ${countries.find(c => c.code === selectedCountryCode)?.dialCode} ${phoneNumber}. Please enter it below.`}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    {step === 'PHONE_INPUT' ? (
                        <form onSubmit={handleSendOTP} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone Number
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="w-28 shrink-0">
                                        <CountryCodeSelector
                                            selectedCountryCode={selectedCountryCode}
                                            onSelect={(c) => setSelectedCountryCode(c.code)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <input
                                        type="tel"
                                        required
                                        value={phoneNumber}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 15) setPhoneNumber(val);
                                        }}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Enter number"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || phoneNumber.length !== 10}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isLoading ? 'Sending...' : 'Send OTP'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    6-Digit OTP
                                </label>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-center text-ls tracking-widest font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="------"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || otp.length !== 6}
                                className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isLoading ? 'Verifying...' : 'Verify & Continue'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep('PHONE_INPUT')}
                                className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 font-medium"
                            >
                                Change Phone Number
                            </button>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}
