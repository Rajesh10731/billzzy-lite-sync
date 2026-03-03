// "use client";

// import { useState, useEffect, useMemo } from "react";
// import {
//   AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Label
// } from "recharts";
// import { motion, LayoutGroup } from "framer-motion";
// import { format, parseISO } from "date-fns";

// import { Loader2, TrendingUp, TrendingDown, Target, Edit2, Check, X, Filter, Calendar as CalendarIcon } from "lucide-react";
// import Calendar from 'react-calendar';
// import 'react-calendar/dist/Calendar.css';

// // --- TYPE DEFINITIONS ---
// type ValuePiece = Date | null;
// type Value = ValuePiece | [ValuePiece, ValuePiece];

// interface SalesDataPoint {
//   date: string;
//   sales: number;
// }
// interface CustomTooltipProps {
//   active?: boolean;
//   payload?: Array<{ value: number }>;
//   label?: string;
// }
// interface CustomLabelProps {
//   x?: number;
//   y?: number;
//   value?: number;
// }

// // --- CONSTANTS ---
// const CHART_CONFIG: Record<string, { api: string; label: string; days: number }> = {
//   "Today": { api: "1D", label: "Daily Goal", days: 1 },
//   "Weekly": { api: "7D", label: "Weekly Goal", days: 7 },
//   "Monthly": { api: "1M", label: "Monthly Goal", days: 30 },
//   "Custom": { api: "", label: "Custom Range", days: 0 }
// };
// // Exclude "Custom" from the footer tabs
// const FOOTER_TABS = ["Today", "Weekly", "Monthly"];

// const COLORS = {
//   BELOW_AVG: '#ef4444',   // Red
//   ABOVE_AVG: '#10b981',   // Green
//   ABOVE_TARGET: '#6366f1' // Blue
// };

// // --- TOOLTIP COMPONENT ---
// const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
//   if (active && payload && payload.length && label) {
//     const dateObj = parseISO(label);
//     const amount = payload[0].value;
//     return (
//       <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs z-50">
//         <p className="text-gray-400 mb-1 font-medium">{format(dateObj, "MMM dd, h:mm a")}</p>
//         <p className="font-bold text-lg flex items-center gap-2">Bill: <span className="text-emerald-400">₹{amount.toLocaleString()}</span></p>
//       </div>
//     );
//   }
//   return null;
// };

// // --- MAIN CHART COMPONENT ---
// export default function StockStyleSalesChart() {
//   const [data, setData] = useState<SalesDataPoint[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState("Today");
//   const [displayValue, setDisplayValue] = useState<number | null>(null);

//   const [baseDailyTarget, setBaseDailyTarget] = useState<number>(0);
//   const [isEditing, setIsEditing] = useState(false);
//   const [tempTarget, setTempTarget] = useState("");

//   // Date Filter State
//   const [showCalendar, setShowCalendar] = useState(false);
//   const [dateRange, setDateRange] = useState<Value>(null);
//   const [tempDateRange, setTempDateRange] = useState<Value>(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         let apiUrl = "";

//         if (activeTab === 'Custom' && Array.isArray(dateRange) && dateRange[0] && dateRange[1]) {
//           const queryParams = new URLSearchParams();
//           queryParams.append('startDate', dateRange[0].toISOString());
//           queryParams.append('endDate', dateRange[1].toISOString());
//           // Assuming the API supports startDate/endDate params or a specific custom range endpoint
//           // Since exact API support for custom range on this specific endpoint wasn't verified, 
//           // I'll construct a URL that *would* likely handle it or fallback to a default if not fully implemented backend-side yet.
//           // Based on SalesSummary, it uses /api/sales. This component uses /api/analytics/sales-chart.
//           // I will append the dates to the query string.
//           apiUrl = `/api/analytics/sales-chart?startDate=${dateRange[0].toISOString()}&endDate=${dateRange[1].toISOString()}`;
//         } else if (activeTab !== 'Custom') {
//           const apiRange = CHART_CONFIG[activeTab].api;
//           apiUrl = `/api/analytics/sales-chart?range=${apiRange}`;
//         } else {
//           // Custom with no range selected
//           setData([]);
//           setLoading(false);
//           return;
//         }

//         const chartRes = await fetch(apiUrl);
//         if (chartRes.ok) setData(await chartRes.json());
//         else setData([]); // Handle error or empty response

