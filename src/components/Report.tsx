'use client';
import React, { useState, useEffect } from 'react';
import CRMComponent from '@/components/CRM';
import ProfitSection from '@/components/Profit';
import SalesSummary from '@/components/SalesSummary';
import StockStyleSalesChart from '@/components/StockStyleSalesChart';
import { ChevronDown, ChevronUp, BarChart3, TrendingUp, Lock, ArrowRight, Wallet } from 'lucide-react';

export default function ReportPage() {
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // --- HYDRATION FIX STATE ---
  // This ensures the component only renders on the client, avoiding extension conflicts
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // --- REPORT UI STATE ---
  const [showCRM, setShowCRM] = useState<boolean>(false);
  const [showProfit, setShowProfit] = useState<boolean>(false);
  const [showSales, setShowSales] = useState<boolean>(false);


  // Fix for Hydration Error: Only render content after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsChecking(true);

    try {
      const res = await fetch('/api/user/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
      } else {
        setError(data.message || 'Incorrect PIN');
        setPinInput('');
      }
    } catch {
      setError('Failed to verify PIN. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  // 1. PREVENT HYDRATION MISMATCH
  // If we haven't mounted yet, return null so extensions can't inject attributes into React's VDOM
  if (!isMounted) return null;

  // 2. LOCKED VIEW
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
          <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-8 h-8" style={{ color: '#5a4fcf' }} />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Restricted Access</h2>
          <p className="text-gray-500 mb-8">Please enter the security PIN to view reports.</p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPinInput(e.target.value)}
                placeholder="• • • •"
                className="w-full text-center text-3xl tracking-[1em] py-3 border-b-2 border-gray-200 focus:border-[#5a4fcf] focus:outline-none transition-colors text-gray-800 placeholder-gray-300"
                autoFocus
                disabled={isChecking}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm font-medium animate-pulse">{error}</p>
            )}

            <button
              type="submit"
              disabled={isChecking}
              className={`w-full py-3 px-4 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-6 ${isChecking ? 'opacity-70 cursor-not-allowed' : ''}`}
              style={{ backgroundColor: '#5a4fcf' }}
            >
              {isChecking ? 'Verifying...' : 'Access Reports'} {!isChecking && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. UNLOCKED VIEW
  return (
    <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 font-sans">

      {/* Header - Matching Inventory.tsx style */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Reports</h1>
          <p className="hidden md:block text-sm text-gray-600">View and analyze your business data</p>
        </div>
      </div>

      {/* Grid Layout - Matching Dashboard/Inventory spacing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">

        {/* SALES SECTION - Purple */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 relative z-30 lg:col-span-2">
          <button
            onClick={() => {
              if (!showSales) {
                setShowProfit(false);
                setShowCRM(false);
              }
              setShowSales(!showSales);
            }}
            className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-t-xl ${!showSales ? 'rounded-b-xl' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#5a4fcf' }}>
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-gray-900">Sales Overview</h3>
                <p className="text-xs text-gray-500">Daily, Weekly, Monthly Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide hidden sm:block">
                {showSales ? 'Hide' : 'Show'}
              </span>
              {showSales ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </button>

          {showSales && (
            <div className="p-4 border-t border-gray-100 rounded-b-xl space-y-4">
              <SalesSummary enableTabs={true} showHeader={false} />
              <div className="pt-4 border-t border-gray-50">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Sales Trends</h4>
                <StockStyleSalesChart />
              </div>
            </div>
          )}
        </div>

        {/* LEFT SIDE: Profit Section - Emerald (Green) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 relative z-20">
          <button
            onClick={() => {
              if (!showProfit) {
                setShowSales(false);
                setShowCRM(false);
              }
              setShowProfit(!showProfit);
            }}
            className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-t-xl ${!showProfit ? 'rounded-b-xl' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-gray-900">Profit</h3>
                <p className="text-xs text-gray-500">Track your earnings</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide hidden sm:block">
                {showProfit ? 'Hide' : 'Show'}
              </span>
              {showProfit ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </button>

          {showProfit && (
            <div className="p-4 border-t border-gray-100 rounded-b-xl">
              <ProfitSection showHeader={false} />
            </div>
          )}
        </div>

        {/* RIGHT SIDE: CRM Section - Blue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 relative z-10">
          <button
            onClick={() => {
              if (!showCRM) {
                setShowSales(false);
                setShowProfit(false);
              }
              setShowCRM(!showCRM);
            }}
            className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-t-xl ${!showCRM ? 'rounded-b-xl' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-gray-900">CRM</h3>
                <p className="text-xs text-gray-500">Customer Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide hidden sm:block">
                {showCRM ? 'Hide' : 'Show'}
              </span>
              {showCRM ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </button>

          {showCRM && (
            <div className="p-4 border-t border-gray-100 rounded-b-xl">
              <CRMComponent />
            </div>
          )}
        </div>

      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          Secure Report Area
        </p>
      </div>
    </div>
  );
}