'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Download, Calendar as CalendarIcon, Store, Edit2, X, Trash2, Package, ShoppingCart, AlertCircle, FileText, FileSpreadsheet, Filter, IndianRupee, Check } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Purchase {
  _id?: string;
  id?: string;
  shopName: string;
  date: string;
  products: Product[];
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'paid' | 'pending';
}

export default function Purchase() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [shopName, setShopName] = useState('');
  const [date, setDate] = useState('');
  const [products, setProducts] = useState<Product[]>([{ id: '1', name: '', quantity: 0, price: 0 }]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('pending');
  const [activeFilter, setActiveFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [showCalendar, setShowCalendar] = useState(false);

  // Date Filter State
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState<CalendarValue>(null);
  const [tempDateRange, setTempDateRange] = useState<CalendarValue>(null);

  const [downloadMenuId, setDownloadMenuId] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // ✅ Fetch all purchases
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const res = await fetch('/api/purchase');
        if (!res.ok) {
          throw new Error(`Failed to fetch purchases: ${res.status}`);
        }
        const data = await res.json();
        setPurchases(data);
      } catch (error) {
        console.error('Error fetching purchases:', error);
      }
    };
    fetchPurchases();
  }, []);

  const addProduct = () => {
    setProducts([...products, { id: Date.now().toString(), name: '', quantity: 0, price: 0 }]);
  };

  const updateProduct = (id: string, field: keyof Product, value: string | number) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  const calculateTotal = React.useCallback(() => {
    return products.reduce((sum, p) => sum + p.quantity * p.price, 0);
  }, [products]);

  const balanceAmount = useMemo(() => {
    return Math.max(0, calculateTotal() - paidAmount);
  }, [calculateTotal, paidAmount]);

  // ✅ Add or Update Purchase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentTotal = calculateTotal();
    const purchaseData: Purchase = {
      shopName,
      date,
      products: products.filter((p) => p.name && p.quantity > 0 && p.price > 0),
      totalAmount: currentTotal,
      paidAmount: paidAmount,
      balanceAmount: currentTotal - paidAmount,
      paymentStatus: (currentTotal - paidAmount) <= 0 ? 'paid' : paymentStatus,
    };

    try {
      let res: Response;
      let data: Purchase | { error?: string };

      if (editingId) {
        // 🟢 UPDATE existing purchase
        res = await fetch(`/api/purchase/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(purchaseData),
        });
        data = await res.json();

        if (res.ok) {
          setPurchases((prev) =>
            prev.map((p) => (p._id === editingId ? { ...p, ...(data as Purchase) } : p))
          );
        }
      } else {
        // 🟣 CREATE new purchase
        res = await fetch('/api/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(purchaseData),
        });
        data = await res.json();

        if (res.ok) {
          setPurchases([data as Purchase, ...purchases]);
        }
      }
    } catch (error) {
      console.error('Error saving purchase:', error);
    }

    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setShopName('');
    setDate('');
    setProducts([{ id: Date.now().toString(), name: '', quantity: 0, price: 0 }]);
    setPaidAmount(0);
    setPaymentStatus('pending');
    setShowForm(false);
  };

  const handleEdit = (purchase: Purchase) => {
    const editId = purchase._id || purchase.id;
    if (!editId) return;

    setEditingId(editId);
    setShopName(purchase.shopName);
    setDate(purchase.date);
    setProducts(
      purchase.products.length > 0
        ? purchase.products.map((p) => ({
          ...p,
          id: p.id || Date.now().toString() + Math.random().toString(),
        }))
        : [{ id: Date.now().toString(), name: '', quantity: 0, price: 0 }]
    );
    setPaidAmount(purchase.paidAmount || 0);
    setPaymentStatus(purchase.paymentStatus);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setDownloadMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  type ValuePiece = Date | null;
  type CalendarValue = ValuePiece | [ValuePiece, ValuePiece];

  const handleDateChange = (value: CalendarValue) => {
    if (value instanceof Date) {
      setDate(format(value, 'yyyy-MM-dd'));
      setShowCalendar(false);
    } else if (Array.isArray(value) && value[0] instanceof Date) {
      setDate(format(value[0], 'yyyy-MM-dd'));
      setShowCalendar(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this bill?')) return;
    try {
      const res = await fetch(`/api/purchase/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPurchases((prev) => prev.filter((p) => p._id !== id));
      }
    } catch (error) {
      console.error('Error deleting purchase:', error);
    }
  };

  const exportToPDF = (purchase: Purchase) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(90, 79, 207); // #5a4fcf
    doc.text('Purchase Invoice', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 30);

    // Bill Info
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`Shop: ${purchase.shopName}`, 14, 45);
    doc.text(`Date: ${format(parseISO(purchase.date), 'dd MMM yyyy')}`, 14, 52);
    doc.text(`Paid: INR ${(purchase.paidAmount || 0).toFixed(2)}`, 14, 59);
    doc.text(`Balance: INR ${(purchase.balanceAmount || 0).toFixed(2)}`, 14, 66);
    doc.text(`Status: ${((purchase.balanceAmount || 0) > 0 ? 'PENDING' : 'PAID')}`, 14, 73);

    // Table
    const tableData = purchase.products.map((p, i) => [
      i + 1,
      p.name,
      p.quantity,
      `INR ${p.price.toFixed(2)}`,
      `INR ${(p.quantity * p.price).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 80,
      head: [['#', 'Item Name', 'Qty', 'Price', 'Total']],
      body: tableData,
      headStyles: { fillColor: [90, 79, 207] },
      foot: [
        ['', '', '', 'Paid Amount:', `INR ${(purchase.paidAmount || 0).toFixed(2)}`],
        ['', '', '', 'Balance Due:', `INR ${(purchase.balanceAmount || 0).toFixed(2)}`],
        ['', '', '', 'Grand Total:', `INR ${purchase.totalAmount.toFixed(2)}`]
      ],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`Invoice_${purchase.shopName}_${purchase.date}.pdf`);
    setDownloadMenuId(null);
  };

  const exportToExcel = (purchase: Purchase) => {
    const data: Array<{
      'Item Name': string;
      'Quantity': number | null;
      'Price': number | null;
      'Total': number;
      'Status': string;
    }> = purchase.products.map(p => ({
      'Item Name': p.name,
      'Quantity': p.quantity,
      'Price': p.price,
      'Total': p.quantity * p.price,
      'Status': purchase.paymentStatus.toUpperCase()
    }));

    // Add Paid, Balance and Total rows
    data.push({ 'Item Name': 'PAID AMOUNT', 'Quantity': null, 'Price': null, 'Total': purchase.paidAmount || 0, 'Status': '' });
    data.push({ 'Item Name': 'BALANCE DUE', 'Quantity': null, 'Price': null, 'Total': purchase.balanceAmount || 0, 'Status': '' });
    data.push({ 'Item Name': 'GRAND TOTAL', 'Quantity': null, 'Price': null, 'Total': purchase.totalAmount, 'Status': '' });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Details");

    XLSX.writeFile(workbook, `Purchase_${purchase.shopName}_${purchase.date}.xlsx`);
    setDownloadMenuId(null);
  };

  const totalPaid = purchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalPending = purchases.reduce((sum, p) => sum + (p.balanceAmount || 0), 0);

  const filteredPurchases = useMemo(() => {
    let result = purchases;

    // 1. Filter by Status
    if (activeFilter === 'paid') result = result.filter(p => (p.balanceAmount || 0) <= 0);
    else if (activeFilter === 'pending') result = result.filter(p => (p.balanceAmount || 0) > 0);

    // 2. Filter by Date Range
    if (Array.isArray(dateRange) && dateRange[0] && dateRange[1]) {
      const start = new Date(dateRange[0]);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange[1]);
      end.setHours(23, 59, 59, 999);

      result = result.filter(p => {
        const pDate = parseISO(p.date);
        return pDate >= start && pDate <= end;
      });
    }

    // 3. Hide the bill currently being edited
    if (editingId) {
      result = result.filter(p => p._id !== editingId && p.id !== editingId);
    }

    return result;
  }, [purchases, activeFilter, dateRange, editingId]);

  return (
    <div className="min-h-full bg-gray-50 p-2 sm:p-4 overflow-x-hidden w-full pb-10">
      <div className="max-w-5xl mx-auto w-full">

        {/* Compact Header */}
        <div className="mb-3 w-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#5a4fcf] rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Purchase</h3>
                <p className="text-xs text-gray-500">Manage bills</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Date Filter Button */}
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
                  title="Filter by Date"
                >
                  <Filter size={16} />
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
                          setDateRange(tempDateRange);
                          setShowDateFilter(false);
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

              <button
                onClick={() => (showForm ? resetForm() : setShowForm(true))}
                className="flex items-center gap-1 bg-[#5a4fcf] text-white px-3 py-1.5 rounded-md hover:bg-[#4a3fb8] transition-all text-sm font-medium shadow-sm"
              >
                {showForm ? <X size={16} /> : <Plus size={16} />}
                {showForm ? 'Close' : 'Add'}
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setActiveFilter('all')}
              className={`relative group flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300 active:scale-95 text-center h-24 ${activeFilter === 'all'
                ? 'bg-indigo-50 border-indigo-500'
                : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-colors ${activeFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                <ShoppingCart className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wide ${activeFilter === 'all' ? 'text-indigo-500' : 'text-gray-400'}`}>Total Bills</span>
              <p className={`text-lg font-extrabold ${activeFilter === 'all' ? 'text-gray-900' : 'text-gray-700'}`}>{purchases.length}</p>
              {activeFilter === 'all' && (
                <motion.div layoutId="purchase-active-indicator" className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-500" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
              )}
            </button>

            <button
              onClick={() => setActiveFilter('paid')}
              className={`relative group flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300 active:scale-95 text-center h-24 ${activeFilter === 'paid'
                ? 'bg-green-50 border-green-500'
                : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-colors ${activeFilter === 'paid' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                <IndianRupee className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wide ${activeFilter === 'paid' ? 'text-green-500' : 'text-gray-400'}`}>Paid</span>
              <p className={`text-lg font-extrabold ${activeFilter === 'paid' ? 'text-gray-900' : 'text-gray-700'}`}>₹{totalPaid.toFixed(0)}</p>
              {activeFilter === 'paid' && (
                <motion.div layoutId="purchase-active-indicator" className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-green-500" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
              )}
            </button>

            <button
              onClick={() => setActiveFilter('pending')}
              className={`relative group flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300 active:scale-95 text-center h-24 ${activeFilter === 'pending'
                ? 'bg-red-50 border-red-500'
                : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-colors ${activeFilter === 'pending' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wide ${activeFilter === 'pending' ? 'text-red-500' : 'text-gray-400'}`}>Pending</span>
              <p className={`text-lg font-extrabold ${activeFilter === 'pending' ? 'text-gray-900' : 'text-gray-700'}`}>₹{totalPending.toFixed(0)}</p>
              {activeFilter === 'pending' && (
                <motion.div layoutId="purchase-active-indicator" className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-red-500" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
              )}
            </button>
          </div>
        </div>

        {/* Form Section */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-2.5 mb-3 border border-gray-200 w-full animate-in slide-in-from-top-2">
            <h2 className="text-xs font-black text-[#5a4fcf] mb-2 flex items-center gap-1.5 border-b pb-1.5 uppercase tracking-wider">
              <Store size={14} />
              {editingId ? 'Edit Bill' : 'New Bill'}
            </h2>

            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#5a4fcf] outline-none font-semibold"
                  placeholder="Shop Name"
                  required
                />
                <div className="relative" ref={calendarRef}>
                  <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#5a4fcf] outline-none flex items-center justify-between bg-white text-left font-semibold"
                  >
                    <span className={date ? 'text-gray-900' : 'text-gray-400'}>
                      {date ? format(parseISO(date), 'dd MMM yyyy') : 'Select Date'}
                    </span>
                    <CalendarIcon size={14} className="text-gray-400" />
                  </button>

                  {showCalendar && (
                    <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-2 animate-in fade-in zoom-in duration-200 origin-top-left rtl:origin-top-right">
                      <style>{`
                        .react-calendar {
                          border: none;
                          font-family: inherit;
                          width: 256px;
                          background: white;
                        }
                        .react-calendar__navigation button {
                          color: #5a4fcf;
                          font-weight: bold;
                        }
                        .react-calendar__navigation button:enabled:hover,
                        .react-calendar__navigation button:enabled:focus {
                          background-color: #f3f2ff;
                        }
                        .react-calendar__tile--now {
                          background: #f3f2ff;
                          color: #5a4fcf;
                          border-radius: 6px;
                        }
                        .react-calendar__tile--active {
                          background: #5a4fcf !important;
                          color: white !important;
                          border-radius: 6px;
                        }
                        .react-calendar__tile:enabled:hover,
                        .react-calendar__tile:enabled:focus {
                          background-color: #f3f2ff;
                          border-radius: 6px;
                        }
                        .react-calendar__month-view__weekdays {
                          font-weight: bold;
                          text-transform: uppercase;
                          font-size: 0.65rem;
                          color: #6b7280;
                        }
                        .react-calendar__month-view__days__day--neighboringMonth {
                          color: #d1d5db;
                        }
                      `}</style>
                      <Calendar
                        onChange={handleDateChange}
                        value={date ? parseISO(date) : new Date()}
                        className="rounded-md border-none"
                        next2Label={null}
                        prev2Label={null}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Products</label>
                  <button
                    type="button"
                    onClick={addProduct}
                    className="text-[10px] text-[#5a4fcf] font-black uppercase tracking-wider flex items-center gap-1 hover:underline"
                  >
                    <Plus size={10} /> Add Item
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {products.map((product, idx) => (
                    <div key={product.id} className="flex gap-1.5 items-center bg-gray-50 p-1 rounded-md">
                      <span className="text-[9px] font-black text-gray-300 w-3 text-center">{idx + 1}</span>
                      <input
                        type="text"
                        value={product.name}
                        onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1 text-[11px] border border-gray-200 rounded outline-none focus:border-[#5a4fcf] bg-white font-medium"
                        placeholder="Item Name"
                        required
                      />
                      <input
                        type="number"
                        value={product.quantity || ''}
                        onChange={(e) => updateProduct(product.id, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-10 px-1 py-1 text-[11px] border border-gray-200 rounded outline-none focus:border-[#5a4fcf] bg-white text-center font-bold"
                        placeholder="Qty"
                      />
                      <input
                        type="number"
                        value={product.price || ''}
                        onChange={(e) => updateProduct(product.id, 'price', parseFloat(e.target.value) || 0)}
                        className="w-14 px-1 py-1 text-[11px] border border-gray-200 rounded outline-none focus:border-[#5a4fcf] bg-white text-right font-bold"
                        placeholder="₹"
                      />
                      <button
                        type="button"
                        onClick={() => removeProduct(product.id)}
                        className="text-red-400 hover:text-red-600 p-1"
                        disabled={products.length <= 1}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refined Payment Section */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 shadow-inner space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
                  <span className="text-lg font-black text-[#5a4fcf]">₹{calculateTotal().toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Amount Paid</span>
                  <div className="relative flex-1 max-w-[140px]">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-green-600 font-bold text-xs">₹</div>
                    <input
                      type="number"
                      value={paidAmount || ''}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-full pl-6 pr-2 py-1.5 text-right text-xs font-bold text-green-600 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 outline-none shadow-sm transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-gray-200 border-dashed">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance Due</span>
                  <span className={`text-xs font-black transition-colors ${balanceAmount > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    ₹{balanceAmount.toFixed(2)}
                  </span>
                </div>

                {balanceAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaidAmount(calculateTotal());
                      setPaymentStatus('paid');
                    }}
                    className="w-full py-2 bg-green-600 text-white text-[9px] font-black uppercase tracking-widest rounded-md shadow-md hover:bg-green-700 active:scale-[0.98] transition-all mt-1 flex items-center justify-center gap-1.5"
                  >
                    <Check size={12} /> Clear Full Balance
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-[#5a4fcf] hover:bg-[#4a3fb8] text-white py-2 rounded-lg font-bold text-xs shadow-lg mt-2 transition-all active:scale-[0.99]"
              >
                {editingId ? 'Update Bill' : 'Save Bill'}
              </button>
            </div>
          </div>
        )}

        {/* Compact Card List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
          {filteredPurchases.map((purchase) => (
            <div
              key={purchase._id || purchase.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 relative hover:shadow-md transition-shadow"
            >
              {/* Card Header & Actions (Top Right) */}
              <div className="flex justify-between items-start mb-2">
                <div className="pr-20 min-w-0">
                  <h3 className="font-bold text-gray-800 text-sm truncate leading-tight" title={purchase.shopName}>
                    {purchase.shopName}
                  </h3>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                    <CalendarIcon size={10} /> {date ? format(parseISO(purchase.date), 'dd MMM yyyy') : purchase.date}
                  </p>
                </div>

                {/* Fixed Action Buttons Upside Right */}
                <div className="absolute top-2 right-2 flex gap-1 bg-white pl-1">
                  <button
                    onClick={() => handleEdit(purchase)}
                    className="p-1.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={12} />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setDownloadMenuId(downloadMenuId === (purchase._id || purchase.id) ? null : (purchase._id || purchase.id || null))}
                      className="p-1.5 text-purple-500 bg-purple-50 hover:bg-purple-100 rounded transition-colors"
                      title="Download"
                    >
                      <Download size={12} />
                    </button>

                    {downloadMenuId === (purchase._id || purchase.id) && (
                      <div
                        ref={downloadMenuRef}
                        className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 min-w-[120px] animate-in fade-in slide-in-from-top-1"
                      >
                        <button
                          onClick={() => exportToPDF(purchase)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-purple-50 flex items-center gap-2"
                        >
                          <FileText size={14} className="text-red-500" />
                          PDF Document
                        </button>
                        <button
                          onClick={() => exportToExcel(purchase)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-purple-50 flex items-center gap-2"
                        >
                          <FileSpreadsheet size={14} className="text-green-600" />
                          Excel Sheet
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(purchase._id)}
                    className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Condensed Product List */}
              <div className="bg-gray-50 rounded p-2 mb-2 max-h-20 overflow-y-auto text-[11px] space-y-1 scrollbar-thin">
                {purchase.products.map((p, i) => (
                  <div key={i} className="flex justify-between text-gray-600">
                    <span className="truncate flex-1 pr-2">{p.name} <span className="text-gray-400">x{p.quantity}</span></span>
                    <span className="font-medium whitespace-nowrap">₹{(p.quantity * p.price).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              {/* Card Footer: Status & Total */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 mt-1">
                <div className="flex justify-between items-center text-xs text-gray-600 font-bold bg-gray-50/50 p-1 rounded">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-sm"></span>
                    <span className="text-green-700">Paid: ₹{(purchase.paidAmount || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full shadow-sm ${(purchase.balanceAmount || 0) > 0 ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                    <span className={(purchase.balanceAmount || 0) > 0 ? 'text-red-600' : 'text-gray-400'}>Bal: ₹{(purchase.balanceAmount || 0).toFixed(0)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${purchase.paymentStatus === 'paid' && (purchase.balanceAmount || 0) <= 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                      }`}
                  >
                    {(purchase.balanceAmount || 0) > 0 ? 'Pending' : 'Paid'}
                  </span>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Total:</span>
                    <span className="text-sm font-black text-gray-900">₹{purchase.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {purchases.length === 0 && !showForm && (
          <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-300 mt-4">
            <Package size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No purchases found.</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-[#5a4fcf] text-xs font-bold hover:underline mt-1"
            >
              ADD FIRST BILL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}