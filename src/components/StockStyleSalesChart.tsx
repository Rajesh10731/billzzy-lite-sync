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
    const isHourly = label.includes('T') && !label.endsWith('00:00:00.000Z');
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs z-50">
        <p className="text-gray-400 mb-1 font-medium">{isHourly ? format(dateObj, "MMM dd, h:mm a") : format(dateObj, "MMM dd, yyyy")}</p>
        <p className="font-bold text-lg flex items-center gap-2">Bill: <span className="text-emerald-400">₹{amount.toLocaleString()}</span></p>
      </div>
    );
  }
  return null;
};

export default function StockStyleSalesChart({ hideTabs = false }: { hideTabs?: boolean }) {
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
        let apiUrl = "";
        if (activeTab === 'Custom' && Array.isArray(dateRange) && dateRange[0] && dateRange[1]) {
          apiUrl = `/api/analytics/sales-chart?startDate=${dateRange[0].toISOString()}&endDate=${dateRange[1].toISOString()}`;
        } else if (activeTab !== 'Custom') {
          apiUrl = `/api/analytics/sales-chart?range=${CHART_CONFIG[activeTab].api}`;
        } else {
          setData([]); setLoading(false); return;
        }
        const chartRes = await fetch(apiUrl);
        if (chartRes.ok) setData(await chartRes.json());
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
    const maxData = currentData.length > 0 ? Math.max(...currentData.map((d) => d.sales)) : 0;
    const highestPoint = Math.max(maxData, target, avg, 100);
    return { averageSales: avg, displayedTarget: target, chartHeightDomain: [0, highestPoint], processedData: currentData };
  }, [data, baseDailyTarget, activeTab]);

  const { stop1, stop2, topColor, middleColor, bottomColor } = useMemo(() => {
    const [domainMin, domainMax] = chartHeightDomain;
    const totalDomainRange = domainMax - domainMin || 1;
    const isNormalOrder = averageSales <= baseDailyTarget;
    const upperThreshold = isNormalOrder ? baseDailyTarget : averageSales;
    const lowerThreshold = isNormalOrder ? averageSales : baseDailyTarget;
    return {
      stop1: Math.max(0, Math.min(1, (domainMax - upperThreshold) / totalDomainRange)),
      stop2: Math.max(0, Math.min(1, (domainMax - lowerThreshold) / totalDomainRange)),
      topColor: isNormalOrder ? COLORS.ABOVE_TARGET : COLORS.ABOVE_AVG,
      middleColor: isNormalOrder ? COLORS.ABOVE_AVG : COLORS.ABOVE_TARGET,
      bottomColor: COLORS.BELOW_AVG
    };
  }, [chartHeightDomain, averageSales, baseDailyTarget]);

  const currentValue = displayValue ?? (processedData.length > 0 ? processedData.at(-1)!.sales : 0);
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
      return format(date, "dd MMM");
    } catch { return ""; }
  };

  const CustomLabel = (props: any) => {
    const { x, y, value, index } = props;
    if (value === undefined || x === undefined || y === undefined || value === 0) return null;
    const isLast = index === processedData.length - 1;
    return (
      <text
        x={isLast ? x + 5 : x}
        y={y - 12}
        fill={getDynamicColor(value)}
        fontSize={10}
        fontWeight="bold"
        textAnchor={isLast ? "end" : "middle"}
      >
        ₹{value.toLocaleString()}
      </text>
    );
  };

  if (loading && data.length === 0 && activeTab !== 'Custom') {
    return <div className="h-[400px] w-full bg-white rounded-xl flex items-center justify-center border border-gray-100"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm font-sans relative overflow-hidden border border-gray-200">
      <div className="p-4 pb-0 flex justify-between items-start">
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
        <div className="flex flex-col items-end gap-2 text-right">
          <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider flex items-center gap-1 justify-end"><Target size={12} /> {CHART_CONFIG[activeTab]?.label || 'Daily Goal'}</p>
          {isEditing ? (
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded border border-gray-200">
              <span className="text-xs font-bold text-gray-500">₹</span>
              <input type="number" value={tempTarget} onChange={(e) => setTempTarget(e.target.value)} className="w-20 text-sm font-bold bg-transparent outline-none text-indigo-600" autoFocus />
              <button onClick={handleSaveTarget} className="p-1 text-green-600"><Check size={14} /></button>
              <button onClick={() => setIsEditing(false)} className="p-1 text-red-600"><X size={14} /></button>
            </div>
          ) : (
            <div className="group flex items-center gap-2 cursor-pointer" onClick={() => { setTempTarget(baseDailyTarget.toString()); setIsEditing(true); }}>
              <p className="text-xl font-bold text-indigo-600">₹{displayedTarget.toLocaleString()}</p>
              <Edit2 size={12} className="text-gray-300 opacity-0 group-hover:opacity-100" />
            </div>
          )}
        </div>
      </div>

      <div className="h-[260px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={processedData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }} onMouseMove={(e: any) => { if (e.activePayload) setDisplayValue(e.activePayload[0].value); }} onMouseLeave={() => setDisplayValue(null)}>
            <defs>
              <linearGradient id="multiColorStroke" x1="0" y1="0" x2="0" y2="1">
                <stop offset={stop1} stopColor={topColor} /><stop offset={stop1} stopColor={middleColor} /><stop offset={stop2} stopColor={middleColor} /><stop offset={stop2} stopColor={bottomColor} />
              </linearGradient>
              <linearGradient id="multiColorFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset={stop1} stopColor={topColor} stopOpacity={0.2} /><stop offset={stop1} stopColor={middleColor} stopOpacity={0.1} /><stop offset={stop2} stopColor={middleColor} stopOpacity={0.1} /><stop offset={stop2} stopColor={bottomColor} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <YAxis
              domain={chartHeightDomain}
              allowDataOverflow={true}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 9, fontWeight: 700 }}
              tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`}
              width={35}
            />
            <XAxis dataKey="date" hide={false} axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700 }} tickFormatter={formatXAxis} interval="preserveStartEnd" minTickGap={40} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={displayedTarget}
              stroke={COLORS.ABOVE_TARGET}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'GOAL', position: 'right', fill: COLORS.ABOVE_TARGET, fontSize: 9, fontWeight: 800, dy: -8 }}
            />
            {activeTab !== 'Today' && (
              <ReferenceLine
                y={averageSales}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                label={{ value: 'AVG', position: 'left', fill: '#94a3b8', fontSize: 9, fontWeight: 800, dy: -8 }}
              />
            )}
            <Area type="monotone" dataKey="sales" stroke="url(#multiColorStroke)" fill="url(#multiColorFill)" strokeWidth={3} label={activeTab === 'Today' ? <CustomLabel /> : false}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined) return null;
                // Hide dots for 0 values to keep it neat (first point is 0)
                if (payload.sales === 0 && processedData.indexOf(payload) === 0) return null;
                if (processedData.length > 20 && activeTab !== 'Today') return null;
                return <circle key={payload.date} cx={cx} cy={cy} r={3} fill={getDynamicColor(payload.sales)} />;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {!hideTabs && (
        <div className="flex items-center justify-between mt-6 gap-2">
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg flex-1">
            <LayoutGroup>
              {FOOTER_TABS.map((tab) => (
                <button key={tab} onClick={() => { setActiveTab(tab); setDateRange(null); }} className={`relative flex-1 py-1.5 text-[10px] font-black rounded-md transition-colors z-10 ${activeTab === tab ? "text-white" : "text-gray-500 hover:text-gray-700"}`}>
                  {activeTab === tab && <motion.div layoutId="activeTab-graph" className="absolute inset-0 bg-[#5a4fcf] rounded-md -z-10 shadow-sm" transition={{ type: "spring", stiffness: 300, damping: 25 }} />}
                  {tab}
                </button>
              ))}
            </LayoutGroup>
          </div>
          <div className="relative">
            <button onClick={() => setShowCalendar(!showCalendar)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold bg-[#5a4fcf] text-white"><Filter size={14} /></button>
            {showCalendar && (
              <div className="absolute bottom-full right-0 mb-2 z-50 bg-white rounded-xl shadow-xl border p-2">
                <Calendar onChange={(value) => { setDateRange(value as Value); setActiveTab('Custom'); setShowCalendar(false); }} value={dateRange} selectRange={true} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}