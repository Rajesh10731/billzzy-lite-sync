// // src/components/AdminDashboard.tsx

// 'use client';

// import { useState, useEffect } from 'react';
// import { signOut } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
// import { Edit2, Check, X } from 'lucide-react'; // Import icons

// // The shape of the user data
// interface User {
//   _id: string;
//   name: string;
//   email: string;
//   phoneNumber?: string;
//   billCount?: number;
//   onboarded?: boolean;
//   pin?: string;
// }

// export default function OnboardedClients() {
//   const router = useRouter();
//   const [users, setUsers] = useState<User[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [startDate, setStartDate] = useState('');
//   const [endDate, setEndDate] = useState('');

//   // State for PIN editing
//   const [editingPinUserId, setEditingPinUserId] = useState<string | null>(null);
//   const [tempPin, setTempPin] = useState('');


//   // Create a separate function for fetching users with date filters
//   const fetchUsers = async (start: string = '', end: string = '') => {
//     try {
//       setLoading(true);
//       let url = '/api/admin/tenants';

//       // Add date parameters if provided
//       if (start || end) {
//         const params = new URLSearchParams();
//         if (start) params.append('startDate', start);
//         if (end) params.append('endDate', end);
//         url += `?${params.toString()}`;
//       }

//       const res = await fetch(url);
//       if (!res.ok) {
//         throw new Error('You do not have permission to view this data.');
//       }
//       const data = await res.json();
//       setUsers(data);
//     } catch (err) {
//       setError((err as Error).message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchUsers();
//   }, []);

//   // Handle date filter submission
//   const handleFilter = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     fetchUsers(startDate, endDate);
//   };

//   // Reset filters
//   const handleReset = () => {
//     setStartDate('');
//     setEndDate('');
//     fetchUsers();
//   };


//   const handleOffboard = async (userId: string, userName: string) => {
//     if (!confirm(`Are you sure you want to offboard "${userName}"? They will be moved back to Pending.`)) {
//       return;
//     }

//     try {
//       setLoading(true);
//       const res = await fetch('/api/admin/tenants', {
//         method: 'PATCH',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ userId, onboarded: false }),
//       });

//       if (!res.ok) {
//         throw new Error('Failed to offboard tenant');
//       }

//       await fetchUsers();
//     } catch (err) {
//       setError((err as Error).message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const startEditingPin = (user: User) => {
//     setEditingPinUserId(user._id);
//     setTempPin(user.pin || '');
//   };

//   const cancelEditingPin = () => {
//     setEditingPinUserId(null);
//     setTempPin('');
//   };

//   const handleSavePin = async (userId: string) => {
//     try {
//       // Basic validation: PIN should be 4-6 digits, but let's just checking length for now.
//       if (tempPin.length < 4) {
//         alert("PIN must be at least 4 characters.");
//         return;
//       }

//       // Optimistic update (optional, but let's just reload)
//       const res = await fetch('/api/admin/tenants', {
//         method: 'PATCH',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ userId, pin: tempPin }),
//       });

//       if (!res.ok) {
//         throw new Error('Failed to update PIN');
//       }

//       // Update local state directly so we don't flash loading
//       setUsers(users.map(u => u._id === userId ? { ...u, pin: tempPin } : u));
//       setEditingPinUserId(null);
//       setTempPin('');

//     } catch (err) {
//       alert((err as Error).message);
//     }
//   };


//   // Add the delete tenant function


//   const handleLogout = async () => {
//     await signOut({ redirect: false });
//     setTimeout(() => {
//       router.push('/');
//     }, 500);
//   };



//   const onboardedUsers = users.filter((user: User) =>
//     (user.onboarded) &&
//     (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (user.phoneNumber && user.phoneNumber.includes(searchTerm)))
//   );

//   if (loading) {
//     return <div className="p-4 text-center text-gray-500">Loading user data...</div>;
//   }

//   if (error) {
//     return <div className="p-4 text-center text-red-600 bg-red-100 rounded-md">Error: {error}</div>;
//   }

//   return (
//     <div className="max-w-6xl mx-auto px-4 py-6">
//       <div className="bg-white rounded-lg shadow-md overflow-hidden">
//         {/* Header */}
//         <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//           <div>
//             <h2 className="text-lg font-semibold text-gray-800">Onboarded Clients</h2>
//             <p className="text-sm text-gray-500">View and manage clients who have been onboarded</p>
//           </div>
//           <div className="flex gap-2">
//             <button
//               onClick={() => router.push('/admin/dashboard')}
//               className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
//             >
//               Back to Dashboard
//             </button>
//             <button
//               onClick={handleLogout}
//               className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
//             >
//               Logout
//             </button>
//           </div>
//         </div>

//         {/* Filters */}
//         <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
//           <form onSubmit={handleFilter} className="flex flex-col sm:flex-row gap-4">
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
//               {/* Start Date */}
//               <div className="sm:col-span-1">
//                 <label htmlFor="startDate" className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
//                 <div className="relative">
//                   <input
//                     type="date"
//                     id="startDate"
//                     value={startDate}
//                     onChange={(e) => setStartDate(e.target.value)}
//                     className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
//                   />
//                 </div>
//               </div>

