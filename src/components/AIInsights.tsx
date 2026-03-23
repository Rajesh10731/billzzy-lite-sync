// src/components/AIInsights.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Sparkles, TrendingUp, ShoppingBag, Lightbulb, Loader2, RefreshCw, Bot, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InsightsData {
    salesInsight: string;
    peakTime: string;
    dailyPeaks?: Record<string, string>;
    topProduct: string;
    slowProduct: string;
    topService?: string;
    slowService?: string;
    suggestion: string;
    retargeting: string;
    churnRate: string;
    lastUpdated?: string;
    isMock?: boolean;
    isFallback?: boolean;
}

export default function AIInsights({ mode = "product" }: { mode?: "product" | "service" }) {
    const [insights, setInsights] = useState<InsightsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDaily, setShowDaily] = useState(false);

    const fetchInsights = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const res = await fetch(`/api/ai-insights?tz=${encodeURIComponent(tz)}&type=${mode}`);
            if (!res.ok) throw new Error("Failed to load insights");
            const data = await res.json();
            setInsights(data);
        } catch (err) {
            console.error("AI Insights Error:", err);
            setError("Could not generate insights at this time.");
        } finally {
            setLoading(false);
        }
    }, [mode]);

    useEffect(() => {
        fetchInsights();
    }, [fetchInsights]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
            {/* Header */}  
            <div className={`p-3.5 flex items-center justify-between border-b border-gray-50 bg-gradient-to-r ${mode === "service" ? "from-purple-50/50 to-white" : "from-indigo-50/50 to-white"}`}>
                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${mode === "service" ? "bg-purple-500" : "bg-indigo-500"}`}>
                        <Bot className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-[14px] font-bold text-slate-900 leading-tight">AI {mode === "service" ? "Service" : "Smart"} Advisor</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live Analysis</p>
                        </div>
                    </div>
                </div>
                {insights?.lastUpdated && (
                    <div className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-full border border-slate-100 shadow-sm">
                        <RefreshCw className={`w-3 h-3 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                        <span className="text-[10px] font-black text-slate-500">{insights.lastUpdated}</span>
                    </div>
                )}
            </div>

            <div className="p-4">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="py-12 flex flex-col items-center justify-center gap-3"
                        >
                            <div className="relative">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-bounce" />
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generating Smart Insights...</p>
                        </motion.div>
                    ) : error ? (
                        <motion.div 
                            key="error"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="py-10 text-center"
                        >
                            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-50" />
                            <p className="text-xs font-bold text-slate-500">{error}</p>
                            <button onClick={fetchInsights} className="mt-3 text-xs font-black text-indigo-600 hover:text-indigo-700 underline underline-offset-4">Try Again</button>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="content"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-5 px-1"
                        >
                           {/* Peak Sales Time */}
                           <div className="flex flex-col gap-2">
                                <div className="flex items-start gap-3.5">
                                    <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                        <Clock className={`w-5 h-5 ${mode === "service" ? "text-purple-500" : "text-indigo-500"}`} />
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[14px] text-slate-600 font-medium leading-snug">
                                                Peak {mode === "service" ? "Bookings" : "Sales"}: <span className="text-indigo-900 font-bold">{insights?.peakTime}</span>
                                            </p>
                                            <button 
                                                onClick={() => setShowDaily(!showDaily)}
                                                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors"
                                            >
                                                {showDaily ? "Hide Schedule" : "View Schedule"}
                                            </button>
                                        </div>
                                        
                                        {showDaily && insights?.dailyPeaks && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                className="grid grid-cols-4 gap-1.5 mt-2.5 overflow-hidden"
                                            >
                                                {Object.entries(insights.dailyPeaks).map(([day, time]) => (
                                                    <div key={day} className="flex flex-col bg-slate-50/50 border border-slate-100 rounded-md p-1.5">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{day.slice(0, 3)}</span>
                                                        <span className={`text-[11px] font-black leading-tight ${time === "N/A" ? "text-slate-300" : "text-indigo-700"}`}>{time}</span>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                           </div>

                            {/* Sales/Booking Insight */}
                            <div className="flex items-start gap-3.5">
                                <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                    <TrendingUp className={`w-5 h-5 ${mode === "service" ? "text-emerald-500" : "text-emerald-500"}`} />
                                </div>
                                <p className="text-[14px] text-slate-600 font-medium leading-snug">
                                    {insights?.salesInsight}
                                </p>
                            </div>

                            {/* Top & Slow items based on mode */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3.5">
                                    <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                        {mode === "service" ? <Sparkles className="w-5 h-5 text-purple-500" /> : <ShoppingBag className="w-5 h-5 text-blue-500" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-[12px] text-slate-400 font-bold uppercase tracking-tight">Top {mode === "service" ? "Service" : "Product"}</p>
                                        <p className="text-[14px] text-slate-900 font-bold leading-snug">{mode === "service" ? insights?.topService : insights?.topProduct}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3.5">
                                    <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-[12px] text-slate-400 font-bold uppercase tracking-tight">Slow {mode === "service" ? "Service" : "Product"}</p>
                                        <p className="text-[14px] text-slate-900 font-bold leading-snug">{mode === "service" ? insights?.slowService : insights?.slowProduct}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Suggestion */}
                            <div className="flex items-start gap-3.5">
                                <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                    <Lightbulb className="w-5 h-5 text-amber-500" />
                                </div>
                                <p className="text-[14px] text-slate-600 font-medium leading-snug">
                                    <span className="font-bold text-slate-900">Guidance: </span>{insights?.suggestion}
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
        </motion.div>
    );
}