//         const targetRes = await fetch("/api/user/target");
//         if (targetRes.ok) {
//           const { target = 0 } = await targetRes.json();
//           setBaseDailyTarget(target);
//           setTempTarget(target.toString());
//         }
//       } catch (error) { console.error("Failed to load data", error); }
//       finally { setLoading(false); }
//     };
//     fetchData();
//   }, [activeTab, dateRange]);

//   const handleSaveTarget = async () => {
//     try {
//       const val = Number(tempTarget);
//       if (isNaN(val)) return;
//       const res = await fetch("/api/user/target", {
//         method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: val }),
//       });
//       if (res.ok) { setBaseDailyTarget(val); setIsEditing(false); }
//     } catch (error) { console.error("Failed to save target", error); }
//   };

//   // --- MEMOIZED CALCULATIONS ---
//   const { averageSales, displayedTarget, chartHeightDomain } = useMemo(() => {
//     const avg = data.length > 0 ? data.reduce((acc, curr) => acc + curr.sales, 0) / data.length : 0;
//     const target = baseDailyTarget * (CHART_CONFIG[activeTab]?.days || 1);

//     if (data.length === 0) return { averageSales: avg, displayedTarget: target, chartHeightDomain: [0, baseDailyTarget] };

//     const maxData = Math.max(...data.map((d) => d.sales));
//     const highestPoint = Math.max(maxData, baseDailyTarget, avg);

//     return {
//       averageSales: avg,
//       displayedTarget: target,
//       chartHeightDomain: [0, highestPoint]
//     };
//   }, [data, baseDailyTarget, activeTab]);

//   const { stop1, stop2, topColor, middleColor, bottomColor } = useMemo(() => {
//     const [domainMin, domainMax] = chartHeightDomain;
//     const totalDomainRange = domainMax - domainMin;

//     if (totalDomainRange === 0) {
//       return { stop1: 0.5, stop2: 0.5, topColor: COLORS.ABOVE_AVG, middleColor: COLORS.ABOVE_AVG, bottomColor: COLORS.ABOVE_AVG };
//     }

//     const clamp = (num: number) => Math.max(0, Math.min(1, num));
//     const isNormalOrder = averageSales <= baseDailyTarget;

//     const upperThreshold = isNormalOrder ? baseDailyTarget : averageSales;
//     const lowerThreshold = isNormalOrder ? averageSales : baseDailyTarget;

//     const stop1_calc = clamp((domainMax - upperThreshold) / totalDomainRange);
//     const stop2_calc = clamp((domainMax - lowerThreshold) / totalDomainRange);

//     return {
//       stop1: stop1_calc,
//       stop2: stop2_calc,
//       topColor: isNormalOrder ? COLORS.ABOVE_TARGET : COLORS.ABOVE_AVG,
//       middleColor: isNormalOrder ? COLORS.ABOVE_AVG : COLORS.ABOVE_TARGET,
//       bottomColor: COLORS.BELOW_AVG
//     };
//   }, [chartHeightDomain, averageSales, baseDailyTarget]);

//   // --- DYNAMIC VALUES & HELPERS ---
//   const currentValue = displayValue ?? (data.length > 0 ? data.at(-1)!.sales : 0);
//   const diff = currentValue - averageSales;
//   const isUp = diff >= 0;

//   const getDynamicColor = (value: number) => {
//     if (value >= baseDailyTarget) return COLORS.ABOVE_TARGET;
//     if (value >= averageSales) return COLORS.ABOVE_AVG;
//     return COLORS.BELOW_AVG;
//   };

//   const formatXAxis = (tickItem: string) => {
//     try {
//       const date = parseISO(tickItem);
//       if (activeTab === "Today") return format(date, "h:mm a");
//       if (activeTab === "Weekly") return format(date, "EEE");
//       if (activeTab === "Monthly") return format(date, "dd MMM");
//       // For custom or other ranges
//       return format(date, "dd MMM");
//     } catch { return ""; }
//   };

//   const CustomLabel = (props: CustomLabelProps) => {
//     const { x, y, value } = props;
//     if (value === undefined || x === undefined || y === undefined) return null;
//     return (
//       <text x={x} y={y} dy={-10} fill={getDynamicColor(value)} fontSize={10} fontWeight="bold" textAnchor="middle">
//         {`₹${value.toLocaleString()}`}
//       </text>
//     );
//   };

//   if (loading && data.length === 0 && activeTab !== 'Custom') {
//     return <div className="h-[400px] w-full bg-white rounded-xl flex items-center justify-center border border-gray-100"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>;
//   }

