'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { 
  Scan, Trash2, Edit2, Check, X, Filter, 
  ChevronRight, MessageSquare, DollarSign, Nfc, 
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner';
import QRCode from 'react-qr-code';
import { countries } from '@/lib/countries';

// UI Components
import SuccessTick from './ui/SuccessTick';
import CountryCodeSelector from './ui/CountryCodeSelector';

// --- TYPES ---
interface InventoryProduct {
  id: string;
  name: string;
  sellingPrice: number;
  gstRate: number;
  profitPerUnit: number;
  sku?: string;
  stock?: number;
}

interface InventoryService {
  _id: string;
  name: string;
  price: number;
}

interface CartItem {
  id: number;
  productId?: string;
  serviceId?: string;
  name: string;
  quantity: number | '';
  price: number | '';
  gstRate: number;
  profitPerUnit: number;
  isEditing: boolean;
  itemType: 'product' | 'service';
}

interface SuggestionItem {
  id?: string;
  _id?: string;
  name: string;
  itemType: 'product' | 'service';
  sellingPrice?: number;
  price?: number;
  gstRate?: number;
  profitPerUnit?: number;
}

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  showCancel: boolean;
}

// --- HELPERS ---
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(amount);
};

const calculateGstDetails = (sellingPrice: number, gstRate: number) => {
  const price = Number(sellingPrice) || 0;
  const rate = Number(gstRate) || 0;
  const gstAmount = (price * rate) / 100;
  const totalPrice = price + gstAmount;
  return { gstAmount, totalPrice };
};

const getUpdatedCartItem = (item: CartItem, values: Partial<CartItem>, inventory: InventoryProduct[]): CartItem => {
  if (values.quantity !== undefined && item.productId) {
    const p = inventory.find(prod => prod.id === item.productId);
    if (p && Number(values.quantity) > (p.stock ?? 0)) return item;
  }
  return { ...item, ...values };
};

const mergeCartItem = (prev: CartItem[], type: 'product' | 'service', id: string, name: string, price: number, gstRate: number, profit?: number, edit = false): CartItem[] => {
  const isMatch = (i: CartItem) => (type === 'product' ? i.productId === id : i.serviceId === id);
  const existing = prev.find(isMatch);

  if (existing) {
    return prev.map(i => isMatch(i) ? { ...i, quantity: (Number(i.quantity) || 0) + 1 } : i);
  }

  const newItem: CartItem = {
    id: Date.now(),
    itemType: type,
    productId: type === 'product' ? id : undefined,
    serviceId: type === 'service' ? id : undefined,
    name,
    quantity: 1,
    price,
    gstRate,
    profitPerUnit: profit || 0,
    isEditing: edit
  };
  return [newItem, ...prev];
};

// --- SUB-COMPONENTS ---

