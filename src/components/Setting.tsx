'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import {
  User,
  Store,
  QrCode,
  Edit2,
  Check,
  X,
  Download,
  LogOut,
  Settings as SettingsIcon,
  ChevronRight,
  Bell
} from 'lucide-react';
import Modal from '@/components/ui/Modal';

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
              <SectionHeader title="Notifications" icon={Bell} colorClass="text-orange-500" />
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Push Alerts</p>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {typeof window !== 'undefined' ? (
                        'Notification' in window ?
                          `Status: ${Notification.permission}` :
                          'Not supported on this browser'
                      ) : 'Checking...'}
                    </p>
                  </div>
                </div>

                {typeof window !== 'undefined' && Notification.permission === 'denied' && (
                  <div className="p-3 bg-red-50 rounded-xl">
                    <p className="text-[10px] text-red-600 font-bold leading-tight">
                      Alerts are blocked in your browser. Click the lock/info icon in the address bar to &quot;Allow&quot; notifications.
                    </p>
                  </div>
                )}
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
        <Modal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
        />
      </div>
    );
  }
  return null;
}