//               {/* End Date */}
//               <div className="sm:col-span-1">
//                 <label htmlFor="endDate" className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
//                 <div className="relative">
//                   <input
//                     type="date"
//                     id="endDate"
//                     value={endDate}
//                     onChange={(e) => setEndDate(e.target.value)}
//                     className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
//                   />
//                 </div>
//               </div>

//               {/* Action Buttons */}
//               <div className="sm:col-span-2 flex items-end space-x-3">
//                 <button
//                   type="submit"
//                   className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
//                 >
//                   Apply Filters
//                 </button>
//                 <button
//                   type="button"
//                   onClick={handleReset}
//                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
//                 >
//                   Reset
//                 </button>
//               </div>
//             </div>
//           </form>
//         </div>

//         {/* Search */}
//         <div className="px-6 py-3 border-b border-gray-200">
//           <div className="relative">
//             <input
//               type="text"
//               placeholder="Search tenants..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//             />
//           </div>
//         </div>

//         {/* Table */}
//         <div className="overflow-x-auto">
//           <div className="px-6 py-4 bg-green-50 border-b border-green-200">
//             <h3 className="text-md font-semibold text-green-800">Onboarded Clients</h3>
//           </div>
//           {onboardedUsers.length === 0 ? (
//             <div className="text-center py-8">
//               <p className="text-gray-500">
//                 {searchTerm ? 'No onboarded tenants match your search.' : 'No onboarded tenants found.'}
//               </p>
//             </div>
//           ) : (
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
//                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
//                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
//                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PIN</th>
//                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Count</th>
//                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₹)</th>
//                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {onboardedUsers.map((user, index) => (
//                   <tr key={user._id} className="hover:bg-gray-50">
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                       {index + 1}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <div className="text-sm font-medium text-gray-900">{user.name}</div>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <div className="text-sm text-gray-500">{user.email}</div>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       {editingPinUserId === user._id ? (
//                         <div className="flex items-center gap-2">
//                           <input
//                             type="text"
//                             className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
//                             value={tempPin}
//                             onChange={(e) => setTempPin(e.target.value)}
//                             maxLength={6}
//                           />
//                           <button onClick={() => handleSavePin(user._id)} className="text-green-600 hover:text-green-800"><Check size={18} /></button>
//                           <button onClick={cancelEditingPin} className="text-red-600 hover:text-red-800"><X size={18} /></button>
//                         </div>
//                       ) : (
//                         <div className="flex items-center gap-2">
//                           <span className="text-sm text-gray-700 font-mono">{user.pin || 'N/A'}</span>
//                           <button onClick={() => startEditingPin(user)} className="text-gray-400 hover:text-indigo-600">
//                             <Edit2 size={16} />
//                           </button>
//                         </div>
//                       )}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
//                         {user.billCount || 0}
//                       </span>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <div className="text-sm text-gray-900 font-semibold">
//                         ₹{((user.billCount || 0) * 0.15).toFixed(2)}
//                       </div>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
//                       <button
//                         onClick={() => handleOffboard(user._id, user.name)}
//                         className="px-3 py-1 rounded-md text-white text-sm bg-yellow-600 hover:bg-yellow-700"
//                       >
//                         Offboard
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Edit2, Check, X, Copy, Key } from 'lucide-react';
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
  pin?: string;
  merchantId?: string;
  apiKey?: string;
  billzzyHook?: string; // New Field
}