//   return (
//     <div className="bg-white p-4 rounded-xl shadow-sm font-sans relative">
//       {/* HEADER */}
//       <div className="mb-2 flex justify-between items-start">
//         <div>
//           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{displayValue ? "Selected Bill" : "Last Bill"}</p>
//           <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">₹{currentValue.toLocaleString()}</h2>
//           <div className="flex items-center gap-2 mt-1">
//             <span className={`flex items-center font-bold text-sm ${isUp ? "text-emerald-500" : "text-red-500"}`}>
//               {isUp ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
//               {isUp ? "+" : ""}{Math.round(diff).toLocaleString()} vs Average
//             </span>
//           </div>
//         </div>

//         {/* RIGHT SIDE ACTIONS */}
//         <div className="flex flex-col items-end gap-2">
//           {/* GOAL / TARGET */}
//           <div className="text-right flex flex-col items-end">
//             <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Target size={12} /> {CHART_CONFIG[activeTab]?.label || 'Daily Goal'}</p>
//             {isEditing ? (
//               <div className="flex flex-col items-end gap-1">
//                 <div className="flex items-center gap-1 bg-gray-50 p-1 rounded border border-gray-200">
//                   <span className="text-xs font-bold text-gray-500">₹</span>
//                   <input type="number" value={tempTarget} onChange={(e) => setTempTarget(e.target.value)} className="w-20 text-sm font-bold bg-transparent outline-none text-indigo-600" autoFocus placeholder="Daily..." />
//                   <button onClick={handleSaveTarget} className="p-1 hover:bg-green-100 rounded text-green-600"><Check size={14} /></button>
//                   <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-red-100 rounded text-red-600"><X size={14} /></button>
//                 </div>
//                 <span className="text-[9px] text-gray-400">Set Daily Amount</span>
//               </div>
//             ) : (
//               <div className="group flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-gray-50 transition-colors" onClick={() => { setTempTarget(baseDailyTarget.toString()); setIsEditing(true); }}>
//                 <p className="text-xl font-bold text-indigo-600">₹{displayedTarget.toLocaleString()}</p>
//                 <Edit2 size={12} className="text-gray-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
//               </div>
//             )}
//           </div>


//         </div>
//       </div>

//       {/* GRAPH AREA */}
//       <div className="h-[240px] w-full mt-4">
//         {activeTab === 'Custom' && (!dateRange || (Array.isArray(dateRange) && (!dateRange[0] || !dateRange[1]))) ? (
//           <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
//             <CalendarIcon className="w-8 h-8 mb-2 text-gray-300" />
//             <p className="text-xs font-medium">Select a date range</p>
//           </div>
//         ) : (
//           <ResponsiveContainer width="100%" height="100%">
//             <AreaChart data={data} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}
//               // eslint-disable-next-line @typescript-eslint/no-explicit-any
//               onMouseMove={(e: any) => { if (e.activePayload) setDisplayValue(e.activePayload[0].value); }}
//               onMouseLeave={() => setDisplayValue(null)}>
//               <defs>
//                 <linearGradient id="multiColorStroke" x1="0" y1="0" x2="0" y2="1">
//                   <stop offset={stop1} stopColor={topColor} />
//                   <stop offset={stop1} stopColor={middleColor} />
//                   <stop offset={stop2} stopColor={middleColor} />
//                   <stop offset={stop2} stopColor={bottomColor} />
//                 </linearGradient>
//                 <linearGradient id="multiColorFill" x1="0" y1="0" x2="0" y2="1">
//                   <stop offset={stop1} stopColor={topColor} stopOpacity={0.2} />
//                   <stop offset={stop1} stopColor={middleColor} stopOpacity={0.1} />
//                   <stop offset={stop2} stopColor={middleColor} stopOpacity={0.1} />
//                   <stop offset={stop2} stopColor={bottomColor} stopOpacity={0.1} />
//                 </linearGradient>
//               </defs>

//               <YAxis hide domain={chartHeightDomain} allowDataOverflow={true} />
//               <XAxis dataKey="date" hide={false} axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700 }} tickFormatter={formatXAxis} interval="preserveStartEnd" minTickGap={40} />
//               <Tooltip content={<CustomTooltip />} />

