'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner';
import QRCode from 'react-qr-code';
import {
  Scan, Trash2, Edit2, Check, X, AlertTriangle,
  CheckCircle,
  ChevronRight,
  DollarSign, MessageSquare,
  Nfc, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SuccessTick from './ui/SuccessTick';
import CountryCodeSelector from './ui/CountryCodeSelector';
import { countries } from '@/lib/countries';

// --- HELPER FUNCTIONS ---
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

// --- TYPE DEFINITIONS ---
type CartItem = {
  id: number;
  type: 'product' | 'service';
  productId?: string;
  serviceId?: string;
  name: string;
  quantity: number | '';
  price: number | '';
  gstRate: number;
  profitPerUnit?: number;
  isEditing?: boolean;
};

type InventoryService = {
  _id: string;
  name: string;
  price: number;
  duration?: string;
  category?: string;
};

type InventoryProduct = {
  id: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  gstRate: number;
  image?: string;
  sku?: string;
  profitPerUnit?: number;
};

// --- MODAL COMPONENT ---
type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  showCancel?: boolean;
};

const Modal = ({ isOpen, onClose, title, children, onConfirm, confirmText = 'OK', showCancel = false }: ModalProps) => {
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

// --- MAIN BILLING COMPONENT ---
export default function BillingPage() {
  const { data: session, status } = useSession();
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [productName, setProductName] = React.useState('');
  const [scanning, setScanning] = React.useState(false);
  const [inventory, setInventory] = React.useState<InventoryProduct[]>([]);
  const [services, setServices] = React.useState<InventoryService[]>([]);
  const [suggestions, setSuggestions] = React.useState<((InventoryProduct | InventoryService) & { itemType: 'product' | 'service' })[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = React.useState(false);
  const [searchType, setSearchType] = React.useState<'all' | 'product' | 'service'>('all');
  const [showFilterMenu, setShowFilterMenu] = React.useState(false);
  const filterMenuRef = React.useRef<HTMLDivElement>(null);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  // States for flow
  const [showWhatsAppSharePanel, setShowWhatsAppSharePanel] = React.useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = React.useState(false);

  // This state holds 'cash' or 'qr-code' depending on which tab is open
  const [selectedPayment, setSelectedPayment] = React.useState<string>('');
  const [isCashModalOpen, setIsCashModalOpen] = React.useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = React.useState(false);

  // Data states
  const [merchantUpi, setMerchantUpi] = React.useState('');
  const [merchantName, setMerchantName] = React.useState('Billzzy Lite');
  const [whatsAppNumber, setWhatsAppNumber] = React.useState('');
  const [customerCountryCode, setCustomerCountryCode] = React.useState('IN');
  const [customerName, setCustomerName] = React.useState('');
  const [amountGiven, setAmountGiven] = React.useState<number | ''>('');

  const [settingsComplete, setSettingsComplete] = React.useState(false);
  const [checkingSettings, setCheckingSettings] = React.useState(true);

  // Sync state with LocalStorage immediately on mount (before even first render if possible, but inside component for access to session)
  React.useLayoutEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      const savedData = localStorage.getItem(`userSettings-${session.user.email}`);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          const sessionPhoneNumber = (session.user as { phoneNumber?: string | null }).phoneNumber || '';
          const phoneNumber = parsedData.phoneNumber || sessionPhoneNumber || '';
          if (phoneNumber && phoneNumber.trim() !== '' && /^\d{10,15}$/.test(phoneNumber)) {
            setSettingsComplete(true);
            setMerchantUpi(parsedData.merchantUpiId || '');
            setMerchantName(parsedData.shopName || 'Billzzy Lite');
            setCheckingSettings(false);
          }
        } catch (e) {
          console.error("Error parsing local settings", e);
        }
      }
    }
  }, [status, session]);

  // Loading states
  const [isMessaging, setIsMessaging] = React.useState(false); // For WhatsApp/DB Save
  const [isCreatingLink, setIsCreatingLink] = React.useState(false); // For NFC
  const [hasOpenedScanner, setHasOpenedScanner] = React.useState(false);

  const [scannerError, setScannerError] = React.useState<string>('');
  const [modal, setModal] = React.useState<{ isOpen: boolean; title: string; message: string | React.ReactNode; onConfirm?: (() => void); confirmText: string; showCancel: boolean; }>({ isOpen: false, title: '', message: '', confirmText: 'OK', showCancel: false });

  const [discountInput, setDiscountInput] = React.useState<string>('');
  const [discountType, setDiscountType] = React.useState<'percentage' | 'fixed'>('percentage');

  const subtotal = React.useMemo(() =>
    cart.reduce((sum, item) => {
      const { totalPrice } = calculateGstDetails(Number(item.price) || 0, item.gstRate);
      return sum + totalPrice * (Number(item.quantity) || 0);
    }, 0),
    [cart]
  );

  const { discountAmount, totalAmount } = React.useMemo(() => {
    const discountValue = parseFloat(discountInput) || 0;
    let calculatedDiscount = 0;
    if (discountType === 'percentage' && discountValue > 0) {
      calculatedDiscount = (subtotal * discountValue) / 100;
    } else if (discountType === 'fixed' && discountValue > 0) {
      calculatedDiscount = Math.min(discountValue, subtotal);
    }
    const finalTotal = Math.max(0, subtotal - calculatedDiscount);
    return { discountAmount: calculatedDiscount, totalAmount: finalTotal };
  }, [subtotal, discountInput, discountType]);

  const balance = React.useMemo(() => {
    const total = totalAmount;
    const given = Number(amountGiven);
    return given > 0 ? given - total : 0;
  }, [totalAmount, amountGiven]);

  const upiQR = merchantUpi ? `upi://pay?pa=${merchantUpi}&pn=${encodeURIComponent(merchantName)}&am=${totalAmount.toFixed(2)}&cu=INR&tn=Bill%20Payment` : '';

  // Check Phone Number
  // Check Phone Number & Settings
  const checkPhoneNumber = React.useCallback(async () => {
    if (status === 'loading') return;

    if (status === 'authenticated' && session?.user?.email) {
      // Background Sync (DB Fetch)
      try {
        const res = await fetch('/api/users/settings');
        if (res.ok) {
          const data = await res.json();
          const localData = {
            name: data.name || session.user.name || '',
            phoneNumber: data.phoneNumber || '',
            address: data.address || '',
            shopName: data.shopName || '',
            shopAddress: data.shopAddress || '',
            merchantUpiId: data.merchantUpiId || '',
          };
          localStorage.setItem(`userSettings-${session.user.email}`, JSON.stringify(localData));

          if (localData.phoneNumber) {
            setSettingsComplete(true);
            setMerchantUpi(localData.merchantUpiId);
            setMerchantName(localData.shopName || 'Billzzy Lite');
            setCustomerCountryCode(data.defaultCountryCode || 'IN');
          } else {
            setSettingsComplete(false);
          }
        }
      } catch (e) {
        console.error("Failed to fetch settings from DB", e);
      } finally {
        setCheckingSettings(false);
      }
      return true;
    } else if (status === 'unauthenticated') {
      setCheckingSettings(false);
    }
    return false;
  }, [status, session]);

  React.useEffect(() => { checkPhoneNumber(); }, [checkPhoneNumber]);

  // Inventory & Services Fetch
  React.useEffect(() => {
    if (status !== 'authenticated') return;
    (async () => {
      try {
        const [prodRes, servRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/services')
        ]);

        if (prodRes.ok) {
          const data: InventoryProduct[] = await prodRes.json();
          setInventory(data.map(p => ({ ...p, gstRate: p.gstRate || 0 })));
        }

        if (servRes.ok) {
          const data: InventoryService[] = await servRes.json();
          setServices(data);
        }
      } catch (err) {
        console.error("Failed to fetch inventory/services:", err);
      }
    })();
  }, [status]);

  // Suggestions
  React.useEffect(() => {
    if (!productName.trim()) { setShowSuggestions(false); return; }
    const query = productName.trim().toLowerCase();

    let prodFiltered: ((InventoryProduct | InventoryService) & { itemType: 'product' | 'service' })[] = [];
    let servFiltered: ((InventoryProduct | InventoryService) & { itemType: 'product' | 'service' })[] = [];

    if (searchType === 'all' || searchType === 'product') {
      prodFiltered = inventory
        .filter(p => p.name.toLowerCase().includes(query) || p.sku?.toLowerCase().includes(query))
        .map(p => ({ ...p, itemType: 'product' as const }));
    }

    if (searchType === 'all' || searchType === 'service') {
      servFiltered = services
        .filter(s => s.name.toLowerCase().includes(query))
        .map(s => ({ ...s, itemType: 'service' as const }));
    }

    const combined = [...prodFiltered, ...servFiltered].slice(0, 8);
    setSuggestions(combined);
    setShowSuggestions(combined.length > 0);
  }, [productName, inventory, services, searchType]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // --- WHATSAPP LOGIC ---
  const sendWhatsAppMessage = React.useCallback(async (phoneNumber: string, messageType: string) => {
    if (!phoneNumber.trim() || phoneNumber.length < 7 || phoneNumber.length > 15) { return false; }

    try {
      const dialCode = countries.find(c => c.code === customerCountryCode)?.dialCode || '+91';
      const cleanDialCode = dialCode.replace(/\+/g, '');
      const cleanInput = phoneNumber.replace(/\D/g, '');

      const formattedPhone = cleanInput.startsWith(cleanDialCode) ? cleanInput : `${cleanDialCode}${cleanInput}`;

      const orderId = `INV-${Date.now().toString().slice(-6)}`;
      const itemsListRaw = cart.map((item) => `${item.name} (x${item.quantity})`).join(', ');
      // Truncate itemsList if too long (WhatsApp limits)
      const itemsList = itemsListRaw.length > 500 ? itemsListRaw.substring(0, 497) + "..." : itemsListRaw;

      let templateName = '';
      switch (messageType) {
        case 'cashPayment': templateName = 'payment_receipt_cashh'; break;
        case 'qrPayment': templateName = 'payment_receipt_upii'; break;
        case 'cardPayment': templateName = 'payment_receipt_card'; break;
        default: templateName = 'payment_receipt_cashh';
      }

      const messageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [{ type: 'body', parameters: [orderId, merchantName, `₹${totalAmount.toFixed(2)}`, itemsList, discountAmount > 0 ? `₹${discountAmount.toFixed(2)}` : '₹0.00'].map((text) => ({ type: 'text', text })) }],
        },
      };

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("WhatsApp API Error:", errorData);
      }
      return response.ok;
    } catch (error) {
      console.error("WhatsApp Network Error:", error);
      return false;
    }
  }, [cart, totalAmount, discountAmount, merchantName, customerCountryCode]);

  const sendWhatsAppReceipt = React.useCallback(async (paymentMethod: string) => {
    let templateType = '';
    switch (paymentMethod) {
      case 'cash': templateType = 'cashPayment'; break;
      case 'qr-code': templateType = 'qrPayment'; break;
      case 'card': templateType = 'cardPayment'; break;
      default: templateType = 'cashPayment';
    }
    return await sendWhatsAppMessage(whatsAppNumber, templateType);
  }, [whatsAppNumber, sendWhatsAppMessage]);

  // --- CART ACTIONS ---
  const addToCart = React.useCallback((type: 'product' | 'service', id: string, name: string, price: number, gstRate: number, profitPerUnit?: number, isEditing = false) => {
    if (!name || price < 0) return;

    // Check stock if type is product
    if (type === 'product') {
      const product = inventory.find(p => p.id === id);
      if (product) {
        // Find existing quantity in cart
        const existingItem = cart.find(item => item.productId === id);
        const currentCartQty = existingItem ? (Number(existingItem.quantity) || 0) : 0;

        if (currentCartQty + 1 > product.quantity) {
          setModal({
            isOpen: true,
            title: 'Out of Stock',
            message: `Cannot add more "${name}". Only ${product.quantity} available.`,
            confirmText: 'OK',
            showCancel: false
          });
          return;
        }
      }
    }

    setCart(prev => {
      const existingItem = type === 'product'
        ? prev.find(item => item.productId === id)
        : prev.find(item => item.serviceId === id);

      if (existingItem) {
        return prev.map(item => (type === 'product' ? item.productId === id : item.serviceId === id)
          ? { ...item, quantity: (Number(item.quantity) || 0) + 1 }
          : item);
      }

      return [{ id: Date.now(), type, productId: type === 'product' ? id : undefined, serviceId: type === 'service' ? id : undefined, name, quantity: 1, price, gstRate, profitPerUnit: profitPerUnit || 0, isEditing }, ...prev];
    });
    setProductName('');
    setShowSuggestions(false);
  }, [inventory, cart]);

  const handleScan = React.useCallback((results: IDetectedBarcode[]) => {
    if (results && results[0]) {
      const scannedValue = results[0].rawValue;
      const foundProduct = inventory.find(p => p.id === scannedValue || p.sku?.toLowerCase() === scannedValue.toLowerCase() || p.name.toLowerCase() === scannedValue.toLowerCase());
      if (foundProduct) {
        addToCart('product', foundProduct.id, foundProduct.name, foundProduct.sellingPrice, foundProduct.gstRate, foundProduct.profitPerUnit);
        setScanning(false);
      } else {
        // Fallback for custom item if not found in inventory
        addToCart('product', `custom-${Date.now()}`, scannedValue, 0, 0, 0, true);
        setScanning(false);
      }
    }
  }, [inventory, addToCart]);

  const handleManualAdd = React.useCallback(() => {
    const name = productName.trim();
    if (!name) return;
    addToCart('product', `manual-${Date.now()}`, name, 0, 0, 0, true);
  }, [productName, addToCart]);

  const deleteCartItem = (id: number) => setCart(prev => prev.filter(item => item.id !== id));
  const toggleEdit = (id: number) => setCart(prev => prev.map(item => item.id === id ? { ...item, isEditing: !item.isEditing } : { ...item, isEditing: false }));

  const updateCartItem = (id: number, updatedValues: Partial<CartItem>) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        // If updating quantity, check stock
        if (updatedValues.quantity !== undefined && item.productId) {
          const product = inventory.find(p => p.id === item.productId);
          const newQty = Number(updatedValues.quantity);
          if (product && newQty > product.quantity) return item;
        }
        return { ...item, ...updatedValues };
      }
      return item;
    }));
  };

  const handleTransactionDone = React.useCallback(() => {
    setCart([]);
    setSelectedPayment('');
    setShowWhatsAppSharePanel(false);
    setShowPaymentOptions(false);
    setWhatsAppNumber('');
    // Revert to default country code after transaction
    checkPhoneNumber();
    setCustomerName('');
    setAmountGiven('');
    setDiscountInput('');
    setModal({ ...modal, isOpen: false });
  }, [modal, checkPhoneNumber]);

  const handleProceedToPayment = React.useCallback(async () => {
    if (cart.length === 0) return;
    setShowWhatsAppSharePanel(false);
    setShowPaymentOptions(true);
  }, [cart.length]);

  // --- FINAL PAYMENT HANDLER ---
  const handlePaymentSuccess = React.useCallback(async (useNfc: boolean = false) => {
    if (useNfc) { setIsCreatingLink(true); } else { setIsMessaging(true); }

    try {
      let nfcToken = '';
      const safeCart = cart.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0
      }));

      // 3. Update Inventory (ALWAYS run this for both)
      await Promise.all(safeCart.filter(item => item.productId).map(item =>
        fetch(`/api/products/${item.productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantityToDecrement: item.quantity })
        })
      )).catch(err => console.error("Inventory update failed:", err));

      if (customerName.trim() && whatsAppNumber.trim()) {
        fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: customerName.trim(), phoneNumber: whatsAppNumber.trim() })
        }).catch(err => console.error("Customer save error", err));
      }

      const totalProfit = safeCart.reduce((sum, item) => sum + ((item.profitPerUnit || 0) * item.quantity), 0);

      if (useNfc) {
        const nfcRes = await fetch('/api/nfc-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart: safeCart, totalAmount, paymentMethod: selectedPayment, profit: totalProfit }),
        });
        const nfcData = await nfcRes.json();
        if (nfcData.success && nfcData.orderId) { nfcToken = nfcData.orderId; }
      } else {
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalAmount,
            paymentMethod: selectedPayment,
            profit: totalProfit,
            items: safeCart,
            customerPhone: whatsAppNumber || '',
            customerName,
            merchantName,
            discount: discountAmount
          })
        });

        if (response.ok && whatsAppNumber.trim()) {
          await sendWhatsAppReceipt(selectedPayment);
        }
      }

      if (useNfc && nfcToken) {
        const bridgeUrl = `intent://nfc/${nfcToken}#Intent;scheme=billzzylite;package=com.billzzylite.bridge;end`;
        window.location.href = bridgeUrl;
      }

      setIsCashModalOpen(false);
      setIsQRModalOpen(false);
      setShowSuccessAnimation(true);
    } catch {
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'An error occurred while saving the transaction.',
        confirmText: 'OK',
        showCancel: false
      });
    } finally {
      setIsCreatingLink(false);
      setIsMessaging(false);
    }
  }, [selectedPayment, totalAmount, cart, whatsAppNumber, sendWhatsAppReceipt, customerName, merchantName, discountAmount]);

  const toggleScanner = React.useCallback(() => {
    setScanning(prev => {
      if (!prev) {
        setScannerError('');
        setHasOpenedScanner(true);
      }
      return !prev;
    });
  }, []);

  const onSuccessAnimationComplete = React.useCallback(() => {
    setShowSuccessAnimation(false);
    handleTransactionDone();
  }, [handleTransactionDone]);

  return (
    <>
      {showSuccessAnimation && <SuccessTick onComplete={onSuccessAnimationComplete} amount={totalAmount} />}
      <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
        {!checkingSettings && !settingsComplete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-[90%] max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-gray-200">
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-[#5a4fcf]/10"><AlertTriangle className="h-5 w-5 text-[#5a4fcf]" /></div>
                <div className="ml-3 text-left"><h3 className="text-base font-semibold text-gray-900">Settings Incomplete</h3><div className="mt-1.5 text-gray-600 text-sm"><p>Please fill in your phone number in the settings to proceed with billing.</p></div></div>
              </div>
              <div className="mt-4 flex justify-end"><button onClick={() => { window.location.assign('/settings'); }} className="rounded-lg bg-[#5a4fcf] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#4c42b8]">Go to Settings</button></div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-2 pt-1 pb-3">
          <div className="space-y-2">

            {hasOpenedScanner && (
              <div className={`bg-white rounded-xl p-3 shadow-md border border-indigo-100 ${!scanning ? 'hidden' : ''}`}>
                <div className="max-w-sm mx-auto relative rounded-xl overflow-hidden group">
                  <Scanner
                    onScan={handleScan}
                    onError={(error: unknown) => setScannerError(error instanceof Error ? error.message : 'Unknown scanner error')}
                    scanDelay={300}
                    paused={!scanning}
                    styles={{ container: { width: '100%', height: 180, borderRadius: '12px', overflow: 'hidden' } }}
                  />

                  {/* Modern Scanning Animation Overlay */}
                  <div className="absolute inset-0 pointer-events-none z-10">
                    {/* Scanning Line */}
                    <motion.div
                      animate={{ top: ["5%", "95%", "5%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.8),0_0_5px_rgba(79,70,229,1)]"
                    />

                    {/* Corner Borders */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/80 rounded-tl-sm" />
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/80 rounded-tr-sm" />
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white/80 rounded-bl-sm" />
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/80 rounded-br-sm" />

                    {/* Scanning Grid Pulse (Subtle) */}
                    <motion.div
                      animate={{ opacity: [0.1, 0.2, 0.1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(79,70,229,0.05)_100%)]"
                    />
                  </div>
                </div>
                {scannerError && <p className="text-center text-xs text-red-500 mt-2">{scannerError}</p>}
                <button onClick={toggleScanner} className="w-full mt-3 flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-semibold hover:bg-red-100">
                  <X size={16} /> Close Scanner
                </button>
              </div>
            )}

            <div className="bg-white rounded-xl p-3 shadow-md border border-gray-200">
              <div className="flex gap-2">
                <div ref={suggestionsRef} className="relative flex-1">
                  <div className="relative">
                    <input type="text" placeholder={checkingSettings ? "Checking settings..." : settingsComplete ? `Search in ${searchType === 'all' ? 'Inventory' : searchType + 's'}...` : "Required to add items"} className="w-full rounded-lg border-2 border-gray-300 p-2.5 pr-10 text-sm focus:ring-2 focus:ring-[#5a4fcf] focus:border-[#5a4fcf] outline-none transition-all" value={productName} onChange={(e) => setProductName(e.target.value)} onClick={() => setScanning(false)} onKeyPress={(e) => { if (e.key === 'Enter') { handleManualAdd(); } }} disabled={checkingSettings || !settingsComplete} />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 font-bold" ref={filterMenuRef}>
                      <button onClick={() => setShowFilterMenu(!showFilterMenu)} className={`w-8 h-8 rounded-md transition-all flex items-center justify-center text-xs bg-[#5a4fcf] text-white shadow-sm ring-2 ring-transparent hover:ring-indigo-200`} title="Filter Category">{searchType === 'product' ? 'P' : searchType === 'service' ? 'S' : <Filter size={16} />}</button>
                      <AnimatePresence>
                        {showFilterMenu && (
                          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="absolute right-0 top-full mt-2 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-[60] overflow-hidden">
                            {(['all', 'product', 'service'] as const).map((type) => (
                              <button key={type} onClick={() => { setSearchType(type); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${searchType === type ? 'bg-indigo-50 text-[#5a4fcf]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>{type === 'all' ? 'All Items' : type === 'product' ? 'Products' : 'Services'}</button>
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
                        const id = isProduct ? (s as InventoryProduct).id : (s as InventoryService)._id;
                        const price = isProduct ? (s as InventoryProduct).sellingPrice : (s as InventoryService).price;
                        const type = s.itemType;
                        return (
                          <div key={id} onClick={() => addToCart(type, id, s.name, price, isProduct ? (s as InventoryProduct).gstRate : 0, isProduct ? (s as InventoryProduct).profitPerUnit : 0)} className="cursor-pointer border-b border-gray-100 p-3 hover:bg-indigo-50 transition-colors last:border-b-0">
                            <div className="flex justify-between items-center"><div className="flex flex-col"><span className="font-semibold text-gray-800 text-xs">{s.name}</span><span className="text-[9px] uppercase font-bold text-gray-400">{type}</span></div><span className="text-[#5a4fcf] font-bold text-xs">{formatCurrency(price)}</span></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {!scanning && settingsComplete && (<button onClick={toggleScanner} className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-50 text-[#5a4fcf] py-2 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors"><Scan size={14} /> Scan Barcode</button>)}
            </div>

            {cart.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-md border border-gray-200"><div className="text-5xl mb-3">{checkingSettings ? "🔄" : "🛒"}</div><p className="text-gray-600 font-medium">{checkingSettings ? "Checking Settings..." : settingsComplete ? "Cart is Empty" : "Settings Required"}</p><p className="text-xs text-gray-500 mt-1">{checkingSettings ? "Please wait a moment" : settingsComplete ? "Add items to get started" : "Please complete your settings"}</p></div>
            ) : (
              <div className="space-y-2">{cart.map((item) => {
                const { totalPrice } = calculateGstDetails(Number(item.price) || 0, item.gstRate); return (
                  <div key={item.id} className={`rounded-lg p-2.5 shadow-sm border transition-all ${item.isEditing ? 'bg-indigo-50 border-[#5a4fcf]' : 'bg-white border-gray-200'}`}>
                    {item.isEditing ? (
                      <div className="flex flex-col gap-2"><input type="text" value={item.name} onChange={(e) => updateCartItem(item.id, { name: e.target.value })} className="w-full px-2 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-1 focus:ring-[#5a4fcf] outline-none" placeholder="Item Name" /><div className="flex items-center gap-2"><div className="relative flex-1"><input type="number" value={item.quantity} onChange={(e) => updateCartItem(item.id, { quantity: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} className="w-full px-2 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-1 focus:ring-[#5a4fcf] outline-none text-center" placeholder="Qty" /><span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-gray-400">Qty</span></div><div className="relative flex-[1.5]"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₹</span><input type="number" value={item.price} onChange={(e) => updateCartItem(item.id, { price: e.target.value === '' ? '' : parseFloat(e.target.value) })} className="w-full pl-5 pr-2 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-1 focus:ring-[#5a4fcf] outline-none" placeholder="Price" /></div><button onClick={() => toggleEdit(item.id)} className="p-1.5 rounded-md bg-[#5a4fcf] text-white hover:bg-[#4c42b8]"><Check size={16} /></button><button onClick={() => deleteCartItem(item.id)} className="p-1.5 rounded-md bg-red-100 text-red-500"><Trash2 size={16} /></button></div></div>
                    ) : (
                      <div className="flex justify-between items-start gap-2"><div className="flex-1 min-w-0"><p className="font-bold text-gray-900 text-xs truncate">{item.name}</p><div className="flex items-center gap-1.5 mt-1"><span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Qty: {item.quantity}</span><span className="text-[10px] text-gray-400">×</span><span className="text-[10px] text-gray-500">{formatCurrency(totalPrice)}</span></div></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-[#5a4fcf]">{formatCurrency(totalPrice * (Number(item.quantity) || 0))}</span><div className="flex gap-1"><button onClick={() => toggleEdit(item.id)} className="p-1 rounded bg-gray-100 text-gray-600"><Edit2 size={12} /></button><button onClick={() => deleteCartItem(item.id)} className="p-1 rounded bg-red-50 text-red-500"><Trash2 size={12} /></button></div></div></div>
                    )}
                  </div>
                );
              })}</div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 bg-white shadow-[0_-8px_30_rgba(0,0,0,0.05)] border-t border-gray-100/50 p-2 space-y-2">
          <div className="max-w-2xl mx-auto space-y-2">
            <div className={`flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-all ${cart.length === 0 ? 'opacity-50' : ''}`}><input type="number" placeholder="Enter Discount" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} className="flex-1 bg-transparent px-3 py-2 text-sm font-medium outline-none" /><button onClick={() => setDiscountType(discountType === 'percentage' ? 'fixed' : 'percentage')} className="bg-[#5a4fcf] px-4 text-[10px] font-black uppercase tracking-widest text-white">{discountType === 'percentage' ? '%' : '₹'}</button></div>
            <div className="space-y-1 px-1"><div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>{discountAmount > 0 && (<div className="flex justify-between items-center text-[10px] font-bold text-emerald-600"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>)}<div className="h-[1px] w-full bg-gray-50 my-1" /><div className="flex justify-between items-end"><span className="text-xs font-black text-gray-900">Total Due</span><span className="text-base font-black text-[#5a4fcf]">{formatCurrency(totalAmount)}</span></div></div>
            {!showWhatsAppSharePanel && !showPaymentOptions && (<button onClick={() => { if (cart.length === 0) return; setShowWhatsAppSharePanel(true); }} className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#5a4fcf] py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-[#4c42b8] active:scale-[0.98] disabled:bg-gray-300" disabled={cart.length === 0 || !settingsComplete}><span>Proceed to Payment</span><ChevronRight size={14} /></button>)}
          </div>
        </div>

        {showWhatsAppSharePanel && cart.length > 0 && settingsComplete && (
          <div className="space-y-3 rounded-2xl bg-gradient-to-br from-green-50/50 to-emerald-50/50 p-3 border border-green-100 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col gap-2"><div className="flex gap-2 items-center"><div className="w-[85px] shrink-0"><CountryCodeSelector selectedCountryCode={customerCountryCode} onSelect={(c) => setCustomerCountryCode(c.code)} /></div><input type="tel" value={whatsAppNumber} onChange={(e) => setWhatsAppNumber(e.target.value)} placeholder="Phone Number" className="flex-1 rounded-xl border border-green-200 p-2.5 text-xs outline-none bg-white" /></div><input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer Name (Optional)" className="w-full rounded-xl border border-green-200 p-2.5 text-xs outline-none bg-white" /></div>
            <button onClick={handleProceedToPayment} className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-bold text-white hover:bg-green-700"><MessageSquare size={16} /><span className="text-xs">{whatsAppNumber.trim() ? 'Continue to Payment' : 'Skip & Continue'}</span></button>
          </div>
        )}

        {showPaymentOptions && cart.length > 0 && settingsComplete && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300"><p className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest">Select Payment Method</p><div className="grid grid-cols-2 gap-1.5">{[{ method: 'cash', label: 'Cash' }, { method: 'qr-code', label: 'QR' }].map(({ method, label }) => (<button key={method} onClick={() => { setSelectedPayment(method); if (method === 'cash') setIsCashModalOpen(true); if (method === 'qr-code') setIsQRModalOpen(true); }} className={`rounded-lg py-3 text-xs font-bold capitalize transition-all border flex items-center justify-center gap-2 ${selectedPayment === method ? 'bg-[#5a4fcf] text-white border-transparent shadow-lg shadow-indigo-100' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}>{method === 'cash' ? <DollarSign size={16} /> : <Scan size={16} />}{label}</button>))}</div></div>
        )}
      </div>

      {isCashModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in transition-all">
          <div className="relative w-[95%] max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-300">
            <div className="h-1 bg-[#5a4fcf] absolute top-0 left-0 right-0" />
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Cash Payment</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Accept cash from customer</p>
              </div>
              <button onClick={() => setIsCashModalOpen(false)} className="p-2 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50/80 rounded-[24px] p-6 mb-8 flex flex-col items-center justify-center border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL AMOUNT</span>
              <span className="text-4xl font-black text-[#5a4fcf]">{formatCurrency(totalAmount)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CASH RECEIVED</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₹</span>
                  <input
                    type="number"
                    value={amountGiven}
                    onChange={(e) => setAmountGiven(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full rounded-2xl border-2 border-slate-100 p-4 pl-9 text-xl font-black focus:border-[#5a4fcf] focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CHANGE TO RETURN</label>
                <div className={`w-full h-[62px] rounded-2xl flex items-center justify-center border-2 ${balance < 0 ? 'bg-red-50 border-red-100' : 'bg-[#eefcf4] border-[#eefcf4]'}`}>
                  <span className={`font-black text-xl ${balance < 0 ? 'text-red-600' : 'text-[#0da06a]'}`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handlePaymentSuccess(true)}
                disabled={isCreatingLink || isMessaging}
                className="flex-[0.35] h-[56px] rounded-full bg-slate-50 text-[#5a4fcf] font-black flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-100"
              >
                {isCreatingLink ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-3 border-[#5a4fcf] border-t-transparent"></div>
                ) : (
                  <><Nfc size={20} /><span className="text-xs uppercase font-black">NFC</span></>
                )}
              </button>
              <button
                onClick={() => handlePaymentSuccess(false)}
                disabled={isMessaging || isCreatingLink || (amountGiven !== '' && amountGiven < totalAmount)}
                className="flex-1 h-[56px] flex items-center justify-center gap-2 rounded-full bg-[#0da06a] font-black text-white shadow-lg shadow-emerald-100 hover:bg-[#0b8a5c] active:scale-[0.98] disabled:bg-slate-200 disabled:shadow-none transition-all"
              >
                {isMessaging ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-3 border-white border-t-transparent"></div>
                ) : (
                  <><Check size={20} /><span className="text-xs uppercase font-black tracking-wider">CONFIRM CASH PAYMENT</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isQRModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in transition-all">
          <div className="relative w-[95%] max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-300">
            <div className="h-1 bg-[#5a4fcf] absolute top-0 left-0 right-0" />
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Scan to Pay</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Customer scans QR code</p>
              </div>
              <button onClick={() => setIsQRModalOpen(false)} className="p-2 rounded-full bg-slate-50 text-slate-400">
                <X size={20} />
              </button>
            </div>

            {upiQR ? (
              <div className="flex flex-col items-center">
                <div className="w-full bg-slate-50/80 rounded-[32px] p-8 mb-6 flex flex-col items-center border border-slate-100">
                  <div className="bg-white p-6 rounded-[24px] shadow-sm mb-4">
                    <QRCode value={upiQR} size={180} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />
                  </div>
                  <p className="text-[#5a4fcf] font-black text-sm tracking-widest select-all select-none">{merchantUpi}</p>
                </div>

                <p className="text-3xl font-black text-slate-900 mb-8">{formatCurrency(totalAmount)}</p>

                <div className="flex w-full gap-3">
                  <button
                    onClick={() => handlePaymentSuccess(true)}
                    disabled={isCreatingLink || isMessaging}
                    className="flex-[0.35] h-[56px] rounded-full bg-slate-50 text-[#5a4fcf] font-black flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-100"
                  >
                    {isCreatingLink ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-3 border-[#5a4fcf] border-t-transparent"></div>
                    ) : (
                      <><Nfc size={20} /><span className="text-xs uppercase font-black">NFC</span></>
                    )}
                  </button>
                  <button
                    onClick={() => handlePaymentSuccess(false)}
                    disabled={isMessaging || isCreatingLink}
                    className="flex-1 h-[56px] flex items-center justify-center gap-2 rounded-full bg-[#5a4fcf] font-black text-white shadow-lg shadow-indigo-100 hover:bg-[#4c42b8] active:scale-[0.98] transition-all"
                  >
                    {isMessaging ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-3 border-white border-t-transparent"></div>
                    ) : (
                      <><CheckCircle size={20} /><span className="text-xs uppercase font-black tracking-wider">COLLECT PAYMENT</span></>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center flex flex-col items-center">
                <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
                <p className="text-sm font-bold text-gray-600 px-8 uppercase">UPI ID not configured</p>
                <button onClick={() => window.location.assign('/settings')} className="mt-6 text-[#5a4fcf] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                  Go to Settings <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false, message: '' })} title={modal.title} onConfirm={modal.onConfirm} confirmText={modal.confirmText} showCancel={modal.showCancel}>{modal.message}</Modal>
    </>
  );
}
