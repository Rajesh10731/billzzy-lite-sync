// src/components/AIInsights.tsx
"use client";

import { useState, useEffect } from "react";
import { Clock, Sparkles, TrendingUp, ShoppingBag, Lightbulb, Loader2, RefreshCw, Bot, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InsightsData {
    salesInsight: string;
    peakTime: string;
    topProduct: string;
    slowProduct: string;
    suggestion: string;
    retargeting: string;
    churnRate: string;
    lastUpdated?: string;
    isMock?: boolean;
    isFallback?: boolean;
}

export default function AIInsights() {
    const [insights, setInsights] = useState<InsightsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/ai-insights");
            if (!res.ok) throw new Error("Failed to fetch insights");
            const data = await res.json();
            setInsights(data);
        } catch (err) {
            console.error("AI Insights Error:", err);
            setError("Unable to load insights right now.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, []);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative overflow-hidden">

            <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                     <div className="w-10 h-10 bg-[#eef2ff] rounded-xl flex items-center justify-center shadow-sm">
                         <Bot className="w-6 h-6 text-[#5a4fcf]" />
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-[#1e293b]">AI Business Advisor</h3>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-tight">Smart Analysis</span>
                     </div>
                 </div>
                 {!loading && (
                     <button
                         onClick={fetchInsights}
                         className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-bold hover:bg-indigo-100 transition-all border border-indigo-100/50"
                     >
                         <RefreshCw className="w-3 h-3" />
                         Generate Insight
                     </button>
                 )}
             </div>

             <div className="h-[1px] bg-gray-100 w-full mb-4" />

             <AnimatePresence mode="wait">
                 {loading ? (
                     <motion.div
                         key="loading"
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         exit={{ opacity: 0 }}
                         className="py-10 flex flex-col items-center justify-center space-y-3"
                     >
                         <div className="relative">
                             <Loader2 className="w-8 h-8 animate-spin text-[#5a4fcf]" />
                             <Sparkles className="w-3 h-3 text-[#5a4fcf] absolute -top-1 -right-1 animate-pulse" />
                         </div>
                         <span className="text-xs font-medium text-gray-400">Consulting AI Advisor...</span>
                     </motion.div>
                 ) : error ? (
                     <motion.div
                         key="error"
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         className="py-6 text-center"
                     >
                         <p className="text-xs text-red-500 mb-2">{error}</p>
                         <button
                             onClick={fetchInsights}
                             className="text-xs font-bold text-[#5a4fcf] hover:underline"
                         >
                             Try Again
                         </button>
                     </motion.div>
                 ) : (
                     <motion.div
                         key="content"
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ duration: 0.4 }}
                         className="space-y-5 px-1"
                     >
                         {/* Peak Sales Time */}
                         <div className="flex items-start gap-3.5">
                             <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                 <Clock className="w-5 h-5 text-indigo-500" />
                             </div>
                             <p className="text-[14px] text-slate-600 font-medium leading-snug">
                                 Peak Sales Time: <span className="text-indigo-900 font-bold">{insights?.peakTime}</span>
                             </p>
                         </div>

                         {/* Sales Insight */}
                         <div className="flex items-start gap-3.5">
                             <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                 <TrendingUp className="w-5 h-5 text-emerald-500" />
                             </div>
                             <p className="text-[14px] text-slate-600 font-medium leading-snug">
                                 {insights?.salesInsight}
                             </p>
                         </div>

                         {/* Top Product */}
                         <div className="flex items-start gap-3.5">
                             <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                 <ShoppingBag className="w-5 h-5 text-blue-500" />
                             </div>
                             <p className="text-[14px] text-slate-600 font-medium leading-snug">
                                 Top product: <span className="text-slate-900 font-bold">{insights?.topProduct}</span>
                             </p>
                         </div>

                         {/* Slow Product */}
                         <div className="flex items-start gap-3.5">
                             <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                 <AlertTriangle className="w-5 h-5 text-orange-500" />
                             </div>
                             <p className="text-[14px] text-slate-600 font-medium leading-snug">
                                 Slow product: <span className="text-slate-900 font-bold">{insights?.slowProduct}</span>
                             </p>
                         </div>

                         {/* Suggestion */}
                         <div className="flex items-start gap-3.5">
                             <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                 <Lightbulb className="w-5 h-5 text-amber-500" />
                             </div>
                             <p className="text-[14px] text-slate-600 font-medium leading-snug">
                                 Guidance: <span className="text-emerald-700 font-bold">{insights?.suggestion}</span>
                             </p>
                         </div>

                         {/* Business Pulse Grid */}
                         <div className="grid grid-cols-2 gap-3 mt-2">
                             <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Lost Customers</p>
                                 <p className="text-xl font-black text-slate-800">{insights?.churnRate}</p>
                             </div>
                             <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                                 <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Customer Focus</p>
                                 <p className="text-[13px] font-bold text-indigo-700 leading-tight">{insights?.retargeting}</p>
                             </div>
                         </div>

                         {/* Footer */}
                         <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                 <span className="text-[11px] text-slate-400 font-medium">
                                     Last updated {insights?.lastUpdated || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                                 <div className="w-1.5 h-1.5 rounded-full border border-gray-200" />
                             </div>
                             {(insights?.isMock || insights?.isFallback) && (
                                 <span className="text-[10px] text-indigo-400 font-bold tracking-tighter uppercase">
                                     Advisor Mode
                                 </span>
                             )}
                         </div>
                     </motion.div>
                 )}
             </AnimatePresence>
        </div>
    );
}