//               <ReferenceLine y={averageSales} stroke="#374151" strokeDasharray="3 3" strokeWidth={1.5}><Label value={`Avg: ₹${Math.round(averageSales).toLocaleString()}`} position="insideTopRight" fill="#374151" fontSize={10} fontWeight="bold" offset={10} /></ReferenceLine>
//               {baseDailyTarget > 0 && (<ReferenceLine y={baseDailyTarget} stroke="#6366f1" strokeDasharray="5 5" strokeWidth={1.5}><Label value={`Goal: ₹${baseDailyTarget.toLocaleString()}`} position="insideBottomRight" fill="#6366f1" fontSize={10} fontWeight="bold" offset={10} /></ReferenceLine>)}

//               <Area type="linear" dataKey="sales" stroke="url(#multiColorStroke)" fill="url(#multiColorFill)" strokeWidth={2} label={activeTab === 'Today' ? <CustomLabel /> : false}
//                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                 dot={(props: any) => {
//                   const { cx, cy, payload } = props;
//                   return (<circle key={payload.date} cx={cx} cy={cy} r={3} fill={getDynamicColor(payload.sales)} />);
//                 }}
//                 activeDot={{ r: 6, strokeWidth: 0, fill: "#1f2937" }}
//               />
//             </AreaChart>
//           </ResponsiveContainer>
//         )}
//       </div>

//       {/* FOOTER TABS & FILTER */}
//       <div className="flex items-center justify-between mt-6 gap-2">
//         <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg flex-1">
//           <LayoutGroup>
//             {FOOTER_TABS.map((tab) => (
//               <button
//                 key={tab}
//                 onClick={() => {
//                   setActiveTab(tab);
//                   setDateRange(null); // Clear custom date range when switching to presets
//                 }}
//                 className={`relative flex-1 py-1.5 text-[10px] font-black rounded-md transition-colors z-10 ${activeTab === tab ? "text-white" : "text-gray-500 hover:text-gray-700"
//                   }`}
//               >
//                 {activeTab === tab && (
//                   <motion.div
//                     layoutId="activeTab-graph"
//                     className="absolute inset-0 bg-[#5a4fcf] rounded-md -z-10 shadow-sm"
//                     transition={{ type: "spring", stiffness: 300, damping: 25 }}
//                   />
//                 )}
//                 {tab}
//               </button>
//             ))}
//           </LayoutGroup>
//         </div>

//         {/* FILTER BUTTON */}
//         <div className="relative">
//           <button
//             onClick={() => {
//               setTempDateRange(dateRange);
//               setShowCalendar(!showCalendar);
//             }}
//             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all shadow-sm border ${activeTab === 'Custom' && Array.isArray(dateRange) && dateRange[0] && dateRange[1]
//               ? 'bg-[#4a3fb8] text-white border-transparent ring-1 ring-purple-200'
//               : 'bg-[#5a4fcf] text-white border-transparent hover:bg-[#4a3fb8]'
//               }`}
//             title="Filter by Date"
//           >
//             <Filter size={14} />
//             {activeTab === 'Custom' && Array.isArray(dateRange) && dateRange[0] && dateRange[1] ? (
//               <span className="whitespace-nowrap">
//                 {format(dateRange[0], 'dd MMM')} - {format(dateRange[1], 'dd MMM')}
//               </span>
//             ) : null}

//             {activeTab === 'Custom' && (
//               <X
//                 size={12}
//                 className="ml-1 hover:text-red-300"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setDateRange(null);
//                   setActiveTab('Today');
//                   setShowCalendar(false);
//                 }}
//               />
//             )}
//           </button>

