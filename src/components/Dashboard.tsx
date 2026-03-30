// src/components/Dashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Package, AlertTriangle, Loader2, Lock } from "lucide-react";
import { IUser } from "@/models/User";
import dynamic from "next/dynamic"; 
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

const LOW_STOCK_THRESHOLD = 10;

export default function Dashboard() {
  const { data: session, status, update } = useSession();
  const [dbData, setDbData] = useState<Partial<IUser> | null>(null);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary>({
    inStock: 0, lowStock: 0, outOfStock: 0,
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/users/settings")
        .then(res => res.json())
        .then(data => setDbData(data))
        .catch(err => console.error("Dashboard Sync Failed:", err));
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") {
      setIsSummaryLoading(false);
      return;
    }

    const fetchInventorySummary = async () => {
      setIsSummaryLoading(true);
      setSummaryError(null);
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to fetch product data");
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

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/notifications/engage", { method: "POST" })
        .catch(err => console.error("Engagement Trigger Failed:", err));
      // Only sync if dbData has been fetched and there's a mismatch
      if (dbData && session?.user?.plan !== dbData.plan) {
        update();
      }
    }
  }, [status, session?.user?.plan, dbData?.plan, update]);

  // Prioritize fresh database data for features to avoid stale session issues
  // The source of truth is dbData. If not yet loaded, fall back to session.
  const currentPlan = dbData?.plan || session?.user?.plan;
  const isPro = currentPlan === "PRO";
  
  const features = {
    productAI: isPro || dbData?.features?.productAI || session?.user?.features?.productAI || false,
    serviceAI: isPro || dbData?.features?.serviceAI || session?.user?.features?.serviceAI || false,
    customWhatsapp: isPro || dbData?.features?.customWhatsapp || session?.user?.features?.customWhatsapp || false
  };

  const LockedFeature = ({ title }: { title: string }) => (
    <div className="relative group cursor-pointer overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 flex flex-col items-center justify-center min-h-[120px]">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center">
        <div className="bg-white p-2 rounded-full shadow-md mb-2">
          <Lock className="w-4 h-4 text-amber-500" />
        </div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Pro Feature</p>
      </div>
      <p className="text-xs font-semibold text-gray-400">{title}</p>
    </div>
  );

  if (status === "loading") return null;

  return (
    <div className="h-full bg-gray-50 overflow-y-auto p-2.5 pb-20">
      <div className="max-w-2xl mx-auto space-y-4">
        <SalesSummary enableTabs={false} />
        <StockStyleSalesChart hideTabs />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features?.productAI ? <AIInsights mode="product" /> : <LockedFeature title="Product AI Insights" />}
          {features?.serviceAI ? <AIInsights mode="service" /> : <LockedFeature title="Service AI Insights" />}
        </div>
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
              <span className="text-xs text-center">{summaryError}</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-indigo-50 rounded-xl border-2 border-indigo-200 p-2 flex flex-col items-center justify-center text-center h-24">
                <p className="text-[10px] uppercase text-indigo-500 font-bold">All Stock</p>
                <p className="text-lg font-bold">{inventorySummary.inStock}</p>
              </div>
              <div className="bg-orange-50 rounded-xl border-2 border-orange-200 p-2 flex flex-col items-center justify-center text-center h-24">
                <p className="text-[10px] uppercase text-orange-500 font-bold">Low Stock</p>
                <p className="text-lg font-bold">{inventorySummary.lowStock}</p>
              </div>
              <div className="bg-red-50 rounded-xl border-2 border-red-200 p-2 flex flex-col items-center justify-center text-center h-24">
                <p className="text-[10px] uppercase text-red-500 font-bold">Out Stock</p>
                <p className="text-lg font-bold">{inventorySummary.outOfStock}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 