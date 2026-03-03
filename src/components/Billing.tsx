'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner';
import QRCode from 'react-qr-code';
import {
  Scan, Trash2, Edit2, Check, X, AlertTriangle,
  CheckCircle, DollarSign, MessageSquare,
  Nfc, ChevronRight
} from 'lucide-react';
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
  productId?: string;
  name: string;
  quantity: number | '';
  price: number | '';
  gstRate: number;
  profitPerUnit?: number;
  isEditing?: boolean;
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
  const [suggestions, setSuggestions] = React.useState<InventoryProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = React.useState(false);

  // States for flow
  const [showWhatsAppSharePanel, setShowWhatsAppSharePanel] = React.useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = React.useState(false);

  // This state holds 'cash' or 'qr-code' depending on which tab is open
  const [selectedPayment, setSelectedPayment] = React.useState<string>('');

  // Data states
  const [merchantUpi, setMerchantUpi] = React.useState('');
  const [merchantName, setMerchantName] = React.useState('Billzzy Lite');
  const [whatsAppNumber, setWhatsAppNumber] = React.useState('');
  const [customerCountryCode, setCustomerCountryCode] = React.useState('IN');
  const [customerName, setCustomerName] = React.useState('');
  const [amountGiven, setAmountGiven] = React.useState<number | ''>('');

  // Loading states
  const [isMessaging, setIsMessaging] = React.useState(false); // For WhatsApp/DB Save
  const [isCreatingLink, setIsCreatingLink] = React.useState(false); // For NFC

  const [scannerError, setScannerError] = React.useState<string>('');
  const [modal, setModal] = React.useState<{ isOpen: boolean; title: string; message: string | React.ReactNode; onConfirm?: (() => void); confirmText: string; showCancel: boolean; }>({ isOpen: false, title: '', message: '', confirmText: 'OK', showCancel: false });
  const suggestionsRef = React.useRef<HTMLDivElement | null>(null);

  const [settingsComplete, setSettingsComplete] = React.useState(false);
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
    if (status === 'authenticated' && session?.user?.email) {
      // 1. Try to fetch fresh settings from DB
      try {
        const res = await fetch('/api/users/settings');
        if (res.ok) {
          const data = await res.json();
          // Update local storage to keep it in sync
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
            return true;
          }
        }
      } catch (e) {
        console.error("Failed to fetch settings from DB, falling back to local", e);
      }

      // 2. Fallback to Local Storage/Session (Legacy behavior)
      const savedData = localStorage.getItem(`userSettings-${session.user.email}`);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          const phoneNumber = parsedData.phoneNumber || session.user.phoneNumber || '';

          if (phoneNumber && phoneNumber.trim() !== '' && /^\d{10,15}$/.test(phoneNumber)) {
            setSettingsComplete(true);
            setMerchantUpi(parsedData.merchantUpiId || '');
            setMerchantName(parsedData.shopName || 'Billzzy Lite');
            return true;
          }
        } catch (error) {
          console.error('Error parsing settings data:', error);
        }
      } else if (session.user.phoneNumber) {
        setSettingsComplete(true);
        // We don't have defaultCountryCode in session usually, so keep 'IN' or fetch again
        return true;
      }

      setSettingsComplete(false);
      return false;
    }
    return false;
  }, [status, session]);

  React.useEffect(() => { checkPhoneNumber(); }, [checkPhoneNumber]);

  // Inventory Fetch
  React.useEffect(() => {
    if (status !== 'authenticated') return;
    (async () => {
      try {
        const res = await fetch('/api/products');
        if (!res.ok) { setInventory([]); return; }
        const data: InventoryProduct[] = await res.json();
        const productsWithGst = data.map(p => ({ ...p, gstRate: p.gstRate || 0 }));
        setInventory(productsWithGst);
      } catch { setInventory([]); }
    })();
  }, [status]);

  // Suggestions
  React.useEffect(() => {
    if (!productName.trim()) { setShowSuggestions(false); return; }
    const query = productName.trim().toLowerCase();
    const filtered = inventory.filter(p => p.name.toLowerCase().includes(query) || p.sku?.toLowerCase().includes(query)).slice(0, 5);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [productName, inventory]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // --- WHATSAPP LOGIC ---
  const sendWhatsAppMessage = React.useCallback(async (phoneNumber: string, messageType: string) => {
    if (!phoneNumber.trim() || phoneNumber.length < 7 || phoneNumber.length > 15) {
      setModal({
        isOpen: true,
        title: 'Invalid Number',
        message: 'Please enter a valid phone number (7-15 digits).',
        showCancel: false,
        confirmText: 'Got it',
      });
      return false;
    }

    try {
      const dialCode = countries.find(c => c.code === customerCountryCode)?.dialCode || '+91';
      const cleanDialCode = dialCode.replace(/\+/g, '');
      const cleanInput = phoneNumber.replace(/\D/g, '');

      // If the number already starts with the dial code, don't prepend it
      // but ensure it doesn't double-prefix (e.g., 9191...) if the number itself starts with those digits
      // A safer way: if input starts with cleanDialCode, use input. Else dialCode + input.
      const formattedPhone = cleanInput.startsWith(cleanDialCode) ? cleanInput : `${cleanDialCode}${cleanInput}`;

      const orderId = `INV-${Date.now().toString().slice(-6)}`;
      const itemsListRaw = cart.map((item) => `${item.name} (x${item.quantity})`).join(', ');
      // Truncate itemsList if too long (WhatsApp limits)
      const itemsList = itemsListRaw.length > 500 ? itemsListRaw.substring(0, 497) + "..." : itemsListRaw;

      let templateName = '';
      let bodyParameters: string[] = [];

      switch (messageType) {
        case 'cashPayment': templateName = 'payment_receipt_cashh'; break;
        case 'qrPayment': templateName = 'payment_receipt_upii'; break;
        case 'cardPayment': templateName = 'payment_receipt_card'; break;
        default: templateName = 'payment_receipt_cashh';
      }

      bodyParameters = [
        orderId,
        merchantName,
        `₹${totalAmount.toFixed(2)}`,
        itemsList,
        discountAmount > 0 ? `₹${discountAmount.toFixed(2)}` : '₹0.00',
      ];

      const messageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [{ type: 'body', parameters: bodyParameters.map((text) => ({ type: 'text', text })) }],
        },
      };

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to send message');
      if (!result.success) throw new Error(result.message || 'WhatsApp API returned success: false');

      return true;
    } catch (error) {
      console.error('WhatsApp API error:', error);
      setModal({
        isOpen: true,
        title: 'Messaging Error',
        message: `Failed to send WhatsApp message: ${error instanceof Error ? error.message : 'Unknown error'}.`,
        showCancel: false,
        confirmText: 'OK',
      });
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
  // --- CART ACTIONS ---
  const addToCart = React.useCallback((name: string, price: number, gstRate: number, productId?: string, profitPerUnit?: number, isEditing = false) => {
    if (!name || price < 0) return;

    // Check stock if productId exists
    if (productId) {
      const product = inventory.find(p => p.id === productId);
      if (product) {
        // Find existing quantity in cart
        const existingItem = cart.find(item => item.productId === productId);
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
      const existingItem = productId ? prev.find(item => item.productId === productId) : null;
      if (existingItem) {
        return prev.map(item => item.productId === productId ? { ...item, quantity: (Number(item.quantity) || 0) + 1 } : item);
      }
      return [{ id: Date.now(), productId, name, quantity: 1, price, gstRate, profitPerUnit: profitPerUnit || 0, isEditing }, ...prev];
    });
    setProductName('');
    setShowSuggestions(false);
  }, [inventory, cart]); // Added dependencies

  const handleScan = React.useCallback((results: IDetectedBarcode[]) => {
    if (results && results[0]) {
      const scannedValue = results[0].rawValue;
      const foundProduct = inventory.find(p => p.id === scannedValue || p.sku?.toLowerCase() === scannedValue.toLowerCase() || p.name.toLowerCase() === scannedValue.toLowerCase());
      if (foundProduct) {
        addToCart(foundProduct.name, foundProduct.sellingPrice, foundProduct.gstRate, foundProduct.id, foundProduct.profitPerUnit);
        setScanning(false);
      } else {
        addToCart(scannedValue, 0, 0, undefined, 0, true);
        setScanning(false);
      }
    }
  }, [inventory, addToCart]);

  const handleScanError = React.useCallback((error: unknown) => {
    setScannerError(error instanceof Error ? error.message : 'Unknown scanner error');
  }, []);

  const handleManualAdd = React.useCallback(() => {
    const name = productName.trim();
    if (!name) {
      setModal({ isOpen: true, title: 'Item Name Required', message: 'Please enter a name for the custom item.', showCancel: false, confirmText: 'OK' });
      return;
    }
    addToCart(name, 0, 0, undefined, 0, true);
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
          if (product && newQty > product.quantity) {
            setModal({
              isOpen: true,
              title: 'Insufficient Stock',
              message: `Cannot set quantity to ${newQty}. Only ${product.quantity} available.`,
              confirmText: 'OK',
              showCancel: false
            });
            return item; // Return original item without update
          }
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
    if (showWhatsAppSharePanel && cart.length > 0) {
      if (whatsAppNumber.trim() !== '') {
        const phoneRegex = /^\d{7,15}$/;
        if (!phoneRegex.test(whatsAppNumber)) {
          alert("Please enter a valid phone number (7-15 digits)");
          return;
        }
      }
    }

    if (cart.length === 0) {
      setModal({ isOpen: true, title: 'Cart Empty', message: 'Please add items to the cart before finalizing.', confirmText: 'OK', showCancel: false });
      return;
    }
    setShowWhatsAppSharePanel(false);
    setShowPaymentOptions(true);
  }, [cart.length, showWhatsAppSharePanel, whatsAppNumber]);

  // --- FINAL PAYMENT HANDLER ---
  const handlePaymentSuccess = React.useCallback(async (useNfc: boolean = false) => {
    // 1. Set Loading UI based on action
    if (useNfc) {
      setIsCreatingLink(true);
    } else {
      setIsMessaging(true);
    }

    try {
      // 2. Prepare Variables
      let nfcToken = '';

      // Prepare sanitized cart with valid numbers for API
      const safeCart = cart.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0
      }));

      // 3. Update Inventory (ALWAYS run this for both)
      const updatePromises = safeCart.filter(item => item.productId).map(item =>
        fetch(`/api/products/${item.productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantityToDecrement: item.quantity })
        })
      );
      await Promise.all(updatePromises).catch(err => console.error("Inventory update failed:", err));

      // 4. Save Customer DB (ALWAYS run this for both if name exists)
      if (customerName.trim() && whatsAppNumber.trim()) {
        fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: customerName.trim(), phoneNumber: whatsAppNumber.trim() })
        }).catch(err => console.error("Customer save error", err));
      }

      // Calculate total profit based on safeCart
      const totalProfit = safeCart.reduce((sum, item) => sum + ((item.profitPerUnit || 0) * item.quantity), 0);

      // 5. HANDLE PAYMENT & SALE CREATION
      if (useNfc) {
        // === NFC FLOW ===
        // Calling /api/nfc-link creates the Order/Sale in the backend AND returns the ID
        // The 'paymentMethod' (Cash vs QR) is passed here, so the backend saves it correctly.
        const nfcRes = await fetch('/api/nfc-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart: safeCart, totalAmount, paymentMethod: selectedPayment, profit: totalProfit }),
        });
        const nfcData = await nfcRes.json();

        if (nfcData.success && nfcData.orderId) {
          nfcToken = nfcData.orderId;
        } else {
          throw new Error(nfcData.message || 'Failed to generate NFC link');
        }
        // NOTE: We do NOT call /api/sales here to avoid Double Bill.

      } else {
        // === REGULAR CONFIRM FLOW (CASH / QR) ===
        // Manually create the sale record
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalAmount,
            paymentMethod: selectedPayment,
            profit: totalProfit,
            items: safeCart,
            customerPhone: whatsAppNumber ? `${countries.find(c => c.code === customerCountryCode)?.dialCode.replace('+', '')}${whatsAppNumber}` : '',
            customerName: customerName,
            merchantName: merchantName,
            discount: discountAmount
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save sale');
        }

        // Send WhatsApp only for Manual Confirm
        if (whatsAppNumber && whatsAppNumber.trim()) {
          await sendWhatsAppReceipt(selectedPayment);
        }
      }

      // 6. Launch NFC App (Only for NFC Flow)
      if (useNfc && nfcToken) {
        const packageName = "com.billzzylite.bridge";
        const bridgeUrl = `intent://nfc/${nfcToken}#Intent;scheme=billzzylite;package=${packageName};end`;
        window.location.href = bridgeUrl;
      }

      // 7. Show Success Animation
      setShowSuccessAnimation(true);
      // The SuccessTick component will call handleTransactionDone (or we can chain it)
      // For now, we rely on the onComplete callback of SuccessTick to show the final modal or reset.

      // NOTE: We refrain from showing the "Success!" modal here immediately.
      // Instead, we wait for the animation.

      // Let's rely on the animation onComplete to trigger the next step.
      // However, we need to pass the "modal setting" logic to that callback or use an effect.
      // To keep it simple, I will Define a "finisher" function.
    } catch (error) {
      console.error("Payment Process Error:", error);
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
  }, [selectedPayment, totalAmount, cart, whatsAppNumber, sendWhatsAppReceipt, customerName, merchantName, discountAmount, customerCountryCode]);

  const toggleScanner = React.useCallback(() => {
    setScanning(prev => { if (!prev) { setScannerError(''); } return !prev; });
  }, []);

  const onSuccessAnimationComplete = React.useCallback(() => {
    setShowSuccessAnimation(false);

    // DIRECTLY RESET - SKIP MODAL
    // GPay style: The tick was the feedback. Now we just prep for next customer.
    // If we want to show a "New Bill" button explicitly we would need a clean state, 
    // but the user said "remove the modal pop".
    // So we just call handleTransactionDone() which clears the cart.

    handleTransactionDone();

    // Optional: If we want to stay on the "success screen" (tick) longer, the component handles that duration.
    // When it calls onComplete, we interpret that as "user is done watching, next".
  }, [handleTransactionDone]);

  return (
    <>
      {showSuccessAnimation && <SuccessTick onComplete={onSuccessAnimationComplete} amount={totalAmount} />}
      <div className="h-full flex flex-col bg-gray-50">
        {!settingsComplete && (
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

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-2 space-y-2">

            {scanning && settingsComplete && (
              <div className="bg-white rounded-xl p-3 shadow-md border border-indigo-100">
                <div className="max-w-sm mx-auto"><Scanner onScan={handleScan} onError={handleScanError} scanDelay={300} styles={{ container: { width: '100%', height: 180, borderRadius: '12px', overflow: 'hidden' } }} /></div>
                {scannerError && <p className="text-center text-xs text-red-500 mt-2">{scannerError}</p>}
                <button onClick={toggleScanner} className="w-full mt-3 flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-semibold hover:bg-red-100"><X size={16} /> Close Scanner</button>
              </div>
            )}

            <div className="bg-white rounded-xl p-3 shadow-md border border-gray-200">
              <div className="flex gap-2">
                <div ref={suggestionsRef} className="relative flex-1">
                  <input type="text" placeholder={settingsComplete ? "Search or add item..." : "Settings required to add items"} className="w-full rounded-lg border-2 border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#5a4fcf] focus:border-[#5a4fcf] outline-none transition-all" value={productName} onChange={(e) => setProductName(e.target.value)} onClick={() => setScanning(false)} onKeyPress={(e) => { if (e.key === 'Enter') { handleManualAdd(); } }} disabled={!settingsComplete} />
                  {showSuggestions && settingsComplete && (
                    <div className="absolute z-10 mt-2 w-full rounded-xl border-2 border-[#5a4fcf] bg-white shadow-xl max-h-48 overflow-y-auto">{suggestions.map((s) => (<div key={s.id} onClick={() => addToCart(s.name, s.sellingPrice, s.gstRate, s.id, s.profitPerUnit)} className="cursor-pointer border-b border-gray-100 p-3 hover:bg-indigo-50 transition-colors last:border-b-0"><div className="flex justify-between items-center"><span className="font-semibold text-gray-800 text-sm">{s.name}</span><span className="text-[#5a4fcf] font-bold text-sm">{formatCurrency(s.sellingPrice)}</span></div>{s.sku && <p className="text-xs text-gray-500 mt-0.5">SKU: {s.sku}</p>}</div>))}</div>
                  )}
                </div>
              </div>
              {!scanning && settingsComplete && (<button onClick={toggleScanner} className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-50 text-[#5a4fcf] py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors"><Scan size={16} /> Scan Barcode</button>)}
            </div>

            {cart.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-md border border-gray-200"><div className="text-5xl mb-3">🛒</div><p className="text-gray-600 font-medium">{settingsComplete ? "Cart is Empty" : "Settings Required"}</p><p className="text-xs text-gray-500 mt-1">{settingsComplete ? "Add items to get started" : "Please complete your settings to start billing"}</p></div>
            ) : (
              <div className="space-y-2">{cart.map((item) => {
                const { gstAmount, totalPrice } = calculateGstDetails(Number(item.price) || 0, item.gstRate); const totalItemPrice = totalPrice * (Number(item.quantity) || 0); return (
                  <div key={item.id} className={`rounded-lg p-2.5 shadow-sm border transition-all ${item.isEditing ? 'bg-indigo-50 border-[#5a4fcf]' : 'bg-white border-gray-200'}`}>

                    {item.isEditing ? (
                      /* === COMPACT EDIT MODE === */
                      <div className="flex flex-col gap-2">
                        {/* Row 1: Name */}
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateCartItem(item.id, { name: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-1 focus:ring-[#5a4fcf] outline-none bg-white"
                          placeholder="Item Name"
                          disabled={!settingsComplete}
                        />

                        {/* Row 2: Qty | Price | Actions */}
                        <div className="flex items-center gap-2">
                          <div className="relative flex-[1]">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateCartItem(item.id, { quantity: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                              className="w-full px-2 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-1 focus:ring-[#5a4fcf] outline-none bg-white font-medium text-center"
                              placeholder="Qty"
                              disabled={!settingsComplete}
                            />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">Qty</span>
                          </div>

                          <div className="relative flex-[1.5]">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₹</span>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => updateCartItem(item.id, { price: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                              className="w-full pl-5 pr-2 py-1.5 rounded-md border border-gray-300 text-sm focus:ring-1 focus:ring-[#5a4fcf] outline-none bg-white font-medium"
                              placeholder="Price"
                              disabled={!settingsComplete}
                            />
                          </div>

                          {/* Actions */}
                          <button
                            onClick={() => toggleEdit(item.id)}
                            className="flex items-center justify-center p-1.5 rounded-md bg-[#5a4fcf] text-white hover:bg-[#4c42b8] shadow-sm transition-all"
                            title="Save"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => deleteCartItem(item.id)}
                            className="flex items-center justify-center p-1.5 rounded-md bg-red-100 text-red-500 hover:bg-red-200 shadow-sm transition-all"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* === VIEW MODE UI (Compact) === */
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate leading-tight">{item.name}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Qty: {item.quantity}</span>
                            <span className="text-[10px] text-gray-400">×</span>
                            <span className="text-xs text-gray-500">{formatCurrency(totalPrice)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#5a4fcf]">
                            {formatCurrency(totalItemPrice)}
                          </span>

                          <div className="flex gap-1">
                            <button onClick={() => toggleEdit(item.id)} disabled={!settingsComplete} className="p-1 rounded bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-[#5a4fcf] transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => deleteCartItem(item.id)} disabled={!settingsComplete} className="p-1 rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    )}

                    {!item.isEditing && item.gstRate > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-100 text-[10px] text-gray-400">
                        Base: {formatCurrency(Number(item.price) || 0)} + GST ({item.gstRate}%): {formatCurrency(gstAmount)}
                      </div>
                    )}
                  </div>
                );
              })}</div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.05)] border-t border-gray-100/50">
          <div className="p-2 space-y-2 max-h-[50vh] overflow-y-auto">

            <div className={`flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-all ${cart.length === 0 ? 'opacity-50' : 'hover:border-[#1D4ED8]'}`}>
              <input
                type="number"
                placeholder="Enter Discount"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-xs font-medium outline-none placeholder:text-gray-400 text-gray-700"
                disabled={cart.length === 0 || !settingsComplete}
              />
              <button
                onClick={() => setDiscountType(discountType === 'percentage' ? 'fixed' : 'percentage')}
                className="bg-[#5a4fcf] px-4 text-[9px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#4c42b8] active:bg-[#3d34a4] disabled:bg-gray-400"
                disabled={cart.length === 0 || !settingsComplete}
              >
                {discountType === 'percentage' ? '%' : '₹'}
              </button>
            </div>

            {/* --- SUMMARY TABLE --- */}
            <div className="space-y-1 px-1">
              <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="text-gray-600 font-black">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-[9px] font-bold text-emerald-600 animate-in slide-in-from-top-1 duration-200">
                  <span className="uppercase tracking-widest">Discount ({discountType === 'percentage' ? `${discountInput}%` : 'Fixed'})</span>
                  <span className="font-black">-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="h-[1px] w-full bg-gray-50 my-0.5" />

              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-gray-900 tracking-tight uppercase">Total Due</span>
                <span className="text-base font-black text-[#5a4fcf] tracking-tighter leading-none">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* --- ACTION BUTTONS --- */}
            {!showWhatsAppSharePanel && !showPaymentOptions && (
              <button
                onClick={() => {
                  if (cart.length === 0) {
                    setModal({ isOpen: true, title: 'Cart Empty', message: 'Please add items to the cart before finalizing.', confirmText: 'OK', showCancel: false });
                    return;
                  }
                  setShowWhatsAppSharePanel(true);
                  setShowPaymentOptions(false);
                }}
                className="w-full group relative flex items-center justify-center gap-2 rounded-lg bg-[#5a4fcf] py-2 text-[13px] font-bold text-white shadow-md shadow-indigo-100 transition-all hover:bg-[#4c42b8] active:scale-[0.98] disabled:bg-gray-300 disabled:shadow-none"
                disabled={cart.length === 0 || !settingsComplete}
              >
                <span>Proceed to Payment</span>
                <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
            )}

            {/* --- CUSTOMER PANEL --- */}
            {showWhatsAppSharePanel && cart.length > 0 && settingsComplete && (
              <div className="space-y-3 rounded-2xl bg-gradient-to-br from-green-50/50 to-emerald-50/50 p-3 border border-green-100 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <div className="w-[85px] shrink-0">
                      <CountryCodeSelector
                        selectedCountryCode={customerCountryCode}
                        onSelect={(c) => setCustomerCountryCode(c.code)}
                      />
                    </div>
                    <input
                      type="tel"
                      value={whatsAppNumber}
                      onChange={(e) => setWhatsAppNumber(e.target.value)}
                      placeholder="Phone Number"
                      className="flex-1 rounded-xl border border-green-200 p-2.5 text-sm font-medium outline-none focus:border-green-500 bg-white transition-all shadow-sm"
                    />
                  </div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name (Optional)"
                    className="w-full rounded-xl border border-green-200 p-2.5 text-sm font-medium outline-none focus:border-green-500 bg-white transition-all shadow-sm"
                  />
                </div>
                <button onClick={handleProceedToPayment} disabled={isMessaging} className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-bold text-white hover:bg-green-700 transition-all shadow-lg shadow-green-100 active:scale-[0.98]">
                  {isMessaging ? (
                    <div className="flex items-center gap-2 font-medium">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span className="text-sm">Processing...</span>
                    </div>
                  ) : (
                    <><MessageSquare size={16} /><span className="text-sm">{whatsAppNumber.trim() ? 'Continue to Payment' : 'Skip & Continue'}</span></>
                  )}
                </button>
              </div>
            )}

            {showPaymentOptions && cart.length > 0 && settingsComplete && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest">Select Payment Method</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[{ method: 'cash', label: 'Cash' }, { method: 'qr-code', label: 'QR' }].map(({ method, label }) => (
                    <button
                      key={method}
                      onClick={() => setSelectedPayment(method)}
                      className={`rounded-lg py-2 text-xs font-bold capitalize transition-all border ${selectedPayment === method ? 'bg-[#5a4fcf] text-white border-transparent shadow-md shadow-indigo-100 -translate-y-0.5' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {selectedPayment === 'cash' && (
                  <div className="rounded-2xl bg-emerald-50 p-3 border border-emerald-100 animate-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider ml-1">Received</label>
                        <input type="number" placeholder="0.00" value={amountGiven} onChange={(e) => setAmountGiven(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full rounded-xl border border-emerald-200 p-2.5 text-sm font-bold focus:ring-1 focus:ring-emerald-500 outline-none bg-white shadow-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider ml-1">Balance</label>
                        <div className="w-full rounded-xl bg-white border border-emerald-200 p-2.5 flex items-center justify-center shadow-sm">
                          <span className={`font-black text-sm ${balance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatCurrency(balance)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handlePaymentSuccess(true)} disabled={isCreatingLink || isMessaging} className="flex-1 rounded-lg bg-indigo-600 py-2.5 font-bold text-white hover:bg-indigo-700 flex items-center justify-center shadow-md active:scale-95">
                        {isCreatingLink ? (<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>) : (<Nfc size={18} />)}
                      </button>
                      <button onClick={() => handlePaymentSuccess(false)} disabled={isMessaging || isCreatingLink} className="flex-[3] flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700 transition-all shadow-md active:scale-[0.98]">
                        {isMessaging ? (<div className="flex items-center gap-1.5 text-xs"><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div><span>Saving...</span></div>) : (<><DollarSign size={16} /><span className="text-sm">Confirm Cash</span></>)}
                      </button>
                    </div>
                  </div>
                )}

                {selectedPayment === 'qr-code' && (
                  <div className="rounded-2xl bg-blue-50 p-4 border border-blue-100 animate-in zoom-in-95 duration-200">
                    {upiQR ? (
                      <div className="flex flex-col items-center">
                        <div className="bg-white p-3 rounded-2xl shadow-xl border border-blue-100 mb-4 transition-transform hover:scale-105">
                          <QRCode value={upiQR} size={140} style={{ height: 'auto', width: '100%' }} />
                        </div>
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-4">Pay to: {merchantUpi}</p>
                        <div className="flex w-full gap-2">
                          <button onClick={() => handlePaymentSuccess(true)} disabled={isCreatingLink || isMessaging} className="flex-1 rounded-lg bg-indigo-600 py-2.5 font-bold text-white hover:bg-indigo-700 flex items-center justify-center shadow-md active:scale-95">
                            {isCreatingLink ? (<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>) : (<Nfc size={18} />)}
                          </button>
                          <button onClick={() => handlePaymentSuccess(false)} disabled={isMessaging || isCreatingLink} className="flex-[3] flex items-center justify-center gap-1.5 rounded-lg bg-[#5a4fcf] py-2.5 font-bold text-white hover:bg-[#4c42b8] transition-all shadow-md active:scale-[0.98]">
                            {isMessaging ? (<div className="flex items-center gap-1.5 text-xs"><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div><span>Saving...</span></div>) : (<><CheckCircle size={16} /><span className="text-sm">Payment Received</span></>)}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-xs font-bold text-red-500 py-4 italic">UPI ID not configured in settings.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false, message: '' })}
        title={modal.title}
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
        showCancel={modal.showCancel}
      >
        {modal.message}
      </Modal>
    </>
  );
}