//           {/* Date Filter Popover - Opens Upwards */}
//           {showCalendar && (
//             <div className="absolute bottom-full right-0 mb-2 z-50 bg-white rounded-xl shadow-xl border border-gray-200 w-[240px] p-0 animate-in fade-in zoom-in-95 duration-200">
//               <style jsx global>{`
//                         .filter-calendar .react-calendar {
//                            border: none;
//                            font-family: inherit;
//                            width: 100%;
//                            font-size: 0.7rem;
//                            background: transparent;
//                         }
//                         .filter-calendar .react-calendar__navigation {
//                            height: 32px;
//                            margin-bottom: 0px;
//                         }
//                         .filter-calendar .react-calendar__navigation button {
//                            min-width: 24px;
//                            background: none;
//                            font-weight: 600;
//                            font-size: 0.8rem;
//                         }
//                         .filter-calendar .react-calendar__month-view__weekdays {
//                            font-weight: 600;
//                            font-size: 0.6rem;
//                            text-transform: uppercase;
//                            color: #9ca3af;
//                            text-decoration: none !important;
//                            padding-bottom: 2px;
//                         }
//                         .filter-calendar .react-calendar__month-view__weekdays__weekday abbr {
//                             text-decoration: none !important;
//                         }
//                         .filter-calendar .react-calendar__tile {
//                            padding: 6px 2px;
//                            font-size: 0.7rem;
//                            font-weight: 500;
//                         }
//                         .filter-calendar .react-calendar__tile--now {
//                            background: #f3f4f6;
//                            border-radius: 4px;
//                            color: #1f2937;
//                         }
//                         .filter-calendar .react-calendar__tile--active {
//                            background: #5a4fcf !important;
//                            color: white !important;
//                            border-radius: 4px;
//                         }
//                         .filter-calendar .react-calendar__tile--range {
//                            background: #eef2ff;
//                            color: #5a4fcf;
//                            border-radius: 0;
//                         }
//                         .filter-calendar .react-calendar__tile--rangeStart {
//                            background: #5a4fcf !important;
//                            color: white !important;
//                            border-top-left-radius: 4px !important;
//                            border-bottom-left-radius: 4px !important;
//                         }
//                         .filter-calendar .react-calendar__tile--rangeEnd {
//                            background: #5a4fcf !important;
//                            color: white !important;
//                            border-top-right-radius: 4px !important;
//                            border-bottom-right-radius: 4px !important;
//                         }
//                      `}</style>
//               <div className="p-2 filter-calendar">
//                 <Calendar
//                   onChange={(value) => setTempDateRange(value)}
//                   value={tempDateRange}
//                   selectRange={true}
//                   className="w-full"
//                 />
//               </div>

//               <div className="flex items-center gap-2 p-2 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
//                 <button
//                   onClick={() => setShowCalendar(false)}
//                   className="flex-1 py-1 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={() => {
//                     if (Array.isArray(tempDateRange) && tempDateRange[0] && tempDateRange[1]) {
//                       setDateRange(tempDateRange);
//                       setActiveTab('Custom');
//                     }
//                     setShowCalendar(false);
//                   }}
//                   className="flex-1 py-1 text-[10px] font-medium text-white bg-[#5a4fcf] rounded hover:bg-indigo-700 transition-colors shadow-sm"
//                 >
//                   Apply
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Label
} from "recharts";
import { motion, LayoutGroup } from "framer-motion";
import { format, parseISO } from "date-fns";

import { Loader2, TrendingUp, TrendingDown, Target, Edit2, Check, X, Filter, Calendar as CalendarIcon } from "lucide-react";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// --- TYPE DEFINITIONS ---
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface SalesDataPoint {
  date: string;
  sales: number;
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}
interface CustomLabelProps {
  x?: number;
  y?: number;
  value?: number;
}

// --- CONSTANTS ---
const CHART_CONFIG: Record<string, { api: string; label: string; days: number }> = {
  "Today": { api: "1D", label: "Daily Goal", days: 1 },
  "Weekly": { api: "7D", label: "Weekly Goal", days: 7 },
  "Monthly": { api: "1M", label: "Monthly Goal", days: 30 },
  "Custom": { api: "", label: "Custom Range", days: 0 }
};
const FOOTER_TABS = ["Today", "Weekly", "Monthly"];

const COLORS = {
  BELOW_AVG: '#ef4444',
  ABOVE_AVG: '#10b981',
  ABOVE_TARGET: '#6366f1'
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length && label) {
    const dateObj = parseISO(label);
    const amount = payload[0].value;
    // Check if it's hourly or daily (roughly)
    const isHourly = label.includes('T') && !label.endsWith('00:00:00.000Z');

    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs z-50">
        <p className="text-gray-400 mb-1 font-medium">
          {isHourly ? format(dateObj, "MMM dd, hh:mm a") : format(dateObj, "MMM dd, yyyy")}
        </p>
        <p className="font-bold text-lg flex items-center gap-2">Total: <span className="text-emerald-400">₹{amount.toLocaleString()}</span></p>
      </div>
    );
  }
  return null;
};

