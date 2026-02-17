// 'use client';

// import { useSession, signOut } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
// import React, { useCallback, useEffect, useState } from 'react';
// import {
//   User,
//   Store,
//   AlertTriangle,
//   QrCode,
//   Edit2,
//   Check,
//   X,
//   Download,
//   LogOut,
//   Settings as SettingsIcon,
//   ChevronRight,
//   Info,
// } from 'lucide-react';

// // Type for the form data
// type FormData = {
//   name: string;
//   phoneNumber: string;
//   address: string;
//   shopName: string;
//   shopAddress: string;
//   merchantUpiId: string;
// };

// // Type for the SettingsField component's props
// type SettingsFieldProps = {
//   label: string;
//   value: string;
//   isEditing: boolean;
//   name: keyof FormData;
//   onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
//   type?: string;
// };

// // A reusable component for displaying a settings field
// const SettingsField = ({ label, value, isEditing, name, onChange, type = 'text' }: SettingsFieldProps) => (
//   <div className="py-2 border-b border-gray-100 last:border-b-0 transition-all hover:bg-gray-50/50 -mx-3 px-3">
//     <label htmlFor={name} className="block text-[12px] font-bold text-gray-900 uppercase tracking-wide mb-1 opacity-90">
//       {label}
//     </label>
//     {isEditing ? (
//       <input
//         type={type}
//         name={name}
//         id={name}
//         value={value}
//         onChange={onChange}
//         className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-[#5a4fcf] focus:ring-[#5a4fcf] text-sm py-2 px-3 transition-all"
//         placeholder={`Ex: ${label === 'Phone' ? '9876543210' : label === 'Merchant UPI ID' ? 'name@okaxis' : 'Enter ' + label.toLowerCase()}`}
//       />
//     ) : (
//       <div className="flex items-center justify-between group">
//         <p className={`text-sm font-semibold ${value ? 'text-gray-900' : 'text-gray-400 italic'}`}>
//           {value || `No ${label.toLowerCase()} added`}
//         </p>
//         <ChevronRight size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
//       </div>
//     )}
//   </div>
// );

// // --- ENHANCED MODAL COMPONENT (Compact Version) ---
// type ModalProps = {
//   isOpen: boolean;
//   onClose: () => void;
//   title: string;
//   message: string;
//   type?: 'success' | 'error' | 'info';
// };

// const Modal = ({ isOpen, onClose, title, message, type = 'info' }: ModalProps) => {
//   if (!isOpen) return null;

//   let Icon = AlertTriangle;
//   let iconColor = 'text-gray-500';
//   let bgColor = 'bg-gray-100';

//   if (type === 'success') {
//     Icon = Check;
//     iconColor = 'text-white';
//     bgColor = 'bg-green-500';
//   } else if (type === 'error') {
//     Icon = AlertTriangle;
//     iconColor = 'text-white';
//     bgColor = 'bg-red-500';
//   } else {
//     Icon = Info;
//     iconColor = 'text-white';
//     bgColor = 'bg-blue-500';
//   }