export default function OnboardedClients() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State for PIN editing
  const [editingPinUserId, setEditingPinUserId] = useState<string | null>(null);
  const [tempPin, setTempPin] = useState('');

  // State for Phone editing
  const [editingPhoneUserId, setEditingPhoneUserId] = useState<string | null>(null);
  const [tempPhone, setTempPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  // Function for fetching users with date filters
  const fetchUsers = useCallback(async (start: string = '', end: string = '') => {
    try {
      setLoading(true);
      let url = '/api/admin/tenants';

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
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Utility to copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    if (!text || text === 'Not Generated') return;
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  // Handle date filter submission
  const handleFilter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchUsers(startDate, endDate);
  };

  // Reset filters
  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    fetchUsers();
  };

  const handleOffboard = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to offboard "${userName}"? They will be moved back to Pending.`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, onboarded: false }),
      });

      if (!res.ok) throw new Error('Failed to offboard tenant');
      await fetchUsers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startEditingPin = (user: User) => {
    setEditingPinUserId(user._id);
    setTempPin(user.pin || '');
  };

  const cancelEditingPin = () => {
    setEditingPinUserId(null);
    setTempPin('');
  };

  const handleSavePin = async (userId: string) => {
    try {
      if (tempPin.length < 4) {
        alert("PIN must be at least 4 characters.");
        return;
      }

      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pin: tempPin }),
      });

      if (!res.ok) throw new Error('Failed to update PIN');

      setUsers(users.map(u => u._id === userId ? { ...u, pin: tempPin } : u));
      setEditingPinUserId(null);
      setTempPin('');
    } catch (err) {
      alert((err as Error).message);
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

  const handleGenerateApiKey = async (userId: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/tenants/generate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate key');

      // Update local state with the new key info
      setUsers(users.map(u =>
        u._id === userId
          ? { ...u, merchantId: data.merchantId, apiKey: data.apiKey, billzzyHook: data.billzzyHook }
          : u
      ));

      alert(`Access Hook Generated!\nHook: ${data.billzzyHook}`);

    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const onboardedUsers = users.filter((user: User) =>
    (user.onboarded) &&
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phoneNumber && user.phoneNumber.includes(searchTerm)))
  );

  if (loading) return <div className="p-4 text-center text-gray-500">Loading onboarded clients...</div>;
  if (error) return <div className="p-4 text-center text-red-600 bg-red-100 rounded-md">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Onboarded Clients</h2>
            <p className="text-xs text-gray-500 font-medium">Manage merchant identity, PINs, and Developer API access</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/admin/dashboard')} className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100">
              Dashboard
            </button>
            <button onClick={handleLogout} className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-md hover:bg-red-700">
              Logout
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <form onSubmit={handleFilter} className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-wrap items-end gap-4 flex-1">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-md border-gray-300 text-sm py-1.5 px-3 border" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-md border-gray-300 text-sm py-1.5 px-3 border" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Apply</button>
                <button type="button" onClick={handleReset} className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Reset</button>
              </div>
            </div>
          </form>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-200 bg-white">
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">S.No</th>
                <th className="px-6 py-3 text-left">Tenant Info</th>
                <th className="px-6 py-3 text-left text-orange-600">Developer API Access</th>
                <th className="px-6 py-3 text-left">PIN</th>
                <th className="px-6 py-3 text-left">Usage (Bills)</th>
                <th className="px-6 py-3 text-left">Earnings</th>
                <th className="px-6 py-3 text-left text-green-600">Status</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {onboardedUsers.map((user, index) => (
                <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{index + 1}</td>

                  {/* Tenant Info */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{user.name}</div>
                    {editingPhoneUserId === user._id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-24">
                          <CountryCodeSelector
                            selectedCountryCode={selectedCountry?.code || 'IN'}
                            onSelect={(c) => setSelectedCountry(c)}
                          />
                        </div>
                        <input
                          type="tel"
                          placeholder="Phone number"
                          className="w-32 border border-gray-300 rounded-xl px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                          value={tempPhone}
                          onChange={(e) => setTempPhone(e.target.value)}
                        />
                        <button onClick={() => handleSavePhone(user._id)} className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors">
                          <Check size={16} />
                        </button>
                        <button onClick={cancelEditingPhone} className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group mt-0.5">
                        <div className="text-[11px] text-gray-700 font-bold italic bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                          {formatPhoneNumber(user.phoneNumber)}
                        </div>
                        <button onClick={() => startEditingPhone(user)} className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                    <div className="text-[11px] text-gray-400 font-medium">{user.email}</div>
                  </td>

                  {/* API ACCESS COLUMN */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 min-w-[220px]">
                      {user.billzzyHook ? (
                        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 px-2 py-1.5 rounded group shadow-sm">
                          <code className="text-[10px] font-black text-indigo-700 break-all">
                            HOOK: {user.billzzyHook}
                          </code>
                          <button
                            onClick={() => copyToClipboard(user.billzzyHook!, 'Access Hook')}
                            className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-indigo-100 rounded"
                            title="Copy Hook"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateApiKey(user._id)}
                          className="w-full py-1.5 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Key size={10} /> Generate Access Hook
                        </button>
                      )}
                    </div>
                  </td>

                  {/* PIN COLUMN */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingPinUserId === user._id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={tempPin}
                          onChange={(e) => setTempPin(e.target.value)}
                          maxLength={6}
                        />
                        <button onClick={() => handleSavePin(user._id)} className="text-green-600 hover:text-green-800"><Check size={18} /></button>
                        <button onClick={cancelEditingPin} className="text-red-600 hover:text-red-800"><X size={18} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span className="text-sm text-gray-700 font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{user.pin || '----'}</span>
                        <button onClick={() => startEditingPin(user)} className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* BILL COUNT */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {user.billCount || 0} Bills
                    </span>
                  </td>

                  {/* EARNINGS */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-bold">
                      ₹{((user.billCount || 0) * 0.15).toFixed(2)}
                    </div>
                  </td>

                  {/* STATUS */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-[10px] font-extrabold text-green-600 uppercase tracking-tight">Onboarded</span>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleOffboard(user._id, user.name)}
                      className="px-3 py-1 rounded-md text-white text-[10px] font-bold bg-yellow-600 hover:bg-yellow-700 transition-colors uppercase tracking-tight shadow-sm"
                    >
                      Offboard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}