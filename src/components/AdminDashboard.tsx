// src/components/AdminDashboard.tsx

'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Edit2, Check, X, Filter } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import { formatPhoneNumber, countries, Country } from '@/lib/countries';
import CountryCodeSelector from '@/components/ui/CountryCodeSelector';

// The shape of the user data
interface User {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  billCount?: number;
  onboarded?: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Date Filter State
  const [showDateFilter, setShowDateFilter] = useState(false);
  type ValuePiece = Date | null;
  type CalendarValue = ValuePiece | [ValuePiece, ValuePiece];
  const [dateRange, setDateRange] = useState<CalendarValue>(null);
  const [tempDateRange, setTempDateRange] = useState<CalendarValue>(null);

  // State for Phone editing
  const [editingPhoneUserId, setEditingPhoneUserId] = useState<string | null>(null);
  const [tempPhone, setTempPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  // Create a separate function for fetching users with date filters
  const fetchUsers = async (start: string = '', end: string = '') => {
    try {
      setLoading(true);
      let url = '/api/admin/tenants';

      // Add date parameters if provided
      if (start || end) {
        const params = new URLSearchParams();
        if (start) params.append('startDate', start);
        if (end) params.append('endDate', end);
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('You do not have permission to view this data.');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset filters
  const handleReset = () => {
    setDateRange(null);
    setTempDateRange(null);
    fetchUsers();
  };

  const handleOnboard = async (userId: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, onboarded: true }),
      });

      if (!res.ok) {
        throw new Error('Failed to onboard tenant');
      }

      await fetchUsers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Add the delete tenant function
  const handleDeleteTenant = async (userId: string, userName: string) => {
    // Confirm before deleting
    if (!confirm(`Are you sure you want to delete tenant "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(userId);
      const res = await fetch(`/api/admin/tenants?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete tenant');
      }

      // Refresh the user list
      fetchUsers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const startEditingPhone = (user: User) => {
    setEditingPhoneUserId(user._id);

    // Attempt to extract country and number
    const cleaned = (user.phoneNumber || '').replace(/\D/g, '');
    const foundCountry = [...countries]
      .sort((a, b) => b.dialCode.length - a.dialCode.length)
      .find(c => cleaned.startsWith(c.dialCode.replace(/\D/g, '')));

    if (foundCountry) {
      setSelectedCountry(foundCountry);
      setTempPhone(cleaned.slice(foundCountry.dialCode.replace(/\D/g, '').length));
    } else {
      setSelectedCountry(countries[0]); // Default to India
      setTempPhone(cleaned);
    }
  };

  const cancelEditingPhone = () => {
    setEditingPhoneUserId(null);
    setTempPhone('');
    setSelectedCountry(null);
  };

  const handleSavePhone = async (userId: string) => {
    try {
      const fullPhone = selectedCountry
        ? `${selectedCountry.dialCode}${tempPhone.replace(/\D/g, '')}`
        : tempPhone.replace(/\D/g, '');

      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, phoneNumber: fullPhone }),
      });

      if (!res.ok) throw new Error('Failed to update Phone Number');

      setUsers(users.map(u => u._id === userId ? { ...u, phoneNumber: fullPhone } : u));
      setEditingPhoneUserId(null);
      setTempPhone('');
      setSelectedCountry(null);
      alert("Phone number updated successfully!");
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    setTimeout(() => {
      router.push('/');
    }, 500);
  };

