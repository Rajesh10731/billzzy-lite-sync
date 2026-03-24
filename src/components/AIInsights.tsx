// src/components/AIInsights.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Sparkles, TrendingUp, ShoppingBag, Lightbulb, Loader2, RefreshCw, Bot, AlertTriangle, Zap } from "lucide-react";
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
    offPeakTip?: string;
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
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative group"
        >
            {/* Ambient Background Tech Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px]" />
            {/* Header */}  
            <div className={`p-3.5 flex items-center justify-between border-b border-gray-50 relative overflow-hidden bg-gradient-to-r ${mode === "service" ? "from-purple-50/80 to-white" : "from-indigo-50/80 to-white"}`}>
                {/* Scanning Light Effect */}
                <motion.div 
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                />
                
                <div className="flex items-center gap-2.5 relative z-10">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md ${mode === "service" ? "bg-purple-600" : "bg-indigo-600"}`}>
                        <Bot className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-[14px] font-bold text-slate-900 leading-tight tracking-tight">AI {mode === "service" ? "Service" : "Smart"} Advisor</h3>
                        <div className="flex items-center gap-1.5">
                            <motion.span 
                                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                            />
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">System Active</p>
                        </div>
                    </div>
                </div>
                {insights?.lastUpdated && (
                    <div className="flex items-center gap-1.5 bg-white/90 px-2 py-1 rounded-full border border-slate-100 shadow-sm relative z-10">
                        <RefreshCw className={`w-2.5 h-2.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                        <span className="text-[10px] font-bold text-slate-500">{insights.lastUpdated}</span>
                    </div>
                )}
            </div>

            <div className="p-4">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="py-12 flex flex-col items-center justify-center gap-4"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping" />
                                <div className="relative w-12 h-12 rounded-full border-2 border-indigo-500/20 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Data</p>
                                <div className="flex gap-1">
                                    {[0, 1, 2].map(i => (
                                        <motion.div 
                                            key={i}
                                            animate={{ opacity: [0.3, 1, 0.3] }}
                                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                            className="w-1 h-1 rounded-full bg-indigo-400"
                                        />
                                    ))}
                                </div>
                            </div>
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
                                                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-all border border-indigo-100"
                                            >
                                                {showDaily ? "Hide Matrix" : "View Matrix"}
                                            </button>
                                        </div>
                                        
                                        {showDaily && insights?.dailyPeaks && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                className="grid grid-cols-4 gap-1.5 mt-2.5 overflow-hidden"
                                            >
                                                {Object.entries(insights.dailyPeaks).map(([day, time]) => (
                                                    <div key={day} className="flex flex-col bg-slate-50/80 border border-slate-100 rounded-lg p-1.5 transition-colors hover:bg-slate-100/50">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{day.slice(0, 3)}</span>
                                                        <span className={`text-[11px] font-black leading-tight ${time === "N/A" ? "text-slate-300" : "text-indigo-700"}`}>{time}</span>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                           </div>

                            {/* Sales/Booking Insight */}
                            <div className="flex items-start gap-3.5 group/item">
                                <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                    <TrendingUp className="w-5 h-5 text-emerald-500 group-hover/item:scale-110 transition-transform" />
                                </div>
                                <div className="text-[14px] text-slate-600 font-medium leading-snug">
                                    <Typewriter text={insights?.salesInsight || ""} delay={50} />
                                </div>
                            </div>

                            {/* Top & Slow items based on mode */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3.5 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                    <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                        {mode === "service" ? <Sparkles className="w-5 h-5 text-purple-500" /> : <ShoppingBag className="w-5 h-5 text-blue-500" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Top Efficiency</p>
                                        <p className="text-[14px] text-slate-900 font-bold leading-snug">{mode === "service" ? insights?.topService : insights?.topProduct}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3.5 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                    <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Attention Needed</p>
                                        <p className="text-[14px] text-slate-900 font-bold leading-snug">{mode === "service" ? insights?.slowService : insights?.slowProduct}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Suggestion */}
                            <div className="flex items-start gap-3.5 group/item">
                                <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                    <Lightbulb className="w-5 h-5 text-amber-500 group-hover/item:rotate-12 transition-transform" />
                                </div>
                                <div className="text-[14px] text-slate-600 font-medium leading-snug">
                                    <span className="font-black text-slate-900 uppercase text-[11px] tracking-wider mr-1.5 opacity-70">Guidance:</span>
                                    <Typewriter text={insights?.suggestion || ""} delay={50} />
                                </div>
                            </div>
                            
                            {/* Off-Peak Tip */}
                            {insights?.offPeakTip && (
                                <motion.div 
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-start gap-3.5 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 relative overflow-hidden group/tip"
                                >
                                    <div className="absolute top-0 right-0 p-1 opacity-10 group-hover/tip:opacity-20 transition-opacity">
                                        <Zap className="w-8 h-8 text-indigo-600" />
                                    </div>
                                    <div className="w-5 h-5 mt-0.5 flex items-center justify-center flex-shrink-0">
                                        <Zap className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div className="text-[14px] text-slate-700 font-medium leading-snug relative z-10">
                                        <span className="font-black text-indigo-900 uppercase text-[11px] tracking-wider mr-1.5 opacity-70">Off-Peak Strategy:</span>
                                        <Typewriter text={insights.offPeakTip} delay={50} />
                                    </div>
                                </motion.div>
                            )}

                         {/* Business Pulse Grid */}
                         <div className="grid grid-cols-2 gap-3 mt-2">
                             <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 hover:shadow-sm transition-all">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lost Velocity</p>
                                 <p className="text-xl font-black text-slate-800">{insights?.churnRate}</p>
                             </div>
                             <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 hover:shadow-sm transition-all">
                                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Target Focus</p>
                                 <p className="text-[13px] font-bold text-indigo-700 leading-tight">{insights?.retargeting}</p>
                             </div>
                         </div>

                         {/* Footer */}
                         <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                     Processed {insights?.lastUpdated || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                                 <div className="w-1 h-1 rounded-full bg-slate-200" />
                             </div>
                             {(insights?.isMock || insights?.isFallback) && (
                                 <span className="text-[10px] text-indigo-400 font-black tracking-widest uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                     Logic Mode
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

// Typing Effect Component for that "Bot" feel
function Typewriter({ text, delay = 50 }: { text: string; delay?: number }) {
    const [displayedText, setDisplayedText] = useState("");
    
    useEffect(() => {
        let isActive = true;
        setDisplayedText(""); 
        
        async function startTyping() {
            if (!text) return;
            for (let i = 1; i <= text.length; i++) {
                if (!isActive) break;
                setDisplayedText(text.slice(0, i));
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        startTyping();
        return () => { isActive = false; };
    }, [text, delay]);

    return (
        <span>
            {displayedText}
            {displayedText.length < text.length && (
                <motion.span 
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-1.5 h-4 ml-0.5 bg-indigo-500 align-middle"
                />
            )}
        </span>
    );
}