export default function StockStyleSalesChart() {
  const [data, setData] = useState<SalesDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Today");
  const [displayValue, setDisplayValue] = useState<number | null>(null);

  const [baseDailyTarget, setBaseDailyTarget] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [tempTarget, setTempTarget] = useState("");

  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState<Value>(null);
  const [tempDateRange, setTempDateRange] = useState<Value>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let apiUrl = "/api/analytics/sales-chart";
        if (activeTab === 'Custom' && Array.isArray(dateRange) && dateRange[0] && dateRange[1]) {
          apiUrl += `?startDate=${dateRange[0].toISOString()}&endDate=${dateRange[1].toISOString()}`;
        } else if (activeTab !== 'Custom') {
          const apiRange = CHART_CONFIG[activeTab].api;
          apiUrl += `?range=${apiRange}`;
        } else {
          setData([]);
          setLoading(false);
          return;
        }

        const chartRes = await fetch(apiUrl);
        if (chartRes.ok) setData(await chartRes.json());
        else setData([]);

        const targetRes = await fetch("/api/user/target");
        if (targetRes.ok) {
          const { target = 0 } = await targetRes.json();
          setBaseDailyTarget(target);
          setTempTarget(target.toString());
        }
      } catch (error) { console.error("Failed to load data", error); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [activeTab, dateRange]);

  const handleSaveTarget = async () => {
    try {
      const val = Number(tempTarget);
      if (isNaN(val)) return;
      const res = await fetch("/api/user/target", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: val }),
      });
      if (res.ok) { setBaseDailyTarget(val); setIsEditing(false); }
    } catch (error) { console.error("Failed to save target", error); }
  };

  const { averageSales, displayedTarget, chartHeightDomain, processedData } = useMemo(() => {
    let currentData = data;
    if (activeTab === 'Today' && data.length > 0) {
      let cumulative = 0;
      currentData = data.map(item => {
        cumulative += item.sales;
        return { ...item, sales: cumulative };
      });
    }

    const avg = currentData.length > 0 ? currentData.reduce((acc, curr) => acc + curr.sales, 0) / currentData.length : 0;
    const target = baseDailyTarget * (CHART_CONFIG[activeTab]?.days || 1);
    if (currentData.length === 0) return { averageSales: avg, displayedTarget: target, chartHeightDomain: [0, baseDailyTarget || 100] as [number, number], processedData: [] };
    const maxData = Math.max(...currentData.map((d) => d.sales));
    const highestPoint = Math.max(maxData, target, avg);
    return { averageSales: avg, displayedTarget: target, chartHeightDomain: [0, highestPoint] as [number, number], processedData: currentData };
  }, [data, baseDailyTarget, activeTab]);

  const { stop1, stop2, topColor, middleColor, bottomColor } = useMemo(() => {
    const [domainMin, domainMax] = chartHeightDomain;
    const totalDomainRange = domainMax - domainMin;
    if (totalDomainRange === 0) return { stop1: 0.5, stop2: 0.5, topColor: COLORS.ABOVE_AVG, middleColor: COLORS.ABOVE_AVG, bottomColor: COLORS.ABOVE_AVG };
    const clamp = (num: number) => Math.max(0, Math.min(1, num));
    const isNormalOrder = averageSales <= baseDailyTarget;
    const upperThreshold = isNormalOrder ? baseDailyTarget : averageSales;
    const lowerThreshold = isNormalOrder ? averageSales : baseDailyTarget;
    return {
      stop1: clamp((domainMax - upperThreshold) / totalDomainRange),
      stop2: clamp((domainMax - lowerThreshold) / totalDomainRange),
      topColor: isNormalOrder ? COLORS.ABOVE_TARGET : COLORS.ABOVE_AVG,
      middleColor: isNormalOrder ? COLORS.ABOVE_AVG : COLORS.ABOVE_TARGET,
      bottomColor: COLORS.BELOW_AVG
    };
  }, [chartHeightDomain, averageSales, baseDailyTarget]);

  const currentValue = displayValue ?? (data.length > 0 ? data.at(-1)!.sales : 0);
  const diff = currentValue - averageSales;
  const isUp = diff >= 0;

  const getDynamicColor = (value: number) => {
    if (value >= baseDailyTarget) return COLORS.ABOVE_TARGET;
    if (value >= averageSales) return COLORS.ABOVE_AVG;
    return COLORS.BELOW_AVG;
  };

  const formatXAxis = (tickItem: string) => {
    try {
      const date = parseISO(tickItem);
      if (activeTab === "Today") return format(date, "h:mm a");
      if (activeTab === "Weekly") return format(date, "EEE");
      return format(date, "dd MMM");
    } catch { return ""; }
  };

  const CustomLabel = (props: CustomLabelProps) => {
    const { x, y, value } = props;
    if (value === undefined || x === undefined || y === undefined || value === 0) return null;
    return (
      <text x={x} y={y - 10} fill={getDynamicColor(value)} fontSize={10} fontWeight="bold" textAnchor="middle">
        {`₹${value.toLocaleString()}`}
      </text>
    );
  };

  if (loading && data.length === 0 && activeTab !== 'Custom') {
    return <div className="h-[400px] w-full bg-white rounded-xl flex items-center justify-center border border-gray-100"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm font-sans relative">
      <div className="mb-2 flex justify-between items-start">
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{displayValue ? "Selected Bill" : "Last Bill"}</p>
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">₹{currentValue.toLocaleString()}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`flex items-center font-bold text-sm ${isUp ? "text-emerald-500" : "text-red-500"}`}>
              {isUp ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
              {isUp ? "+" : ""}{Math.round(diff).toLocaleString()} vs Average
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-right flex flex-col items-end">
            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Target size={12} /> {CHART_CONFIG[activeTab]?.label || 'Daily Goal'}</p>
            {isEditing ? (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded border border-gray-200">
                  <span className="text-xs font-bold text-gray-500">₹</span>
                  <input type="number" value={tempTarget} onChange={(e) => setTempTarget(e.target.value)} className="w-20 text-base font-bold bg-transparent outline-none text-indigo-600" autoFocus placeholder="Daily..." />
                  <button onClick={handleSaveTarget} className="p-1 hover:bg-green-100 rounded text-green-600"><Check size={14} /></button>
                  <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-red-100 rounded text-red-600"><X size={14} /></button>
                </div>
              </div>
            ) : (
              <div className="group flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-gray-50 transition-colors" onClick={() => { setTempTarget(baseDailyTarget.toString()); setIsEditing(true); }}>
                <p className="text-xl font-bold text-indigo-600">₹{displayedTarget.toLocaleString()}</p>
                <Edit2 size={12} className="text-gray-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-[240px] w-full mt-4">
        {activeTab === 'Custom' && (!dateRange || (Array.isArray(dateRange) && (!dateRange[0] || !dateRange[1]))) ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <CalendarIcon className="w-8 h-8 mb-2 text-gray-300" />
            <p className="text-xs font-medium">Select a date range</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={processedData}
              margin={{ top: 30, right: 10, left: 10, bottom: 0 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onMouseMove={(e: any) => {
                if (e && e.activePayload) setDisplayValue(e.activePayload[0].value);
              }}
              onMouseLeave={() => setDisplayValue(null)}
            >
              <defs>
                <linearGradient id="multiColorStroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={stop1} stopColor={topColor} /><stop offset={stop1} stopColor={middleColor} /><stop offset={stop2} stopColor={middleColor} /><stop offset={stop2} stopColor={bottomColor} />
                </linearGradient>
                <linearGradient id="multiColorFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={stop1} stopColor={topColor} stopOpacity={0.2} /><stop offset={stop1} stopColor={middleColor} stopOpacity={0.1} /><stop offset={stop2} stopColor={middleColor} stopOpacity={0.1} /><stop offset={stop2} stopColor={bottomColor} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <YAxis hide domain={chartHeightDomain} allowDataOverflow={true} />
              <XAxis dataKey="date" hide={false} axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700 }} tickFormatter={formatXAxis} interval="preserveStartEnd" minTickGap={40} />
              <Tooltip content={<CustomTooltip />} />
              {activeTab !== 'Today' && (
                <ReferenceLine y={averageSales} stroke="#374151" strokeDasharray="3 3" strokeWidth={1.5}><Label value={`Avg: ₹${Math.round(averageSales).toLocaleString()}`} position="insideTopRight" fill="#374151" fontSize={10} fontWeight="bold" offset={10} /></ReferenceLine>
              )}
              {baseDailyTarget > 0 && (<ReferenceLine y={displayedTarget} stroke="#6366f1" strokeDasharray="5 5" strokeWidth={1.5}><Label value={`Goal: ₹${displayedTarget.toLocaleString()}`} position="insideBottomRight" fill="#6366f1" fontSize={10} fontWeight="bold" offset={10} /></ReferenceLine>)}
              <Area
                type="monotone" dataKey="sales" stroke="url(#multiColorStroke)" fill="url(#multiColorFill)" strokeWidth={2} label={activeTab === 'Today' ? <CustomLabel /> : false}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (cx === undefined || cy === undefined) return <g key={payload.date} />;
                  // Hide dots for 0 values to keep it neat (first point is 0)
                  if (payload.sales === 0 && processedData.indexOf(payload) === 0) return <g key={payload.date} />;
                  // If we have more than 20 points, hide them to keep it neat
                  if (processedData.length > 20 && activeTab !== 'Today') return <g key={payload.date} />;
                  return (<circle key={payload.date} cx={cx} cy={cy} r={3} fill={getDynamicColor(payload.sales)} />);
                }}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#1f2937" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-center justify-between mt-6 gap-2">
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg flex-1">
          <LayoutGroup>
            {FOOTER_TABS.map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab); setDateRange(null); }} className={`relative flex-1 py-1.5 text-[10px] font-black rounded-md transition-colors z-10 ${activeTab === tab ? "text-white" : "text-gray-500 hover:text-gray-700"}`}>
                {activeTab === tab && (<motion.div layoutId="activeTab-graph" className="absolute inset-0 bg-[#5a4fcf] rounded-md -z-10 shadow-sm" transition={{ type: "spring", stiffness: 300, damping: 25 }} />)}
                {tab}
              </button>
            ))}
          </LayoutGroup>
        </div>

        <div className="relative">
          <button
            onClick={() => { setTempDateRange(dateRange); setShowCalendar(!showCalendar); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all shadow-sm border ${activeTab === 'Custom' && Array.isArray(dateRange) && dateRange[0] && dateRange[1] ? 'bg-[#4a3fb8] text-white border-transparent ring-1 ring-purple-200' : 'bg-[#5a4fcf] text-white border-transparent hover:bg-[#4a3fb8]'}`}
          >
            <Filter size={14} />
            {activeTab === 'Custom' && Array.isArray(dateRange) && dateRange[0] && dateRange[1] ? (
              <span className="whitespace-nowrap">{format(dateRange[0], 'dd MMM')} - {format(dateRange[1], 'dd MMM')}</span>
            ) : null}
            {activeTab === 'Custom' && (
              <X size={12} className="ml-1 hover:text-red-300" onClick={(e) => { e.stopPropagation(); setDateRange(null); setActiveTab('Today'); setShowCalendar(false); }} />
            )}
          </button>

          {showCalendar && (
            <div className="absolute bottom-full right-0 mb-2 z-50 bg-white rounded-xl shadow-xl border border-gray-200 w-[240px] p-0 animate-in fade-in zoom-in-95 duration-200">
              <style jsx global>{`
                  .filter-calendar .react-calendar { border: none; font-family: inherit; width: 100%; font-size: 0.7rem; background: transparent; }
                  .filter-calendar .react-calendar__navigation { height: 32px; margin-bottom: 0px; }
                  .filter-calendar .react-calendar__navigation button { min-width: 24px; background: none; font-weight: 600; font-size: 0.8rem; }
                  .filter-calendar .react-calendar__month-view__weekdays { font-weight: 600; font-size: 0.6rem; text-transform: uppercase; color: #9ca3af; text-decoration: none !important; padding-bottom: 2px; }
                  .filter-calendar .react-calendar__month-view__weekdays__weekday abbr { text-decoration: none !important; }
                  .filter-calendar .react-calendar__tile { padding: 6px 2px; font-size: 0.7rem; font-weight: 500; }
                  .filter-calendar .react-calendar__tile--now { background: #f3f4f6; border-radius: 4px; color: #1f2937; }
                  .filter-calendar .react-calendar__tile--active { background: #5a4fcf !important; color: white !important; border-radius: 4px; }
                  .filter-calendar .react-calendar__tile--range { background: #eef2ff; color: #5a4fcf; border-radius: 0; }
                  .filter-calendar .react-calendar__tile--rangeStart { background: #5a4fcf !important; color: white !important; border-top-left-radius: 4px !important; border-bottom-left-radius: 4px !important; }
                  .filter-calendar .react-calendar__tile--rangeEnd { background: #5a4fcf !important; color: white !important; border-top-right-radius: 4px !important; border-bottom-right-radius: 4px !important; }
               `}</style>
              <div className="p-2 filter-calendar">
                <Calendar onChange={(value) => setTempDateRange(value as Value)} value={tempDateRange} selectRange={true} className="w-full" />
              </div>
              <div className="flex items-center gap-2 p-2 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                <button onClick={() => setShowCalendar(false)} className="flex-1 py-1 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors">Cancel</button>
                <button
                  onClick={() => {
                    if (Array.isArray(tempDateRange) && tempDateRange[0] && tempDateRange[1]) { setDateRange(tempDateRange); setActiveTab('Custom'); }
                    setShowCalendar(false);
                  }}
                  className="flex-1 py-1 text-[10px] font-medium text-white bg-[#5a4fcf] rounded hover:bg-indigo-700 transition-colors shadow-sm"
                >Apply</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}