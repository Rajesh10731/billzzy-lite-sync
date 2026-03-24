'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

// Define types for our data
type CartItem = {
  name: string;
  quantity: number;
  price: number;
};

type OrderData = {
  _id: string;
  amount: number;
  items: CartItem[];
  status: string;
  billId: string;
};

export default function PaymentPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [merchantName, setMerchantName] = useState('Shop');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // --- IMPORTANT: ENTER YOUR UPI ID HERE FOR TESTING ---
  // Since the customer cannot access your phone's settings, 
  // we hardcode it here for this test.
  const merchantUpi = "dhanushrajendran19@okaxis";
  // ----------------------------------------------------

  useEffect(() => {
    const fetchBill = async () => {
      try {
        // Call the API we created in Step 1
        const res = await fetch(`/api/public/bill/${orderId}`);
        const data = await res.json();

        if (data.success) {
          setOrder(data.sale);
          setMerchantName(data.merchantName);
          if (data.sale.status === 'completed') {
            setPaymentSuccess(true);
          }
        } else {
          setError(data.message || 'Bill not found');
        }
      } catch {
        setError('Failed to load bill details');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) fetchBill();
  }, [orderId]);

  const handleConfirmPayment = async () => {
    try {
      // Call API to mark as paid
      const res = await fetch(`/api/public/bill/${orderId}`, { method: 'PUT' });
      if (res.ok) {
        setPaymentSuccess(true);
      }
    } catch {
      alert("Could not update payment status");
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500"><AlertCircle className="mr-2" /> {error}</div>;
  if (!order) return null;

  // Create the UPI Deep Link
  const upiLink = `upi://pay?pa=${merchantUpi}&pn=${encodeURIComponent(merchantName)}&am=${order.amount}&cu=INR&tn=Bill-${order.billId}`;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#5a4fcf] p-6 text-center text-white">
          <h1 className="text-2xl font-bold">{merchantName}</h1>
          <p className="opacity-80">Bill #{order.billId}</p>
        </div>

        {paymentSuccess ? (
          <div className="p-10 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-20 w-20 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Paid Successfully!</h2>
            <p className="text-gray-500">Amount: ₹{order.amount}</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Bill Details */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2 border-b pb-2">Items</h3>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                    <span className="font-medium">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-dashed">
                <span className="font-bold text-lg">Total to Pay</span>
                <span className="font-bold text-2xl text-[#5a4fcf]">₹{order.amount}</span>
              </div>
            </div>

            {/* QR Code Area */}
            <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 rounded-xl border">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <QRCode value={upiLink} size={160} />
              </div>
              <p className="text-xs text-gray-500">Scan to pay via UPI</p>

              {/* Button to open UPI App directly */}
              <a
                href={upiLink}
                className="w-full bg-[#5a4fcf] text-white font-bold py-3 rounded-xl text-center shadow-md hover:bg-[#483ebd] transition"
              >
                Pay via UPI App
              </a>
            </div>

            {/* Manual Confirm Button */}
            <button
              onClick={handleConfirmPayment}
              className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition"
            >
              I have completed the payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