const Modal = ({ isOpen, onClose, title, children, onConfirm, confirmText = 'OK', showCancel = false }: {
  isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; 
  onConfirm?: () => void; confirmText?: string; showCancel?: boolean;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-[90%] max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-gray-200">
        <div className="flex items-start">
          <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-[#5a4fcf]/10">
            <AlertTriangle className="h-5 w-5 text-[#5a4fcf]" />
          </div>
          <div className="ml-3 text-left">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <div className="mt-1.5 text-gray-600 text-sm">{children}</div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {showCancel && <button onClick={onClose} className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-300">Cancel</button>}
          <button onClick={() => { if (onConfirm) onConfirm(); onClose(); }} className="rounded-lg bg-[#5a4fcf] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#4c42b8]">{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const ScannerSection = ({ scanning, handleScan, setScannerError, scannerError, toggleScanner }: {
  scanning: boolean; handleScan: (results: IDetectedBarcode[]) => void; 
  setScannerError: (error: string) => void; scannerError: string; toggleScanner: () => void;
}) => (
  <div className={`bg-white rounded-xl p-3 shadow-md border border-indigo-100 ${!scanning ? 'hidden' : ''}`}>
    <div className="max-w-sm mx-auto relative rounded-xl overflow-hidden group">
      <Scanner
        onScan={handleScan}
        onError={(error: unknown) => setScannerError(error instanceof Error ? error.message : 'Unknown scanner error')}
        scanDelay={300}
        paused={!scanning}
        styles={{ container: { width: '100%', height: 180, borderRadius: '12px', overflow: 'hidden' } }}
      />
      <div className="absolute inset-0 pointer-events-none z-10">
        <motion.div
          animate={{ top: ["5%", "95%", "5%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.8),0_0_5px_rgba(79,70,229,1)]"
        />
      </div>
    </div>
    {scannerError && <p className="text-center text-xs text-red-500 mt-2">{scannerError}</p>}
    <button onClick={toggleScanner} className="w-full mt-3 flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-semibold hover:bg-red-100">
      <X size={16} /> Close Scanner
    </button>
  </div>
);

const SearchSection = ({ 
  productName, setProductName, handleManualAdd, setScanning, 
  searchType, setSearchType, showFilterMenu, setShowFilterMenu, 
  filterMenuRef, suggestionsRef, showSuggestions, suggestions, 
  settingsComplete, checkingSettings, addToCart 
}: {
  productName: string; setProductName: (n: string) => void; handleManualAdd: () => void; 
  setScanning: (s: boolean) => void; searchType: 'all' | 'product' | 'service'; 
  setSearchType: (t: 'all' | 'product' | 'service') => void; showFilterMenu: boolean; 
  setShowFilterMenu: (s: boolean) => void; filterMenuRef: React.RefObject<HTMLDivElement | null>; 
  suggestionsRef: React.RefObject<HTMLDivElement | null>; showSuggestions: boolean; 
  suggestions: SuggestionItem[]; settingsComplete: boolean; checkingSettings: boolean; 
  addToCart: (t: 'product' | 'service', id: string, name: string, price: number, gst: number, profit: number, edit?: boolean) => void;
}) => (
  <div className="bg-white rounded-xl p-3 shadow-md border border-gray-200">
    <div className="flex gap-2">
      <div ref={suggestionsRef} className="relative flex-1">
        <div className="relative">
          <input 
            type="text" 
            placeholder={checkingSettings ? "Checking settings..." : settingsComplete ? `Search in ${searchType === 'all' ? 'Inventory' : searchType + 's'}...` : "Required to add items"} 
            className="w-full rounded-lg border-2 border-gray-300 p-2.5 pr-10 text-sm focus:ring-2 focus:ring-[#5a4fcf] focus:border-[#5a4fcf] outline-none transition-all" 
            value={productName} 
            onChange={(e) => setProductName(e.target.value)} 
            onClick={() => setScanning(false)} 
            onKeyPress={(e) => { if (e.key === 'Enter') handleManualAdd(); }} 
            disabled={checkingSettings || !settingsComplete} 
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 font-bold" ref={filterMenuRef}>
            <button onClick={() => setShowFilterMenu(!showFilterMenu)} className="w-8 h-8 rounded-md bg-[#5a4fcf] text-white flex items-center justify-center text-xs">
              {searchType === 'product' ? 'P' : searchType === 'service' ? 'S' : <Filter size={16} />}
            </button>
            <AnimatePresence>
              {showFilterMenu && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-full mt-2 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-[60] overflow-hidden">
                  {(['all', 'product', 'service'] as const).map((type) => (
                    <button key={type} onClick={() => { setSearchType(type); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase ${searchType === type ? 'bg-indigo-50 text-[#5a4fcf]' : 'text-gray-500 hover:bg-gray-50'}`}>{type === 'all' ? 'All Items' : type + 's'}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {showSuggestions && settingsComplete && (
          <div className="absolute z-10 mt-2 w-full rounded-xl border-2 border-[#5a4fcf] bg-white shadow-xl max-h-48 overflow-y-auto">
            {suggestions.map((s) => {
              const isProduct = s.itemType === 'product';
              const id = (isProduct ? s.id : s._id) || '';
              const price = (isProduct ? s.sellingPrice : s.price) || 0;
              return (
                <div key={id} onClick={() => addToCart(s.itemType, id, s.name, price, s.gstRate || 0, s.profitPerUnit || 0)} className="cursor-pointer border-b border-gray-100 p-3 hover:bg-indigo-50 transition-colors last:border-b-0 text-xs flex justify-between items-center">
                  <div className="flex flex-col"><span className="font-semibold">{s.name}</span><span className="text-[9px] uppercase text-gray-400">{s.itemType}</span></div>
                  <span className="text-[#5a4fcf] font-bold">{formatCurrency(price)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
);

const CartItemRow = ({ item, updateCartItem, toggleEdit, deleteCartItem }: {
  item: CartItem; updateCartItem: (id: number, v: Partial<CartItem>) => void; 
  toggleEdit: (id: number) => void; deleteCartItem: (id: number) => void;
}) => {
  const { totalPrice } = calculateGstDetails(Number(item.price) || 0, item.gstRate);
  return (
    <div className={`rounded-lg p-2.5 border transition-all ${item.isEditing ? 'bg-indigo-50 border-[#5a4fcf]' : 'bg-white border-gray-200'}`}>
      {item.isEditing ? (
        <div className="flex flex-col gap-2">
          <input type="text" value={item.name} onChange={(e) => updateCartItem(item.id, { name: e.target.value })} className="w-full px-2 py-1.5 rounded-md border text-sm" />
          <div className="flex items-center gap-2">
            <input type="number" value={item.quantity} onChange={(e) => updateCartItem(item.id, { quantity: e.target.value === '' ? '' : Number.parseInt(e.target.value, 10) })} className="w-16 px-2 py-1.5 rounded-md border text-sm" />
            <input type="number" value={item.price} onChange={(e) => updateCartItem(item.id, { price: e.target.value === '' ? '' : Number.parseFloat(e.target.value) })} className="flex-1 px-2 py-1.5 rounded-md border text-sm" />
            <button onClick={() => toggleEdit(item.id)} className="p-1.5 rounded-md bg-[#5a4fcf] text-white"><Check size={16} /></button>
            <button onClick={() => deleteCartItem(item.id)} className="p-1.5 rounded-md bg-red-100 text-red-500"><Trash2 size={16} /></button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center text-xs">
          <div className="flex-1 truncate"><p className="font-bold">{item.name}</p><p className="text-gray-500">Qty: {item.quantity} × {formatCurrency(totalPrice)}</p></div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#5a4fcf]">{formatCurrency(totalPrice * (Number(item.quantity) || 0))}</span>
            <button onClick={() => toggleEdit(item.id)} className="p-1 text-gray-600"><Edit2 size={12} /></button>
            <button onClick={() => deleteCartItem(item.id)} className="p-1 text-red-500"><Trash2 size={12} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

const CashModal = ({ 
  totalAmount, amountGiven, setAmountGiven, balance, 
  handlePaymentSuccess, setIsCashModalOpen, isCreatingLink, isMessaging 
}: {
  totalAmount: number; amountGiven: number | ''; setAmountGiven: (v: number | '') => void; 
  balance: number; handlePaymentSuccess: (nfc?: boolean) => void; setIsCashModalOpen: (o: boolean) => void; 
  isCreatingLink: boolean; isMessaging: boolean;
}) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="relative w-[95%] max-w-md bg-white rounded-[32px] p-8">
      <div className="flex justify-between items-start mb-6">
        <div><h3 className="text-2xl font-black text-gray-900">Cash Payment</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Accept cash from customer</p></div>
        <button onClick={() => setIsCashModalOpen(false)} className="p-2 rounded-full bg-slate-50 text-slate-400"><X size={20} /></button>
      </div>
      <div className="bg-slate-50 rounded-[24px] p-6 mb-6 flex flex-col items-center">
        <span className="text-[10px] font-black text-slate-400 mb-1 uppercase">TOTAL : {formatCurrency(totalAmount)}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">GIVEN</label>
          <input type="number" value={amountGiven} onChange={(e) => setAmountGiven(e.target.value === '' ? '' : Number.parseFloat(e.target.value))} className="w-full rounded-2xl border-2 p-4 text-xl font-black outline-none focus:border-[#5a4fcf]" autoFocus />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">CHANGE</label>
          <div className={`w-full h-[62px] rounded-2xl flex items-center justify-center border-2 ${balance < 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'} font-black text-xl`}>{formatCurrency(balance)}</div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => handlePaymentSuccess(true)} disabled={isCreatingLink || isMessaging} className="flex-[0.35] h-[56px] rounded-full bg-slate-50 text-[#5a4fcf] font-black flex items-center justify-center gap-2 border border-slate-100">
          {isCreatingLink ? <div className="h-5 animate-spin rounded-full border-2 border-[#5a4fcf] border-t-transparent"></div> : <><Nfc size={20} /><span className="text-xs uppercase font-black">NFC</span></>}
        </button>
        <button onClick={() => handlePaymentSuccess(false)} disabled={isMessaging || isCreatingLink || (amountGiven !== '' && amountGiven < totalAmount)} className="flex-1 h-[56px] rounded-full bg-green-600 font-black text-white">
          {isMessaging ? <div className="h-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : 'CONFIRM CASH'}
        </button>
      </div>
    </div>
  </div>
);

const QRModal = ({ 
  upiQR, totalAmount, merchantUpi, handlePaymentSuccess, 
  setIsQRModalOpen, isCreatingLink, isMessaging 
}: {
  upiQR: string; totalAmount: number; merchantUpi: string; 
  handlePaymentSuccess: (nfc?: boolean) => void; setIsQRModalOpen: (o: boolean) => void; 
  isCreatingLink: boolean; isMessaging: boolean;
}) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="relative w-[95%] max-w-md bg-white rounded-[32px] p-8">
      <div className="flex justify-between items-start mb-6">
        <div><h3 className="text-2xl font-black text-gray-900">Scan to Pay</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Customer scans QR code</p></div>
        <button onClick={() => setIsQRModalOpen(false)} className="p-2 rounded-full bg-slate-50 text-slate-400"><X size={20} /></button>
      </div>
      {upiQR ? (
        <div className="flex flex-col items-center">
          <div className="bg-slate-50 rounded-[32px] p-6 mb-4 flex flex-col items-center w-full border">
            <div className="bg-white p-4 rounded-[24px] shadow-sm mb-2"><QRCode value={upiQR} size={150} /></div>
            <p className="text-[#5a4fcf] font-black text-xs select-all">{merchantUpi}</p>
          </div>
          <p className="text-2xl font-black mb-6">{formatCurrency(totalAmount)}</p>
          <div className="flex w-full gap-3">
            <button onClick={() => handlePaymentSuccess(true)} disabled={isCreatingLink || isMessaging} className="flex-[0.35] h-[56px] rounded-full bg-slate-50 text-[#5a4fcf] font-black flex items-center justify-center gap-2 border border-slate-100">
              {isCreatingLink ? <div className="h-5 animate-spin rounded-full border-2 border-[#5a4fcf] border-t-transparent"></div> : <><Nfc size={20} /><span className="text-xs uppercase font-black">NFC</span></>}
            </button>
            <button onClick={() => handlePaymentSuccess(false)} disabled={isMessaging || isCreatingLink} className="flex-1 h-[56px] rounded-full bg-[#5a4fcf] font-black text-white">
              {isMessaging ? <div className="h-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : 'COLLECT PAYMENT'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center p-8 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-widest border border-red-100 rounded-2xl">UPI ID not configured</div>
      )}
    </div>
  </div>
);

// --- HOOKS ---

function useBillingSettings() {
  const { data: session, status } = useSession();
  const [merchantUpi, setMerchantUpi] = React.useState('');
  const [merchantName, setMerchantName] = React.useState('Billzzy Lite');
  const [settingsComplete, setSettingsComplete] = React.useState(false);
  const [checkingSettings, setCheckingSettings] = React.useState(true);
  const [customerCountryCode, setCustomerCountryCode] = React.useState('IN');

  const checkPhoneNumber = React.useCallback(async () => {
    if (status === 'loading') return;
    if (status === 'authenticated' && session?.user?.email) {
      try {
        const res = await fetch('/api/users/settings');
        if (res.ok) {
          const data = await res.json();
          const localData = {
            phoneNumber: data.phoneNumber || '',
            shopName: data.shopName || '',
            merchantUpiId: data.merchantUpiId || '',
          };
          localStorage.setItem(`userSettings-${session.user.email}`, JSON.stringify(localData));
          if (localData.phoneNumber) {
            setSettingsComplete(true);
            setMerchantUpi(localData.merchantUpiId);
            setMerchantName(localData.shopName || 'Billzzy Lite');
            setCustomerCountryCode(data.defaultCountryCode || 'IN');
          } else setSettingsComplete(false);
        }
      } catch (e) { console.error("Settings fetch error", e); } finally { setCheckingSettings(false); }
    } else if (status === 'unauthenticated') setCheckingSettings(false);
  }, [status, session]);

  React.useLayoutEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      const savedData = localStorage.getItem(`userSettings-${session.user.email}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.phoneNumber) {
            setSettingsComplete(true);
            setMerchantUpi(parsed.merchantUpiId || '');
            setMerchantName(parsed.shopName || 'Billzzy Lite');
            setCheckingSettings(false);
          }
        } catch (e) { console.error("Local settings error", e); }
      }
    }
  }, [status, session]);

  React.useEffect(() => { checkPhoneNumber(); }, [checkPhoneNumber]);

  return { merchantUpi, merchantName, settingsComplete, checkingSettings, customerCountryCode, setCustomerCountryCode, checkPhoneNumber };
}

function useInventoryData(status: string, productName: string, searchType: 'all' | 'product' | 'service') {
  const [inventory, setInventory] = React.useState<InventoryProduct[]>([]);
  const [services, setServices] = React.useState<InventoryService[]>([]);
  const [suggestions, setSuggestions] = React.useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  React.useEffect(() => {
    if (status !== 'authenticated') return;
    (async () => {
      try {
        const [prodRes, servRes] = await Promise.all([fetch('/api/products'), fetch('/api/services')]);
        if (prodRes.ok) {
          const data: InventoryProduct[] = await prodRes.json();
          setInventory(data.map((p: InventoryProduct & { _id?: string; quantity?: number }) => ({ 
            ...p, 
            id: p.id || p._id || '', 
            stock: p.stock ?? p.quantity ?? 0,
            gstRate: p.gstRate || 0 
          })));
        }
        if (servRes.ok) setServices(await servRes.json());
      } catch (err) { console.error("Fetch error", err); }
    })();
  }, [status]);

  React.useEffect(() => {
    if (!productName.trim()) { setShowSuggestions(false); return; }
    const query = productName.trim().toLowerCase();
    const prodFiltered = (searchType === 'all' || searchType === 'product') ? inventory.filter(p => p.name.toLowerCase().includes(query) || (p.sku && p.sku.toLowerCase().includes(query))).map(p => ({ ...p, itemType: 'product' as const })) : [];
    const servFiltered = (searchType === 'all' || searchType === 'service') ? services.filter(s => s.name.toLowerCase().includes(query)).map(s => ({ ...s, itemType: 'service' as const })) : [];
    const combined = [...prodFiltered, ...servFiltered].slice(0, 8);
    setSuggestions(combined); setShowSuggestions(combined.length > 0);
  }, [productName, inventory, services, searchType]);

  return { inventory, suggestions, showSuggestions, setShowSuggestions };
}

function useCart(inventory: InventoryProduct[], setModal: (modal: ModalState) => void) {
  const [cart, setCart] = React.useState<CartItem[]>([]);  const addToCart = React.useCallback((type: 'product' | 'service', id: string, name: string, price: number, gstRate: number, profit?: number, edit = false) => {
    if (!name || price < 0) return;
    if (type === 'product') {
      const p = inventory.find(i => i.id === id);
      const inCart = cart.find(i => i.productId === id);
      if (p && (inCart ? Number(inCart.quantity) || 0 : 0) + 1 > (p.stock ?? 0)) {
        setModal({ isOpen: true, title: 'Out of Stock', message: `Only ${p.stock ?? 0} available for "${name}".`, confirmText: 'OK', showCancel: false });
        return;
      }
    }
    setCart(prev => mergeCartItem(prev, type, id, name, price, gstRate, profit, edit));
  }, [inventory, cart, setModal]);

  const deleteCartItem = (id: number) => setCart(prev => prev.filter(i => i.id !== id));
  const toggleEdit = (id: number) => setCart(prev => prev.map(i => i.id === id ? { ...i, isEditing: !i.isEditing } : { ...i, isEditing: false }));
  const updateCartItem = (id: number, values: Partial<CartItem>) => {
    setCart(prev => prev.map(i => i.id === id ? getUpdatedCartItem(i, values, inventory) : i));
  };

  return { cart, setCart, addToCart, deleteCartItem, toggleEdit, updateCartItem };
}

function useWhatsAppMessaging(cart: CartItem[], totalAmount: number, discount: number, merchantName: string, customerCountryCode: string) {
  const sendWhatsApp = React.useCallback(async (phone: string, type: string) => {
    if (!phone.trim() || phone.length < 7) return false;
    try {
      const dialCode = countries.find(c => c.code === customerCountryCode)?.dialCode?.replaceAll('+', '') || '91';
      const cleanPhone = phone.replaceAll(/\D/g, '');
      const formatted = cleanPhone.startsWith(dialCode) ? cleanPhone : `${dialCode}${cleanPhone}`;
      const items = cart.map(i => `${i.name} (x${i.quantity})`).join(', ');
      const template = type === 'qrPayment' ? 'payment_receipt_upii' : (type === 'cardPayment' ? 'payment_receipt_card' : 'payment_receipt_cashh');
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to: formatted, type: 'template',
          template: { name: template, language: { code: 'en' }, components: [{ type: 'body', parameters: [`INV-${Date.now().toString().slice(-6)}`, merchantName, `₹${totalAmount.toFixed(2)}`, items.length > 500 ? items.slice(0, 497) + '...' : items, `₹${discount.toFixed(2)}`].map(t => ({ type: 'text', text: t })) }] }
        })
      });
      return res.ok;
    } catch { return false; }
  }, [cart, totalAmount, discount, merchantName, customerCountryCode]);
  return { sendWhatsApp };
}
async function updateInventoryStock(cart: CartItem[]) {
  const products = cart.filter(i => i.productId);
  await Promise.all(products.map(i =>
    fetch(`/api/products/${i.productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantityToDecrement: i.quantity })
    })
  ));
}

async function saveCustomerData(name: string, phone: string) {
  if (name.trim() && phone.trim()) {
    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phoneNumber: phone.trim() })
      });
    } catch (e) {
      console.error("Failed to save customer data", e);
    }
  }
}

async function processNfcPayment(cart: CartItem[], totalAmount: number, paymentMethod: string, profit: number) {
  const res = await fetch('/api/nfc-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cart, totalAmount, paymentMethod, profit })
  });
  const data = await res.json();
  if (data.success && data.orderId) {
    window.location.href = `intent://nfc/${data.orderId}#Intent;scheme=billzzylite;package=com.billzzylite.bridge;end`;
  }
}

async function processStandardPayment(
  cart: CartItem[], totalAmount: number, paymentMethod: string, profit: number,
  phone: string, name: string, merchantName: string, discount: number,
  sendWhatsApp: (p: string, t: string) => Promise<boolean>
) {
  const res = await fetch('/api/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: totalAmount, paymentMethod, profit, items: cart, customerPhone: phone, customerName: name, merchantName, discount })
  });

  if (res.ok && phone.trim()) {
    const whatsappType = paymentMethod === 'qr-code' ? 'qrPayment' : (paymentMethod === 'card' ? 'cardPayment' : 'cashPayment');
    await sendWhatsApp(phone, whatsappType);
  }
}

function usePaymentFlow(args: {
  cart: CartItem[]; totalAmount: number; discount: number; merchantName: string; payment: string; phone: string; name: string;
  sendWhatsApp: (p: string, t: string) => Promise<boolean>; setAnim: (s: boolean) => void; setModal: (m: ModalState) => void; setCashOpen: (o: boolean) => void; setQrOpen: (o: boolean) => void;
}) {
  const [state, setState] = React.useState({ isMessaging: false, isCreatingLink: false });
  const handlePaymentSuccess = React.useCallback(async (useNfc = false) => {
    setState({ isMessaging: !useNfc, isCreatingLink: useNfc });
    try {
      const safeCart = args.cart.map(i => ({ ...i, quantity: Number(i.quantity) || 0, price: Number(i.price) || 0 }));
      const profit = safeCart.reduce((s, i) => s + ((i.profitPerUnit || 0) * (Number(i.quantity) || 0)), 0);

      await updateInventoryStock(safeCart);
      await saveCustomerData(args.name, args.phone);

      if (useNfc) {
        await processNfcPayment(safeCart, args.totalAmount, args.payment, profit);
      } else {
        await processStandardPayment(safeCart, args.totalAmount, args.payment, profit, args.phone, args.name, args.merchantName, args.discount, args.sendWhatsApp);
      }

      args.setCashOpen(false);
      args.setQrOpen(false);
      args.setAnim(true);
    } catch {
      args.setModal({ isOpen: true, title: 'Error', message: 'Transaction failed.', confirmText: 'OK', showCancel: false });
    } finally {
      setState({ isMessaging: false, isCreatingLink: false });
    }
  }, [args]);
  return { ...state, handlePaymentSuccess };
}

// --- MAIN COMPONENT ---
export default function BillingPage() {
  const { status } = useSession();
  const { merchantUpi, merchantName, settingsComplete, checkingSettings, customerCountryCode, setCustomerCountryCode, checkPhoneNumber } = useBillingSettings();
  const [modal, setModal] = React.useState<ModalState>({ isOpen: false, title: '', message: '', confirmText: 'OK', showCancel: false });
  const [showSuccessAnimation, setShowSuccessAnimation] = React.useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = React.useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = React.useState(false);
  const [productName, setProductName] = React.useState('');
  const [searchType, setSearchType] = React.useState<'all' | 'product' | 'service'>('all');
  const [showFilterMenu, setShowFilterMenu] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [scannerError, setScannerError] = React.useState('');
  const [hasOpenedScanner, setHasOpenedScanner] = React.useState(false);

  const filterMenuRef = React.useRef<HTMLDivElement>(null);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  const { inventory, suggestions, showSuggestions, setShowSuggestions } = useInventoryData(status, productName, searchType);
  const { cart, setCart, addToCart, deleteCartItem, toggleEdit, updateCartItem } = useCart(inventory, setModal);
  const [whatsAppNumber, setWhatsAppNumber] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [discountInput, setDiscountInput] = React.useState('');
  const [discountType, setDiscountType] = React.useState<'percentage' | 'fixed'>('percentage');
  const [showWhatsAppShare, setShowWhatsAppShare] = React.useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState('');
  const [amountGiven, setAmountGiven] = React.useState<number | ''>('');

  const subtotal = React.useMemo(() => cart.reduce((s, i) => s + calculateGstDetails(Number(i.price) || 0, i.gstRate).totalPrice * (Number(i.quantity) || 0), 0), [cart]);
  const { discountAmount, totalAmount } = React.useMemo(() => {
    const val = parseFloat(discountInput) || 0;
    const calculated = discountType === 'percentage' ? (subtotal * val) / 100 : Math.min(val, subtotal);
    return { discountAmount: calculated, totalAmount: Math.max(0, subtotal - calculated) };
  }, [subtotal, discountInput, discountType]);
  const balance = React.useMemo(() => (Number(amountGiven) || 0) > 0 ? (Number(amountGiven) || 0) - totalAmount : 0, [totalAmount, amountGiven]);

  const { sendWhatsApp } = useWhatsAppMessaging(cart, totalAmount, discountAmount, merchantName, customerCountryCode);
  const { isMessaging, isCreatingLink, handlePaymentSuccess } = usePaymentFlow({ 
    cart, totalAmount, discount: discountAmount, merchantName, payment: selectedPayment, phone: whatsAppNumber, name: customerName, 
    sendWhatsApp, setAnim: setShowSuccessAnimation, setModal, setCashOpen: setIsCashModalOpen, setQrOpen: setIsQRModalOpen 
  });

  const handleScan = React.useCallback((res: IDetectedBarcode[]) => {
    if (res && res[0]) {
      const val = res[0].rawValue;
      const f = inventory.find(p => p.id === val || p.sku?.toLowerCase() === val.toLowerCase() || p.name.toLowerCase() === val.toLowerCase());
      addToCart('product', f ? f.id : `custom-${Date.now()}`, f ? f.name : val, f ? f.sellingPrice : 0, f ? f.gstRate : 0, f ? f.profitPerUnit : 0, !f);
      setScanning(false);
    }
  }, [inventory, addToCart]);

  const resetAll = React.useCallback(() => {
    setCart([]); setSelectedPayment(''); setShowWhatsAppShare(false); setShowPaymentOptions(false);
    setWhatsAppNumber(''); checkPhoneNumber(); setCustomerName(''); setAmountGiven(''); setDiscountInput('');
  }, [setCart, checkPhoneNumber]);

  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false);
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) setShowFilterMenu(false);
    };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [setShowSuggestions]);

  return (
    <>
      {showSuccessAnimation && <SuccessTick onComplete={() => { setShowSuccessAnimation(false); resetAll(); }} amount={totalAmount} />}
      <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
        {!checkingSettings && !settingsComplete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-[90%] max-w-md bg-white rounded-2xl p-5 shadow-2xl border flex flex-col gap-4">
              <div className="flex items-center gap-3"><AlertTriangle className="text-[#5a4fcf]" /> <span className="font-bold">Settings Incomplete</span></div>
              <p className="text-sm text-gray-600">Please add your phone number in settings to start billing.</p>
              <button onClick={() => window.location.assign('/settings')} className="bg-[#5a4fcf] text-white py-2 rounded-lg font-bold">Go to Settings</button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {hasOpenedScanner && <ScannerSection scanning={scanning} handleScan={handleScan} setScannerError={setScannerError} scannerError={scannerError} toggleScanner={() => setScanning(!scanning)} />}
          <SearchSection productName={productName} setProductName={setProductName} handleManualAdd={() => { if (productName) addToCart('product', `manual-${Date.now()}`, productName, 0, 0, 0, true); setProductName(''); }} setScanning={setScanning} searchType={searchType} setSearchType={setSearchType} showFilterMenu={showFilterMenu} setShowFilterMenu={setShowFilterMenu} filterMenuRef={filterMenuRef} suggestionsRef={suggestionsRef} showSuggestions={showSuggestions} suggestions={suggestions} settingsComplete={settingsComplete} checkingSettings={checkingSettings} addToCart={addToCart} />
          {!scanning && settingsComplete && cart.length === 0 && <button onClick={() => { setScanning(true); setHasOpenedScanner(true); }} className="w-full bg-indigo-50 text-[#5a4fcf] py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2"><Scan size={14} /> Scan Barcode</button>}
          {cart.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100 flex flex-col items-center gap-2">
              <span className="text-4xl">{checkingSettings ? '🔄' : '🛒'}</span>
              <p className="font-bold text-gray-600">{checkingSettings ? 'Checking Settings...' : 'Cart is Empty'}</p>
            </div>
          ) : (
            <div className="space-y-2">{cart.map(i => <CartItemRow key={i.id} item={i} updateCartItem={updateCartItem} toggleEdit={toggleEdit} deleteCartItem={deleteCartItem} />)}</div>
          )}
        </div>
        <div className="bg-white border-t p-2 space-y-2">
          <div className={`flex rounded-lg border bg-gray-50 overflow-hidden ${cart.length === 0 ? 'opacity-50' : ''}`}>
            <input type="number" placeholder="Discount" value={discountInput} onChange={e => setDiscountInput(e.target.value)} className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
            <button onClick={() => setDiscountType(discountType === 'percentage' ? 'fixed' : 'percentage')} className="bg-[#5a4fcf] text-white px-4 text-xs font-black">{discountType === 'percentage' ? '%' : '₹'}</button>
          </div>
          <div className="px-1 text-[10px] font-bold text-gray-400 flex flex-col gap-1">
            <div className="flex justify-between uppercase"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
            <div className="flex justify-between text-gray-900 text-sm font-black pt-1"><span>Total</span><span className="text-[#5a4fcf]">{formatCurrency(totalAmount)}</span></div>
          </div>
          {!showWhatsAppShare && !showPaymentOptions && (
            <button onClick={() => setShowWhatsAppShare(true)} disabled={cart.length === 0} className="w-full bg-[#5a4fcf] text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 disabled:bg-gray-200">Proceed to Payment <ChevronRight size={14} /></button>
          )}
          {showWhatsAppShare && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex gap-2"><div className="w-20"><CountryCodeSelector selectedCountryCode={customerCountryCode} onSelect={c => setCustomerCountryCode(c.code)} /></div><input type="tel" value={whatsAppNumber} onChange={e => setWhatsAppNumber(e.target.value)} placeholder="Phone Number" className="flex-1 rounded-lg border p-2 text-xs" /></div>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Name (Optional)" className="w-full rounded-lg border p-2 text-xs" />
              <button onClick={() => { setShowWhatsAppShare(false); setShowPaymentOptions(true); }} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2"><MessageSquare size={16} /> Continue</button>
            </div>
          )}
          {showPaymentOptions && (
            <div className="grid grid-cols-2 gap-2 animate-in fade-in">
              <button onClick={() => { setSelectedPayment('cash'); setIsCashModalOpen(true); }} className="bg-white border rounded-lg py-3 flex items-center justify-center gap-2 font-bold text-xs"><DollarSign size={16} /> Cash</button>
              <button onClick={() => { setSelectedPayment('qr-code'); setIsQRModalOpen(true); }} className="bg-white border rounded-lg py-3 flex items-center justify-center gap-2 font-bold text-xs"><Scan size={16} /> QR</button>
            </div>
          )}
        </div>
      </div>
      {isCashModalOpen && <CashModal totalAmount={totalAmount} amountGiven={amountGiven} setAmountGiven={setAmountGiven} balance={balance} handlePaymentSuccess={handlePaymentSuccess} setIsCashModalOpen={setIsCashModalOpen} isCreatingLink={isCreatingLink} isMessaging={isMessaging} />}
      {isQRModalOpen && <QRModal upiQR={merchantUpi ? `upi://pay?pa=${merchantUpi}&pn=${encodeURIComponent(merchantName)}&am=${totalAmount.toFixed(2)}&cu=INR` : ''} totalAmount={totalAmount} merchantUpi={merchantUpi} handlePaymentSuccess={handlePaymentSuccess} setIsQRModalOpen={setIsQRModalOpen} isCreatingLink={isCreatingLink} isMessaging={isMessaging} />}
      <Modal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} title={modal.title} confirmText={modal.confirmText} showCancel={modal.showCancel}>{modal.message}</Modal>
    </>
  );
}
