'use client';

import React, { useEffect, useState } from 'react';
import {
  Filter, X, IndianRupee,
  Smartphone, Pencil, Send, Loader2, Tag,
  Clock, Calendar as CalendarIcon, Package
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import { motion } from "framer-motion";
import { useSearchParams } from 'next/navigation';

interface BillItem {
  type: "product" | "service";
  itemId?: string;
  name: string;
  quantity: number;
  price: number;
}

interface Bill {
  _id: string;
  id?: string;
  createdAt: string;
  amount: number; // This is the final amount after discount
  paymentMethod: string;
  customerPhone: string;
  customerName?: string;
  discount?: number; // Discount amount
  items: BillItem[];
  isEdited?: boolean;
}

type TimeFilter = 'today' | 'weekly' | 'monthly' | 'custom';

export default function BillingHistory() {
  const searchParams = useSearchParams();
  const billIdFromUrl = searchParams.get('billId');

  const [bills, setBills] = useState<Bill[]>([]);
  const [activeTab, setActiveTab] = useState<TimeFilter>('today');

  // New Date Filter State
  const [showDateFilter, setShowDateFilter] = useState(false);
  type ValuePiece = Date | null;
  type CalendarValue = ValuePiece | [ValuePiece, ValuePiece];
  const [dateRange, setDateRange] = useState<CalendarValue>(null);
  const [tempDateRange, setTempDateRange] = useState<CalendarValue>(null);

  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [newPhone, setNewPhone] = useState('');
  const [isResending, setIsResending] = useState(false);

  const getToday = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    const today = getToday();
    fetchHistory(today, today, 'today');
  }, []);

  // AUTO-EXPAND Bill from Notification Link
  useEffect(() => {
    if (billIdFromUrl && bills.length > 0) {
      console.log("🔍 Deep Link detected for Bill ID:", billIdFromUrl);
      const targetBill = bills.find(b => (b._id === billIdFromUrl || b.id === billIdFromUrl));
      if (targetBill) {
        setExpandedBillId(billIdFromUrl);
        // Optional: Scroll to the expanded bill
        setTimeout(() => {
          const element = document.getElementById(`bill-${billIdFromUrl}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, [billIdFromUrl, bills]);

  const fetchHistory = async (from: string, to: string, tab: TimeFilter = 'custom') => {
    try {
      const url = from && to ? `/api/billing-history?from=${from}&to=${to}` : '/api/billing-history';
      const res = await fetch(url);
      const data = await res.json();
      setBills(data);
      setActiveTab(tab);
    } catch {
      setBills([]);
    }
  };

  const handleQuickFilter = (type: TimeFilter) => {
    const today = new Date();
    // FIX: Changed 'let' to 'const' because 'start' object is mutated, not reassigned
    const start = new Date();

    if (type === 'today') {
      const dateStr = getToday();
      fetchHistory(dateStr, dateStr, 'today');
      setDateRange(null); // Clear custom range
    } else if (type === 'weekly') {
      start.setDate(today.getDate() - 7);
      fetchHistory(start.toISOString().split('T')[0], getToday(), 'weekly');
      setDateRange(null);
    } else if (type === 'monthly') {
      start.setMonth(today.getMonth() - 1);
      fetchHistory(start.toISOString().split('T')[0], getToday(), 'monthly');
      setDateRange(null);
    }
  };

  const handleUpdateAndResend = async () => {
    if (!editingBill) return;
    setIsResending(true);
    try {
      const res = await fetch(`/api/billing-history/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId: editingBill._id || editingBill.id, newPhone }),
      });
      if (res.ok) {
        setEditingBill(null);
        handleQuickFilter(activeTab); // Refresh current view
      }
    } finally {
      setIsResending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getPaymentColor = (method: string) => {
    const m = method.toLowerCase();
    if (m === 'cash') return 'text-green-600 bg-green-50 border-green-100';
    if (m === 'qr' || m === 'upi') return 'text-blue-600 bg-blue-50 border-blue-100';
    return 'text-purple-600 bg-purple-50 border-purple-100';
  };

  return (
    <div className="p-2 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#5a4fcf] rounded-lg flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">History</h1>
              <p className="text-xs text-gray-500">Transaction log</p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setTempDateRange(dateRange);
                setShowDateFilter(!showDateFilter);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all shadow-sm border ${Array.isArray(dateRange) && dateRange[0] && dateRange[1]
                ? 'bg-[#4a3fb8] text-white border-transparent ring-2 ring-purple-200'
                : 'bg-[#5a4fcf] text-white border-transparent hover:bg-[#4a3fb8]'
                }`}
            >
              <Filter className="w-4 h-4" />
              {Array.isArray(dateRange) && dateRange[0] && dateRange[1] ? (
                <span className="text-xs">
                  {format(dateRange[0], 'dd MMM')} - {format(dateRange[1], 'dd MMM')}
                </span>
              ) : null}
              {(Array.isArray(dateRange) && dateRange[0]) && (
                <X
                  size={14}
                  className="ml-1 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateRange(null);
                    // Reset to Today when cleared
                    const today = getToday();
                    fetchHistory(today, today, 'today');
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
                      color: #5a4fcf;
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
                      background: #5a4fcf !important;
                      color: white !important;
                    }
                    .filter-calendar .react-calendar__tile--now {
                      background: #f3f4f6;
                    }
                    .filter-calendar .react-calendar__tile--range {
                       background: #eef2ff;
                       color: #5a4fcf;
                    }
                    .filter-calendar .react-calendar__tile--rangeStart {
                       background: #5a4fcf !important;
                       color: white !important;
                       border-top-left-radius: 6px !important;
                       border-bottom-left-radius: 6px !important;
                    }
                    .filter-calendar .react-calendar__tile--rangeEnd {
                       background: #5a4fcf !important;
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
                    className="flex-1 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50"
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
                        fetchHistory(f, t, 'custom');
                      }
                    }}
                    disabled={!Array.isArray(tempDateRange) || !tempDateRange[0] || !tempDateRange[1]}
                    className="flex-1 py-1.5 text-xs font-medium text-white bg-[#5a4fcf] rounded hover:bg-[#4a3fb8] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Premium Redesigned Time Filter Boxes */}
        <div className="px-3 pb-3 pt-2">
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'today', label: 'Today', icon: Clock, color: 'indigo',
                active: 'bg-indigo-50 border-indigo-500 text-indigo-700',
                iconBg: 'bg-indigo-500 text-white',
                indicator: 'bg-indigo-500'
              },
              {
                id: 'weekly', label: 'Weekly', icon: CalendarIcon, color: 'purple',
                active: 'bg-purple-50 border-purple-500 text-purple-700',
                iconBg: 'bg-purple-500 text-white',
                indicator: 'bg-purple-500'
              },
              {
                id: 'monthly', label: 'Monthly', icon: Package, color: 'blue',
                active: 'bg-blue-50 border-blue-500 text-blue-700',
                iconBg: 'bg-blue-500 text-white',
                indicator: 'bg-blue-500'
              }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleQuickFilter(tab.id as TimeFilter)}
                  className={`relative group flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 active:scale-95 shadow-sm h-24 ${isActive
                    ? `${tab.active} border-opacity-100`
                    : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${isActive ? tab.iconBg : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                    }`}>
                    <Icon size={16} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-tight ${isActive ? '' : 'text-gray-400'
                    }`}>
                    {tab.label}
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      className={`absolute -bottom-1 w-1.5 h-1.5 rounded-full ${tab.indicator}`}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-3 py-1.5 bg-gray-50/80 flex justify-between items-center text-[10px] font-bold border-y border-gray-100/50">
          <span className="text-gray-400 uppercase tracking-widest">{bills.length} BILLS</span>
          <span className="text-[#5a4fcf] bg-[#5a4fcf]/10 px-2 py-0.5 rounded-full">
            TOTAL: ₹{bills.reduce((a, b) => a + b.amount, 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Bill List */}
      <div className="p-2 space-y-1.5">
        {bills.map((bill, index) => {
          const isOpen = expandedBillId === (bill._id || bill.id);
          // Calculate subtotal before discount
          const subtotal = bill.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

          return (
            <div
              key={bill._id || index}
              id={`bill-${bill._id || bill.id}`}
              className={`rounded-xl border transition-all ${bill.isEdited ? 'bg-red-50/50 border-red-100' : 'bg-white border-gray-100'}`}
            >
              <div className="p-2.5" onClick={() => setExpandedBillId(isOpen ? null : (bill._id || bill.id || ""))}>
                <div className="flex justify-between items-start">
                  <div className="flex gap-2.5 overflow-hidden">
                    <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${bill.isEdited ? 'bg-red-100 text-red-500' : 'bg-indigo-50 text-indigo-600'}`}>
                      <IndianRupee className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-black text-gray-900 truncate leading-tight">
                          {bill.customerName || "Guest Customer"}
                        </h3>
                        {bill.isEdited && (
                          <span className="text-[7px] bg-red-500 text-white px-1 rounded-sm font-black uppercase">Edited</span>
                        )}
                      </div>
                      <p className={`text-[11px] font-bold truncate ${bill.isEdited ? 'text-red-600' : 'text-indigo-600'}`}>
                        {bill.customerPhone || 'Walk-in'}
                      </p>
                      <p className="text-[9px] text-gray-400 font-medium">
                        {formatDate(bill.createdAt)} • {formatTime(bill.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <p className="text-base font-black text-gray-900 leading-none">₹{bill.amount.toLocaleString()}</p>
                    <div className={`mt-1.5 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border inline-block ${getPaymentColor(bill.paymentMethod)}`}>
                      {bill.paymentMethod}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingBill(bill);
                        setNewPhone(bill.customerPhone || '');
                      }}
                      className={`mt-2 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black transition-all active:scale-95 border ${bill.isEdited
                        ? 'bg-red-100 text-red-600 border-red-200'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100'
                        }`}
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      EDIT
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-2 pt-2 border-t border-gray-200/60 animate-in fade-in duration-200">
                    <div className="space-y-1 mb-2">
                      {bill.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-[10px] font-bold text-gray-500">
                          <span className="truncate pr-4 flex flex-col">
                            {item.name} × {item.quantity}
                            <span className="text-[8px] uppercase text-gray-400">{item.type}</span>
                          </span>
                          <span className="text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    {/* TOTALS SECTION */}
                    <div className="border-t border-dashed border-gray-200 pt-2 space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-gray-400">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toLocaleString()}</span>
                      </div>
                      {bill.discount && bill.discount > 0 ? (
                        <div className="flex justify-between text-[10px] font-bold text-red-500">
                          <span className="flex items-center gap-1"><Tag className="w-2.5 h-2.5" /> Discount</span>
                          <span>- ₹{bill.discount.toLocaleString()}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between text-[11px] font-black text-indigo-600 pt-0.5">
                        <span>Total Amount</span>
                        <span>₹{bill.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CENTERED Popup */}
      {editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl p-5 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-black text-gray-900">Update Number</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">For: {editingBill.customerName || 'Guest Customer'}</p>
              </div>
              <button onClick={() => setEditingBill(null)} className="p-1.5 bg-gray-100 rounded-full"><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-indigo-500 uppercase ml-1 flex items-center gap-1">
                <Smartphone className="w-3 h-3" /> New Phone Number
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-lg font-black outline-none focus:border-indigo-600 focus:bg-white transition-all"
                placeholder="00000 00000"
                maxLength={10}
                autoFocus
              />
            </div>

            <button
              onClick={handleUpdateAndResend}
              disabled={isResending || newPhone.length < 10}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-sm mt-6 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
            >
              {isResending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> UPDATE & RESEND BILL</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}