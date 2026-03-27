// src/components/Dashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Package, AlertTriangle, XCircle, Loader2, Lock } from "lucide-react";
// 1. IMPORT THE CHART DYNAMICALLY (Fixes 500 Error / SSR issues)
import dynamic from 'next/dynamic'; 
import SalesSummary from "./SalesSummary";
import AIInsights from "./AIInsights";
const StockStyleSalesChart = dynamic(() => import("./StockStyleSalesChart"), { ssr: false });

interface Product {
  id: string;
  name: string;
  quantity: number;
  lowStockThreshold?: number;
}

type InventorySummary = {
  inStock: number;
  lowStock: number;
  outOfStock: number;
};


// --- CONSTANTS ---
const LOW_STOCK_THRESHOLD = 10;

// --- COMPONENT ---
export default function Dashboard() {
  // const { status } = useSession();
  const { data: session, status, update } = useSession();
  const features = session?.user?.features;


  // State for Sales Data
  // State for Inventory Summary
  const [inventorySummary, setInventorySummary] = useState<InventorySummary>({
    inStock: 0, lowStock: 0, outOfStock: 0,
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') {
      setIsSummaryLoading(false);
      return;
    }

    const fetchInventorySummary = async () => {
      setIsSummaryLoading(true);
      setSummaryError(null);
      try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to fetch product data');

        const products: Product[] = await res.json();
        const summary: InventorySummary = products.reduce((acc, product) => {
          const threshold = product.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
          if (product.quantity === 0) {
            acc.outOfStock++;
          } else if (product.quantity <= threshold) {
            acc.lowStock++;
          } else {
            acc.inStock++;
          }
          return acc;
        }, { inStock: 0, lowStock: 0, outOfStock: 0 });
        setInventorySummary(summary);
      } catch (err) {
        console.error("Failed to load inventory summary:", err);
        setSummaryError("Could not load data.");
      } finally {
        setIsSummaryLoading(false);
      }
    };

    fetchInventorySummary();
  }, [status]);

  // SMART ENGAGEMENT: Trigger "Alive" notifications when landing on dashboard
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/notifications/engage', { method: 'POST' })
        .catch(err => console.error("Engagement Trigger Failed:", err));
    }
  }, [status]);

  // 3. Helper Component for Locked Features
  const LockedFeature = ({ title }: { title: string }) => (
    <div className="relative group cursor-pointer overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 flex flex-col items-center justify-center min-h-[120px]">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center">
        <div className="bg-white p-2 rounded-full shadow-md mb-2">
          <Lock className="w-4 h-4 text-amber-500" />
        </div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Pro Feature</p>
        <button 
          onClick={() => window.location.href = '/billing'} 
          className="mt-1 text-[10px] text-blue-600 font-bold hover:underline"
        >
          Upgrade to Unlock
        </button>
      </div>
      <p className="text-xs font-semibold text-gray-400">{title}</p>
    </div>
  );

  return (
    <div className="h-full bg-gray-50 overflow-y-auto p-2.5 pb-20">
      <div className="max-w-2xl mx-auto space-y-4"> {/* Increased spacing slightly */}

        {/* Sales Card */}
        <SalesSummary enableTabs={false} />

        {/* 2. Today's Performance Graph */}
        <StockStyleSalesChart hideTabs />

        {/* AI Business Insights
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AIInsights mode="product" />
          <AIInsights mode="service" />
        </div> */}

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Product AI Check */}
          {features?.productAI ? (
            <AIInsights mode="product" />
          ) : (
            <LockedFeature title="Product AI Insights" />
          )}

          {/* Service AI Check */}
          {features?.serviceAI ? (
            <AIInsights mode="service" />
          ) : (
            <LockedFeature title="Service AI Insights" />
          )}
        </div>


        {/* Inventory Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 bg-[#5a4fcf] rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Inventory</h3>
              <p className="text-xs text-gray-500">Stock levels</p>
            </div>
          </div>

          {isSummaryLoading ? (
            <div className="py-6 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mb-1.5 text-[#5a4fcf]" />
              <span className="text-xs">Loading...</span>
            </div>
          ) : summaryError ? (
            <div className="py-6 flex flex-col items-center justify-center text-red-500">
              <AlertTriangle className="w-5 h-5 mb-1.5" />
              <span className="text-xs">{summaryError}</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {/* In Stock */}
              <div className="bg-indigo-50 rounded-xl border-2 border-indigo-200 p-2 flex flex-col items-center justify-center text-center h-24">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mb-1">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">All Stock</p>
                <p className="text-lg font-extrabold text-gray-900">{inventorySummary.inStock}</p>
              </div>

              {/* Low Stock */}
              <div className="bg-orange-50 rounded-xl border-2 border-orange-200 p-2 flex flex-col items-center justify-center text-center h-24">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mb-1">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide">Low Stock</p>
                <p className="text-lg font-extrabold text-gray-900">{inventorySummary.lowStock}</p>
              </div>

              {/* Out of Stock */}
              <div className="bg-red-50 rounded-xl border-2 border-red-200 p-2 flex flex-col items-center justify-center text-center h-24">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mb-1">
                  <XCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Out Stock</p>
                <p className="text-lg font-extrabold text-gray-900">{inventorySummary.outOfStock}</p>
              </div>
            </div>
            )}
             
             {/* Corrected: Use JSX comment syntax and proper spacing */}
          {session?.user.plan === 'FREE' && (
            <button 
              onClick={() => update()} 
              className="w-full mt-4 py-2 text-[10px] text-gray-400 hover:text-gray-600 italic border-t border-gray-100"
            >
              Recently upgraded? Click here to sync your account.
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
