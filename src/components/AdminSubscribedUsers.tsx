'use client';

import React, { useState, useEffect } from 'react';

interface SubscribedUser {
    id: string;
    name: string;
    email: string;
    role: string;
    shopName: string;
    phoneNumber: string;
    subscriptionDate: string | null;
}

export default function AdminSubscribedUsers() {
    const [users, setUsers] = useState<SubscribedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/admin/notifications/users');
                if (!response.ok) {
                    throw new Error('Failed to fetch subscribed users');
                }
                const data = await response.json();
                if (data.success) {
                    setUsers(data.users || []);
                } else {
                    throw new Error(data.error || 'Failed to parse users');
                }
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('An unknown error occurred');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
                <p className="text-red-500 font-medium">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 mt-8">
            <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center gap-2">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Subscribed Users ({users.length})
            </h2>
            <p className="text-gray-500 text-sm mb-6">List of users who have actively enabled push notifications.</p>

            {users.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-gray-500">No users have subscribed to notifications yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="p-3 text-sm font-semibold text-gray-600 uppercase tracking-wider">User</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 uppercase tracking-wider">Shop/Details</th>
                                <th className="p-3 text-sm font-semibold text-gray-600 uppercase tracking-wider">Subscribed Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-3">
                                        <div className="font-medium text-gray-800">{user.name}</div>
                                        <div className="text-xs text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="p-3">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                            ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                user.role === 'merchant' || user.role === 'tenant' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="text-sm text-gray-800">{user.shopName !== 'N/A' ? user.shopName : '-'}</div>
                                        <div className="text-xs text-gray-500">{user.phoneNumber !== 'N/A' ? user.phoneNumber : ''}</div>
                                    </td>
                                    <td className="p-3 text-sm text-gray-600">
                                        {user.subscriptionDate
                                            ? new Date(user.subscriptionDate).toLocaleDateString(undefined, {
                                                year: 'numeric', month: 'short', day: 'numeric'
                                            })
                                            : 'Unknown'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
