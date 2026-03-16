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
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            Subscribed Users <span className="ml-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">{users.length}</span>
                        </h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">List of users who have actively enabled push notifications.</p>
                    </div>
                </div>

                {users.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-gray-50/50">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200 shadow-sm">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">No subscribers yet</h3>
                        <p className="text-gray-500 text-sm">Users who enable push notifications will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-left whitespace-nowrap">User Info</th>
                                    <th className="px-6 py-4 text-left whitespace-nowrap">Role Designation</th>
                                    <th className="px-6 py-4 text-left whitespace-nowrap">Shop & Contact Details</th>
                                    <th className="px-6 py-4 text-left whitespace-nowrap">Subscribed Date</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-50">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group/row">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="text-sm font-bold text-gray-900 group-hover/row:text-indigo-600 transition-colors">{user.name}</div>
                                                <div className="text-[11px] font-medium text-gray-500 mt-0.5">{user.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize border shadow-sm
                                                ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200/50' :
                                                    user.role === 'merchant' || user.role === 'tenant' ? 'bg-blue-50 text-blue-700 border-blue-200/50' :
                                                        'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-800">{user.shopName !== 'N/A' ? user.shopName : '-'}</div>
                                            {user.phoneNumber !== 'N/A' && (
                                                <div className="inline-block text-[11px] text-gray-600 font-bold bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-200 shadow-sm mt-1">
                                                    {user.phoneNumber}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-500">
                                            {user.subscriptionDate
                                                ? new Date(user.subscriptionDate).toLocaleDateString(undefined, {
                                                    year: 'numeric', month: 'short', day: 'numeric'
                                                })
                                                : <span className="text-gray-400 italic font-medium">Unknown</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