//   return (
//     <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
//       <div className="relative w-full max-w-[320px] rounded-2xl bg-white p-5 shadow-2xl border border-gray-200">
//         <div className="flex flex-col items-center text-center">
//           <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${bgColor} shadow-lg shadow-black/10`}>
//             <Icon className={`h-6 w-6 ${iconColor}`} />
//           </div>
//           <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
//           <p className="text-sm text-gray-600 font-medium leading-relaxed">{message}</p>
//           <button
//             onClick={onClose}
//             className="w-full mt-6 bg-[#5a4fcf] text-white py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-[#4a3fb8] active:scale-95 transition-all"
//           >
//             Got it
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default function Settings() {
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const [editingSection, setEditingSection] = useState<string | null>(null);
//   const [formData, setFormData] = useState<FormData>({
//     name: '',
//     phoneNumber: '',
//     address: '',
//     shopName: '',
//     shopAddress: '',
//     merchantUpiId: '',
//   });
//   const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
//     isOpen: false,
//     title: '',
//     message: '',
//     type: 'info'
//   });

//   const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

//   const loadFormData = useCallback(async () => {
//     if (session?.user?.email) {
//       console.log('Fetching settings for:', session.user.email);
//       try {
//         const response = await fetch('/api/users/settings');
//         if (response.ok) {
//           const dbData = await response.json();
//           console.log('Settings fetched from DB:', dbData);
//           const mergedData: FormData = {
//             name: dbData.name || session.user.name || '',
//             phoneNumber: dbData.phoneNumber || '',
//             address: dbData.address || '',
//             shopName: dbData.shopName || '',
//             shopAddress: dbData.shopAddress || '',
//             merchantUpiId: dbData.merchantUpiId || '',
//           };
//           setFormData(mergedData);
//           localStorage.setItem(`userSettings-${session.user.email}`, JSON.stringify(mergedData));
//           return;
//         }
//       } catch (error) {
//         console.error('Error fetching settings from DB:', error);
//       }

//       const savedData = localStorage.getItem(`userSettings-${session.user.email}`);
//       if (savedData) {
//         const parsed = JSON.parse(savedData);
//         setFormData(parsed);
//       }
//     }
//   }, [session]);

//   useEffect(() => {
//     if (status === 'authenticated') {
//       loadFormData();
//     }
//   }, [status, loadFormData]);

//   useEffect(() => {
//     if (status === 'unauthenticated') {
//       router.push('/');
//     }
//   }, [status, router]);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleSave = async () => {
//     if (!session?.user?.email) {
//       setModalState({ isOpen: true, title: 'Error', message: 'Could not save settings. User not found.', type: 'error' });
//       return;
//     }

//     localStorage.setItem(`userSettings-${session.user.email}`, JSON.stringify(formData));

//     try {
//       const response = await fetch('/api/users/settings', {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData),
//       });

//       if (!response.ok) {
//         throw new Error('Failed to update settings');
//       }

//       setModalState({ isOpen: true, title: 'Updated Successfully!', message: 'Store preferences have been synchronized.', type: 'success' });
//     } catch (error) {
//       console.error('Error saving data:', error);
//       setModalState({
//         isOpen: true,
//         title: 'Network Error',
//         message: 'Saved locally, but synchronization failed.',
//         type: 'error'
//       });
//     } finally {
//       setEditingSection(null);
//     }
//   };

//   if (status === 'loading') {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-indigo-600"></div>
//       </div>
//     );
//   }

//   const SectionHeader = ({ title, sectionKey, icon: Icon, colorClass }: { title: string; sectionKey?: string; icon: React.ElementType; colorClass: string }) => (
//     <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between gap-2">
//       <div className="flex items-center gap-2">
//         <div className={`p-1 rounded-lg ${colorClass} bg-opacity-10`}>
//           <Icon size={14} className={colorClass} />
//         </div>
//         <h2 className="text-xs font-extrabold text-gray-800 tracking-tight">{title}</h2>
//       </div>
//       <div>
//         {editingSection === sectionKey ? (
//           <div className="flex items-center gap-1.5">
//             <button
//               type="button"
//               onClick={() => setEditingSection(null)}
//               className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-90 transition-all shadow-sm border border-gray-200"
//               title="Cancel"
//             >
//               <X size={14} className="stroke-[3]" />
//             </button>
//             <button
//               type="button"
//               onClick={() => handleSave()}
//               className="p-1 rounded-lg bg-green-500 text-white hover:bg-green-600 active:scale-90 transition-all shadow-md shadow-green-200 border border-green-600/20"
//               title="Save"
//             >
//               <Check size={14} className="stroke-[3]" />
//             </button>
//           </div>
//         ) : (
//           <button
//             type="button"
//             onClick={() => setEditingSection(sectionKey || null)}
//             className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#5a4fcf] text-white hover:bg-[#4a3fb8] active:scale-95 transition-all shadow-sm text-[10px] font-bold uppercase tracking-tight"
//           >
//             <Edit2 size={10} className="stroke-[3]" />
//             Edit
//           </button>
//         )}
//       </div>
//     </div>
//   );

//   if (status === 'authenticated' && session.user) {
//     return (
//       <div className="min-h-screen bg-gray-50 pb-24">
//         {/* Premium Header */}
//         <div className="px-4 pt-4 pb-2">
//           <div className="flex items-center justify-between mb-3">
//             <div className="flex items-center gap-3">
//               <div className="w-8 h-8 bg-[#5a4fcf] rounded-lg flex items-center justify-center shadow-lg shadow-[#5a4fcf]/20">
//                 <SettingsIcon className="w-4 h-4 text-white" />
//               </div>
//               <div>
//                 <h1 className="text-base font-extrabold text-gray-900 tracking-tight leading-none">Settings</h1>
//                 <p className="text-[10px] text-gray-500 font-medium">Manage store identity</p>
//               </div>
//             </div>
//           </div>

//           {/* Profile Card - Restored Size */}
//           <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 mb-6">
//             <div className="h-16 w-16 rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#5a4fcf]/10 to-[#7c3aed]/10 shadow-sm border border-gray-100">
//               <div className="text-[#5a4fcf] font-bold text-2xl">
//                 {formData.name ? formData.name.charAt(0).toUpperCase() : session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <User size={28} />}
//               </div>
//             </div>
//             <div className="flex-1 min-w-0">
//               <h3 className="text-base font-bold text-gray-900 truncate">{formData.name || session?.user?.name || 'Store Owner'}</h3>
//               <div className="flex items-center gap-1.5 mt-0.5">
//                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
//                 <p className="text-[11px] text-gray-500 font-bold truncate tracking-wide leading-none">{session?.user?.email}</p>
//               </div>
//             </div>
//           </div>

//           <div className="space-y-4">
//             {/* Personal Info */}
//             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
//               <SectionHeader title="Personal" sectionKey="personal" icon={User} colorClass="text-[#5a4fcf]" />
//               <div className="px-4 bg-white">
//                 <SettingsField label="Merchant Name" name="name" value={formData.name} isEditing={editingSection === 'personal'} onChange={handleChange} />
//                 <SettingsField label="Phone" name="phoneNumber" value={formData.phoneNumber} isEditing={editingSection === 'personal'} onChange={handleChange} type="tel" />
//                 <SettingsField label="Location" name="address" value={formData.address} isEditing={editingSection === 'personal'} onChange={handleChange} />
//               </div>
//             </div>

//             {/* Shop Details */}
//             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
//               <SectionHeader title="Store" sectionKey="shop" icon={Store} colorClass="text-emerald-600" />
//               <div className="px-4">
//                 <SettingsField label="Store Name" name="shopName" value={formData.shopName} isEditing={editingSection === 'shop'} onChange={handleChange} />
//                 <SettingsField label="Branch Address" name="shopAddress" value={formData.shopAddress} isEditing={editingSection === 'shop'} onChange={handleChange} />
//               </div>
//             </div>

//             {/* Payment Details */}
//             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
//               <SectionHeader title="Payment" sectionKey="payment" icon={QrCode} colorClass="text-purple-600" />
//               <div className="px-4">
//                 <SettingsField label="Merchant UPI ID" name="merchantUpiId" value={formData.merchantUpiId} isEditing={editingSection === 'payment'} onChange={handleChange} />
//               </div>
//             </div>

//             {/* Account Actions */}
//             <div className="grid grid-cols-1 gap-3 pt-2">
//               <a
//                 href="/downloads/billzzylite.apk"
//                 download="billzzylite.apk"
//                 className="group flex items-center justify-between bg-[#5a4fcf] px-4 py-4 rounded-2xl border border-[#4a3fb8] shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all hover:bg-[#4a3fb8]"
//               >
//                 <div className="flex items-center gap-3">
//                   <div className="p-2 bg-white/20 rounded-xl text-white group-hover:bg-white/30 transition-colors">
//                     <Download size={20} />
//                   </div>
//                   <div>
//                     <h3 className="text-sm font-bold text-white tracking-tight">NFC BRIDGE APK</h3>
//                     <p className="text-[10px] text-white/70 font-medium">Required for NFC Payments</p>
//                   </div>
//                 </div>
//                 <ChevronRight size={18} className="text-white/70" />
//               </a>

//               <button
//                 onClick={() => signOut({ callbackUrl: '/' })}
//                 className="group flex items-center justify-between bg-red-600 px-4 py-4 rounded-2xl border border-red-700 shadow-lg shadow-red-200 active:scale-[0.98] transition-all"
//               >
//                 <div className="flex items-center gap-3">
//                   <div className="p-2 bg-white/20 rounded-xl text-white group-hover:bg-white/30 transition-colors">
//                     <LogOut size={20} />
//                   </div>
//                   <div>
//                     <p className="text-sm font-bold text-white tracking-tight">Sign Out</p>
//                     <p className="text-[10px] text-red-100 font-medium">End current session</p>
//                   </div>
//                 </div>
//                 <ChevronRight size={18} className="text-white/70" />
//               </button>
//             </div>
//           </div>
//         </div>

//         <Modal
//           isOpen={modalState.isOpen}
//           onClose={closeModal}
//           title={modalState.title}
//           message={modalState.message}
//           type={modalState.type}
//         />
//       </div>
//     );
//   }

//   return null;
// }


'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import {
  User,
  Store,
  AlertTriangle,
  QrCode,
  Edit2,
  Check,
  X,
  Download,
  LogOut,
  Settings as SettingsIcon,
  ChevronRight,
  Info,
  Bell
} from 'lucide-react';
import { subscribeUserToPush } from '@/lib/push-notifications';