  const pendingUsers = users.filter((user: User) =>
    (!user.onboarded) &&
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phoneNumber && user.phoneNumber.includes(searchTerm)))
  );


  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading user data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600 bg-red-100 rounded-md">Error: {error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Tenant Management</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">Review pending registrations and tenant activity</p>
          </div>
          <div className="flex gap-2 relative">
            <button
              onClick={() => {
                setTempDateRange(dateRange);
                setShowDateFilter(!showDateFilter);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border ${Array.isArray(dateRange) && dateRange[0] && dateRange[1]
                ? 'bg-indigo-600 text-white border-transparent ring-2 ring-indigo-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200'
                }`}
            >
              <Filter className="w-4 h-4" />
              {Array.isArray(dateRange) && dateRange[0] && dateRange[1] ? (
                <span>
                  {format(dateRange[0], 'dd MMM')} - {format(dateRange[1], 'dd MMM')}
                </span>
              ) : <span>Filter by Date</span>}
              {(Array.isArray(dateRange) && dateRange[0]) && (
                <X
                  size={14}
                  className="ml-1 hover:text-red-500 hover:bg-white/20 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                />
              )}
            </button>

            {/* Date Filter Popover */}
            {showDateFilter && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-xl shadow-xl border border-gray-200 w-[280px] p-0 animate-in fade-in zoom-in-95 duration-200">
                <style>{`
                    .filter-calendar .react-calendar {
                      border: none;
                      font-family: inherit;
                      width: 100%;
                      font-size: 0.75rem;
                      background: transparent;
                    }
                    .filter-calendar .react-calendar__navigation {
                      margin-bottom: 0.5rem;
                    }
                    .filter-calendar .react-calendar__navigation button {
                      min-width: 24px;
                      background: none;
                      font-weight: 600;
                      color: #4f46e5;
                    }
                    .filter-calendar .react-calendar__month-view__weekdays {
                      font-weight: 600;
                      font-size: 0.65rem;
                      text-transform: uppercase;
                      color: #9ca3af;
                    }
                    .filter-calendar .react-calendar__tile {
                      padding: 6px 4px;
                      border-radius: 4px;
                    }
                    .filter-calendar .react-calendar__tile--active {
                      background: #4f46e5 !important;
                      color: white !important;
                    }
                    .filter-calendar .react-calendar__tile--now {
                      background: #f3f4f6;
                    }
                    .filter-calendar .react-calendar__tile--range {
                       background: #eef2ff;
                       color: #4f46e5;
                    }
                    .filter-calendar .react-calendar__tile--rangeStart {
                       background: #4f46e5 !important;
                       color: white !important;
                       border-top-left-radius: 6px !important;
                       border-bottom-left-radius: 6px !important;
                    }
                    .filter-calendar .react-calendar__tile--rangeEnd {
                       background: #4f46e5 !important;
                       color: white !important;
                       border-top-right-radius: 6px !important;
                       border-bottom-right-radius: 6px !important;
                    }
                 `}</style>
                <div className="p-3 filter-calendar">
                  <Calendar
                    onChange={(value) => setTempDateRange(value as CalendarValue)}
                    value={tempDateRange}
                    selectRange={true}
                    className="w-full"
                    next2Label={null}
                    prev2Label={null}
                  />
                </div>
                <div className="flex items-center gap-2 p-2 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                  <button
                    onClick={() => setShowDateFilter(false)}
                    className="flex-1 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (Array.isArray(tempDateRange) && tempDateRange[0] && tempDateRange[1]) {
                        setDateRange(tempDateRange);
                        setShowDateFilter(false);
                        const f = format(tempDateRange[0], 'yyyy-MM-dd');
                        const t = format(tempDateRange[1], 'yyyy-MM-dd');
                        fetchUsers(f, t);
                      }
                    }}
                    disabled={!Array.isArray(tempDateRange) || !tempDateRange[0] || !tempDateRange[1]}
                    className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white">
          <input
            type="text"
            placeholder="Search pending tenants by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 hover:bg-white"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto pb-4">
          <div className="px-6 py-4 bg-amber-50/80 border-b border-amber-100/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Registration Review Queue
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {pendingUsers.length} Pending
            </span>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Check className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">All caught up!</h3>
              <p className="text-gray-500 text-sm">
                {searchTerm ? 'No pending tenants match your current search.' : 'There are no tenants waiting to be onboarded right now.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left whitespace-nowrap">S.No</th>
                    <th scope="col" className="px-6 py-4 text-left whitespace-nowrap">Tenant Profile</th>
                    <th scope="col" className="px-6 py-4 text-left whitespace-nowrap">Contact Info</th>
                    <th scope="col" className="px-6 py-4 text-left whitespace-nowrap">Activity</th>
                    <th scope="col" className="px-6 py-4 text-left whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {pendingUsers.map((user, index) => (
                    <tr key={user._id} className="hover:bg-gray-50/50 transition-colors group/row">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-bold text-gray-900 group-hover/row:text-indigo-600 transition-colors">{user.name}</div>
                          <div className="text-[11px] font-medium text-gray-500 mt-0.5">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingPhoneUserId === user._id ? (
                          <div className="flex items-center gap-2">
                            <div className="w-24">
                              <CountryCodeSelector
                                selectedCountryCode={selectedCountry?.code || 'IN'}
                                onSelect={(c) => setSelectedCountry(c)}
                              />
                            </div>
                            <input
                              type="tel"
                              placeholder="Phone number"
                              className="w-32 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold bg-white"
                              value={tempPhone}
                              onChange={(e) => setTempPhone(e.target.value)}
                            />
                            <button onClick={() => handleSavePhone(user._id)} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors shadow-sm border border-green-100">
                              <Check size={14} />
                            </button>
                            <button onClick={cancelEditingPhone} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors shadow-sm border border-red-100">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <div className="text-xs font-bold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                              {formatPhoneNumber(user.phoneNumber)}
                            </div>
                            <button onClick={() => startEditingPhone(user)} className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-indigo-50 rounded-lg">
                              <Edit2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                          {user.billCount || 0} Bills Generated
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOnboard(user._id)}
                            className="px-4 py-1.5 rounded-lg text-white text-[11px] font-bold bg-green-600 hover:bg-green-700 transition-all active:scale-95 shadow-sm uppercase tracking-wider"
                          >
                            Onboard
                          </button>
                          <button
                            onClick={() => handleDeleteTenant(user._id, user.name)}
                            disabled={deletingId === user._id}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 shadow-sm uppercase tracking-wider border ${deletingId === user._id
                              ? 'bg-red-50 text-red-400 border-red-100 cursor-not-allowed'
                              : 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300'
                              }`}
                          >
                            {deletingId === user._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>

  );
}