// --- TYPES ---
type FormData = {
  name: string;
  phoneNumber: string;
  address: string;
  shopName: string;
  shopAddress: string;
  merchantUpiId: string;
};

type SettingsFieldProps = {
  label: string;
  value: string;
  isEditing: boolean;
  name: keyof FormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
};

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
};

// --- COMPONENTS ---

const SettingsField = ({ label, value, isEditing, name, onChange, type = 'text' }: SettingsFieldProps) => (
  <div className="py-2 border-b border-gray-100 last:border-b-0 transition-all hover:bg-gray-50/50 -mx-3 px-3">
    <label htmlFor={name} className="block text-[12px] font-bold text-gray-900 uppercase tracking-wide mb-1 opacity-90">
      {label}
    </label>
    {isEditing ? (
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-[#5a4fcf] focus:ring-[#5a4fcf] text-sm py-2 px-3 transition-all"
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    ) : (
      <div className="flex items-center justify-between group">
        <p className={`text-sm font-semibold ${value ? 'text-gray-900' : 'text-gray-400 italic'}`}>
          {value || `No ${label.toLowerCase()} added`}
        </p>
        <ChevronRight size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    )}
  </div>
);

const Modal = ({ isOpen, onClose, title, message, type = 'info' }: ModalProps) => {
  if (!isOpen) return null;
  const Icon = type === 'success' ? Check : type === 'error' ? AlertTriangle : Info;
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[320px] rounded-2xl bg-white p-5 shadow-2xl border border-gray-200">
        <div className="flex flex-col items-center text-center">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${bgColor} shadow-lg shadow-black/10`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 font-medium leading-relaxed">{message}</p>
          <button onClick={onClose} className="w-full mt-6 bg-[#5a4fcf] text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition-all hover:bg-[#4a3fb8]">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Settings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '', phoneNumber: '', address: '', shopName: '', shopAddress: '', merchantUpiId: '',
  });

  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false, title: '', message: '', type: 'info'
  });
  const [notifStatus, setNotifStatus] = useState({ type: '', msg: '' });

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));
  // --- HANDLERS ---

  const loadFormData = useCallback(async () => {
    if (session?.user?.email) {
      try {
        const response = await fetch('/api/users/settings');
        if (response.ok) {
          const dbData = await response.json();
          setFormData({
            name: dbData.name || session.user.name || '',
            phoneNumber: dbData.phoneNumber || '',
            address: dbData.address || '',
            shopName: dbData.shopName || '',
            shopAddress: dbData.shopAddress || '',
            merchantUpiId: dbData.merchantUpiId || '',
          });
        }
      } catch (error) { console.error(error); }
    }
  }, [session]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadFormData();
    }
    if (status === 'unauthenticated') router.push('/');
  }, [status, loadFormData, router]);

  const handleSave = async () => {
    try {
      const response = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setModalState({ isOpen: true, title: 'Updated!', message: 'Store preferences synchronized.', type: 'success' });
        setEditingSection(null);
      }
    } catch (error) { console.error(error); }
  };

  const handleSubscribe = async () => {
    setNotifStatus({ type: 'info', msg: 'Subscribing...' });
    try {
      if (!('Notification' in window)) {
        setModalState({ isOpen: true, title: 'Not Supported', message: 'Browser does not support notifications.', type: 'error' });
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setModalState({ isOpen: true, title: 'Permission Denied', message: 'Please enable notification permissions in your browser settings.', type: 'error' });
        return;
      }

      await subscribeUserToPush();
      setModalState({ isOpen: true, title: 'Subscribed!', message: 'You will now receive notifications even when the app is closed.', type: 'success' });
    } catch (error) {
      console.error(error);
      setModalState({ isOpen: true, title: 'Error', message: 'Failed to subscribe to notifications.', type: 'error' });
    } finally {
      setNotifStatus({ type: '', msg: '' });
    }
  };



  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };



  const SectionHeader = ({ title, sectionKey, icon: Icon, colorClass }: { title: string; sectionKey?: string; icon: React.ElementType; colorClass: string }) => (
    <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className={`p-1 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon size={14} className={colorClass} />
        </div>
        <h2 className="text-xs font-extrabold text-gray-800 tracking-tight uppercase">{title}</h2>
      </div>
      {sectionKey && (
        <div className="flex items-center gap-1.5">
          {editingSection === sectionKey ? (
            <>
              <button onClick={() => setEditingSection(null)} className="p-1 rounded-lg bg-gray-100 text-gray-500"><X size={14} /></button>
              <button onClick={handleSave} className="p-1 rounded-lg bg-green-500 text-white shadow-sm"><Check size={14} /></button>
            </>
          ) : (
            <button onClick={() => setEditingSection(sectionKey)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#5a4fcf] text-white text-[10px] font-bold uppercase tracking-tight">
              <Edit2 size={10} /> Edit
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#5a4fcf]"></div></div>;

  if (status === 'authenticated' && session.user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="px-4 pt-4 pb-2">
          {/* Main Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#5a4fcf] rounded-lg flex items-center justify-center shadow-lg">
                <SettingsIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-gray-900 tracking-tight leading-none">Settings</h1>
                <p className="text-[10px] text-gray-500 font-medium">Manage store identity</p>
              </div>
            </div>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#5a4fcf]/10 to-[#7c3aed]/10 border border-gray-100">
              <div className="text-[#5a4fcf] font-bold text-2xl">
                {formData.name ? formData.name.charAt(0).toUpperCase() : session.user.name?.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">{formData.name || session.user.name || 'Store Owner'}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-[11px] text-gray-500 font-bold truncate">{session.user.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* 1. PERSONAL INFO */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader title="Personal" sectionKey="personal" icon={User} colorClass="text-[#5a4fcf]" />
              <div className="px-4 pb-2">
                <SettingsField label="Merchant Name" name="name" value={formData.name} isEditing={editingSection === 'personal'} onChange={handleChange} />
                <SettingsField label="Phone" name="phoneNumber" value={formData.phoneNumber} isEditing={editingSection === 'personal'} onChange={handleChange} type="tel" />
                <SettingsField label="Location" name="address" value={formData.address} isEditing={editingSection === 'personal'} onChange={handleChange} />
              </div>
            </div>

            {/* 2. STORE DETAILS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader title="Store" sectionKey="shop" icon={Store} colorClass="text-emerald-600" />
              <div className="px-4 pb-2">
                <SettingsField label="Store Name" name="shopName" value={formData.shopName} isEditing={editingSection === 'shop'} onChange={handleChange} />
                <SettingsField label="Branch Address" name="shopAddress" value={formData.shopAddress} isEditing={editingSection === 'shop'} onChange={handleChange} />
              </div>
            </div>

            {/* 3. PAYMENT DETAILS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader title="Payment" sectionKey="payment" icon={QrCode} colorClass="text-purple-600" />
              <div className="px-4 pb-2">
                <SettingsField label="Merchant UPI ID" name="merchantUpiId" value={formData.merchantUpiId} isEditing={editingSection === 'payment'} onChange={handleChange} />
              </div>
            </div>



            {/* 4. NOTIFICATIONS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader title="Notifications" icon={Bell} colorClass="text-blue-600" />
              <div className="px-4 py-4 space-y-3">
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                  Enable push notifications to receive updates about your store even when the app is closed.
                </p>
                <button
                  onClick={handleSubscribe}
                  className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-3 rounded-xl font-bold text-sm border border-blue-100 active:scale-95 transition-all hover:bg-blue-100 disabled:opacity-50"
                  disabled={notifStatus.msg !== ''}
                >
                  <Bell size={16} />
                  {notifStatus.msg || "Enable Notifications"}
                </button>
              </div>
            </div>

            {/* 5. DOWNLOADS & ACTIONS */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              <a href="/downloads/billzzylite.apk" download className="group flex items-center justify-between bg-[#5a4fcf] px-4 py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl text-white"><Download size={20} /></div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">NFC BRIDGE APK</h3>
                    <p className="text-[10px] text-white/70 font-medium">Required for NFC Payments</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-white/70" />
              </a>

              <button onClick={() => signOut({ callbackUrl: '/' })} className="group flex items-center justify-between bg-red-600 px-4 py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl text-white"><LogOut size={20} /></div>
                  <p className="text-sm font-bold text-white tracking-tight">Sign Out</p>
                </div>
                <ChevronRight size={18} className="text-white/70" />
              </button>
            </div>
          </div>
        </div>
        <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title} message={modalState.message} type={modalState.type} />
      </div>
    );
  }
  return null;
} 