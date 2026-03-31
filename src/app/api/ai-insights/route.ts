import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Sale, { ISale } from "@/models/Sales";
import Product from "@/models/Product";
import Service from "@/models/Service";
import User from "@/models/User";

interface SaleItem {
    name: string;
    quantity: number;
    price: number;
    type?: "product" | "service";
}

interface UserContext {
    email: string;
    plan: string;
    features?: {
        productAI?: boolean;
        serviceAI?: boolean;
    };
}

interface BusinessData {
    salesHistory: ISale[];
    tenantProducts: { name: string; quantity: number; lowStockThreshold?: number }[];
    tenantServices: { name: string }[];
}

interface BusinessMetrics {
    peakTimeStr: string;
    quietHoursStr: string;
    quietHours: string[];
    dailyPeaks: Record<string, string>;
    topProduct: string;
    slowProduct: string;
    topService: string;
    slowService: string;
    churnRateVal: number;
    atRiskCustomers: number;
    purchaseSuggestions: string[];
}

interface AIResponse {
    salesInsight?: string;
    topProduct?: string;
    slowProduct?: string;
    topService?: string;
    slowService?: string;
    suggestion?: string;
    retargeting?: string;
    churnRate?: string;
    offPeakTip?: string;
}

/**
 * Validates the user session and checks feature gating.
 */
async function validateUserAndPlan(type: string): Promise<{ user?: UserContext; error?: { message: string; status: number } }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return { error: { message: "Unauthorized", status: 401 } };
    }

    await dbConnect();
    const dbUser = await User.findOne({ email: session.user.email }).select('plan features');
    if (!dbUser) {
        return { error: { message: "User not found.", status: 404 } };
    }

    const { plan, features } = dbUser;
    const isPro = plan === "PRO";

    if (type === "product" && !features?.productAI && !isPro) {
        return { error: { message: "Product AI Insight is locked for your plan.", status: 403 } };
    }
    if (type === "service" && !features?.serviceAI && !isPro) {
        return { error: { message: "Service AI Insight is locked for your plan.", status: 403 } };
    }

    return { user: { email: session.user.email, plan, features } };
}

/**
 * Fetches relevant business data for the tenant.
 */
async function getBusinessData(tenantId: string): Promise<BusinessData> {
    const escapedId = tenantId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tenantQuery = {
        $or: [
            { tenantId: tenantId },
            { tenantId: { $regex: new RegExp(`^${escapedId}$`, 'i') } }
        ]
    };

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [salesHistory, tenantProducts, tenantServices] = await Promise.all([
        Sale.find({ ...tenantQuery, createdAt: { $gte: ninetyDaysAgo } }).lean().exec() as unknown as Promise<ISale[]>,
        Product.find(tenantQuery).lean().exec() as unknown as Promise<{ name: string; quantity: number; lowStockThreshold?: number }[]>,
        Service.find(tenantQuery).lean().exec() as unknown as Promise<{ name: string }[]>
    ]);

    return { salesHistory, tenantProducts, tenantServices };
}

/**
 * Calculates business stats from history.
 */
function calculateBusinessMetrics(data: BusinessData, tz: string): BusinessMetrics {
    const { salesHistory, tenantProducts, tenantServices } = data;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSales = salesHistory.filter(s => new Date(s.createdAt) >= thirtyDaysAgo);

    // 1. Process Product/Service Stats
    const productStats: Record<string, { quantity: number; revenue: number }> = {};
    const serviceStats: Record<string, { quantity: number; revenue: number }> = {};
    
    tenantProducts.forEach(p => { productStats[p.name.trim()] = { quantity: 0, revenue: 0 }; });
    tenantServices.forEach(s => { serviceStats[s.name.trim()] = { quantity: 0, revenue: 0 }; });

    salesHistory.forEach(sale => {
        sale.items.forEach((item: SaleItem) => {
            const name = item.name.trim();
            const stats = item.type === "service" ? serviceStats : productStats;
            if (stats[name]) {
                stats[name].quantity += item.quantity;
                stats[name].revenue += (item.quantity * item.price);
            } else {
                const matchingKey = Object.keys(stats).find(k => k.toLowerCase() === name.toLowerCase());
                if (matchingKey) {
                    stats[matchingKey].quantity += item.quantity;
                    stats[matchingKey].revenue += (item.quantity * item.price);
                }
            }
        });
    });

    const sortInsights = (stats: Record<string, { quantity: number; revenue: number }>) => {
        const sortedByRev = Object.entries(stats).sort((a, b) => b[1].revenue - a[1].revenue);
        const sortedByQty = Object.entries(stats).sort((a, b) => a[1].quantity - b[1].quantity);
        return { top: sortedByRev[0]?.[0] || "N/A", slow: sortedByQty[0]?.[0] || "None" };
    };

    const prodInsights = sortInsights(productStats);
    const servInsights = sortInsights(serviceStats);

    // 2. Process Time Peak Stats
    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<number, number> = {};
    const dayHourCounts: Record<number, Record<number, number>> = {};
    const dayMap: Record<string, number> = { "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6 };

    salesHistory.forEach(sale => {
        const date = new Date(sale.createdAt);
        const hour = Number.parseInt(date.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", hour12: false })) || 0;
        const day = dayMap[date.toLocaleDateString("en-US", { timeZone: tz, weekday: "short" })] ?? 0;
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        dayCounts[day] = (dayCounts[day] || 0) + 1;
        if (!dayHourCounts[day]) dayHourCounts[day] = {};
        dayHourCounts[day][hour] = (dayHourCounts[day][hour] || 0) + 1;
    });

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dailyPeaks: Record<string, string> = {};
    days.forEach((dayName, idx) => {
        const hoursForDay = dayHourCounts[idx];
        if (hoursForDay) {
            const bestHour = Object.entries(hoursForDay).sort((a, b) => b[1] - a[1])[0]?.[0];
            if (bestHour) {
                const hNum = Number.parseInt(bestHour);
                dailyPeaks[dayName] = `${hNum % 12 || 12}:00 ${hNum >= 12 ? "PM" : "AM"}`;
            } else dailyPeaks[dayName] = "N/A";
        } else dailyPeaks[dayName] = "N/A";
    });

    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    let peakTimeStr = "N/A";
    if (peakHour && peakDay) {
        const hNum = Number.parseInt(peakHour);
        peakTimeStr = `${hNum % 12 || 12}:00 ${hNum >= 12 ? "PM" : "AM"} on ${days[Number(peakDay)]}s`;
    }

    const businessHours = Array.from({ length: 13 }, (_, i) => i + 9);
    const quietHoursRaw = businessHours.map(h => ({ hour: h, count: hourCounts[h] || 0 })).sort((a, b) => a.count - b.count).slice(0, 3);
    const quietHours = quietHoursRaw.map(item => `${item.hour % 12 || 12}${item.hour >= 12 ? "PM" : "AM"}`);

    // 3. Customer and Inventory
    const customerStats: Record<string, { count: number; lastDate: Date }> = {};
    salesHistory.forEach(sale => {
        if (sale.customerPhone) {
            const stats = customerStats[sale.customerPhone] || { count: 0, lastDate: new Date(sale.createdAt) };
            stats.count++;
            if (new Date(sale.createdAt) > stats.lastDate) stats.lastDate = new Date(sale.createdAt);
            customerStats[sale.customerPhone] = stats;
        }
    });

    const lastMonthStart = new Date(); lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const prevMonthStart = new Date(); prevMonthStart.setMonth(prevMonthStart.getMonth() - 2);
    const activeLastMonth = Object.values(customerStats).filter(c => c.lastDate >= lastMonthStart).length;
    const activePrevMonth = Object.values(customerStats).filter(c => c.lastDate >= prevMonthStart && c.lastDate < lastMonthStart).length;
    
    const purchaseSuggestions: string[] = [];
    tenantProducts.forEach(p => {
        const monthlySales = recentSales.reduce((acc, sale) => acc + (sale.items.find(i => i.name === p.name)?.quantity || 0), 0);
        const dailyVelocity = monthlySales / 30;
        if (dailyVelocity > 0 && (p.quantity / dailyVelocity < 14) || p.quantity <= (p.lowStockThreshold || 10)) {
            purchaseSuggestions.push(`${p.name} (Stock: ${p.quantity}, Suggest: restock ~${Math.max(Math.ceil(dailyVelocity * 14), 10)})`);
        }
    });

    return {
        peakTimeStr, quietHoursStr: quietHours.join(", "), quietHours, dailyPeaks,
        topProduct: prodInsights.top, slowProduct: prodInsights.slow,
        topService: servInsights.top, slowService: servInsights.slow,
        churnRateVal: activePrevMonth > 0 ? Math.max(0, ((activePrevMonth - activeLastMonth) / activePrevMonth) * 100) : 0,
        atRiskCustomers: Object.entries(customerStats).filter(([, s]) => s.lastDate < thirtyDaysAgo && s.count > 1).length,
        purchaseSuggestions
    };
}

/**
 * Handles communication with OpenAI-compatible providers (Groq, OpenAI, DeepSeek).
 */
async function fetchOpenAICompatible(apiKey: string, prompt: string): Promise<AIResponse | null> {
    let url = "https://api.openai.com/v1/chat/completions";
    let model = "gpt-4o-mini";

    if (apiKey.startsWith("gsk_")) {
        url = "https://api.groq.com/openai/v1/chat/completions";
        model = "llama-3.3-70b-versatile";
    } else if (apiKey.includes("ds")) {
        url = "https://api.deepseek.com/v1/chat/completions";
        model = "deepseek-chat";
    }

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    return content ? JSON.parse(content) : null;
}

/**
 * Handles communication with Google Gemini.
 */
async function fetchGeminiCompatible(apiKey: string, prompt: string): Promise<AIResponse | null> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt + " (Strictly return JSON format)" }] }],
            generationConfig: { response_mime_type: "application/json" }
        })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return content ? JSON.parse(content) : null;
}

/**
 * Handles communication with various AI providers.
 */
async function getAIInsights(prompt: string): Promise<AIResponse | null> {
    const apiKey = process.env.AI_APIKEY || "";
    if (!apiKey) return null;

    try {
        if (apiKey.startsWith("AIza")) {
            return await fetchGeminiCompatible(apiKey, prompt);
        }
        return await fetchOpenAICompatible(apiKey, prompt);
    } catch (e) {
        console.warn("AI service call failed:", e);
        return null;
    }
}

/**
 * Merges AI insights with local fallbacks.
 */
function formatFinalResponse(insights: AIResponse | null, metrics: BusinessMetrics, type: string) {
    return {
        salesInsight: insights?.salesInsight || `Stable performance, peak at ${metrics.peakTimeStr}.`,
        peakTime: metrics.peakTimeStr,
        dailyPeaks: metrics.dailyPeaks,
        topProduct: insights?.topProduct || (type !== "service" ? `Top revenue from ${metrics.topProduct}.` : "N/A"),
        slowProduct: insights?.slowProduct || (type !== "service" ? `Improve ${metrics.slowProduct} sales.` : "N/A"),
        topService: insights?.topService || (type !== "product" ? `Top revenue from ${metrics.topService}.` : "N/A"),
        slowService: insights?.slowService || (type !== "product" ? `Improve ${metrics.slowService} sales.` : "N/A"),
        suggestion: insights?.suggestion || (metrics.purchaseSuggestions.length > 0 
            ? `Restock ${metrics.purchaseSuggestions[0].split('(')[0].trim()} and other low items.` 
            : "Maintain current inventory levels and service quality."),
        retargeting: insights?.retargeting || (metrics.atRiskCustomers > 0 ? "Re-engage at-risk customers." : "Engage with loyal customers."),
        churnRate: insights?.churnRate || `${metrics.churnRateVal.toFixed(1)}%`,
        offPeakTip: insights?.offPeakTip || (type === "service" ? `Offer special deals for ${metrics.quietHours[0]} bookings.` : `Run limited-time flash sales at ${metrics.quietHours[0]}.`),
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFallback: !insights
    };
}


        /**
 * Constructs the prompt for the AI.
 */
function generateAIPrompt(metrics: BusinessMetrics, type: string): string {
    const { topProduct, slowProduct, topService, slowService, peakTimeStr, quietHoursStr, churnRateVal, atRiskCustomers, purchaseSuggestions } = metrics;
    return `You are an AI business ${type === "service" ? "service advisor" : type === "product" ? "inventory advisor" : "advisor"} for small retail shop owners.
Analyze following data and generate short, professional, and actionable insights. Use perfect spelling and clear business terminology.

Data Summary:
${type !== "service" ? `- Top Product (Revenue): ${topProduct}
- Slow Product (Sales): ${slowProduct}` : ""}
${type !== "product" ? `- Top Service (Revenue): ${topService}
- Slow Service (Sales): ${slowService}` : ""}
- Peak Sales Time: ${peakTimeStr}
- Identified Quiet Hours (Off-Peak): ${quietHoursStr}
- Churn Rate: ${churnRateVal.toFixed(1)}%
- At-Risk Customers: ${atRiskCustomers}
- Inventory Alerts: ${purchaseSuggestions.slice(0, 3).join(", ") || "All stock levels healthy."}

Rules (STRICT JSON):
1. salesInsight: A one-sentence summary of trends and peak performance. (under 12 words)
2. topProduct: Highest revenue product name or summary. (under 8 words). Use "${topProduct}" as baseline if data matches.
3. slowProduct: Low-performance product and improvement tip. (under 12 words). Use "${slowProduct}" as baseline if data matches.
4. topService: Highest revenue service name or summary. (under 8 words). Use "${topService}" as baseline if data matches.
5. slowService: Low-performance service and improvement tip. (under 12 words). Use "${slowService}" as baseline if data matches.
6. suggestion: An actionable business step. If there are Inventory Alerts, prioritize a restock suggestion. (under 12 words)
7. retargeting: A specific marketing message for customers. (under 10 words)
8. offPeakTip: A specific actionable strategy to drive ${type === "service" ? "bookings" : "sales"} specifically during the quiet hours of ${quietHoursStr}. (under 15 words)

CRITICAL: Use perfect spelling. Do not truncate words. Ensure the JSON is valid.

Return valid JSON:
{
  "salesInsight": "",
  "peakTime": "${peakTimeStr}",
  "topProduct": "${topProduct}",
  "slowProduct": "${slowProduct}",
  "topService": "${topService}",
  "slowService": "${slowService}",
  "suggestion": "",
  "retargeting": "",
  "churnRate": "${churnRateVal.toFixed(1)}%",
  "offPeakTip": ""
}
`;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tz = searchParams.get("tz") || "UTC";
        const type = searchParams.get("type") || "all";

        const { user, error } = await validateUserAndPlan(type);
        if (error) return NextResponse.json({ message: error.message }, { status: error.status });
        if (!user) return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });

        const data = await getBusinessData(user.email);
        const { salesHistory, tenantProducts, tenantServices } = data;

        if (salesHistory.length === 0) {
            return NextResponse.json({
                salesInsight: "No historical sales data yet.",
                peakTime: "N/A",
                topProduct: tenantProducts.length > 0 ? "Inventory Ready" : "N/A",
                slowProduct: "N/A",
                topService: tenantServices.length > 0 ? "Services Ready" : "N/A",
                slowService: "N/A",
                suggestion: "Start recording sales to see AI insights.",
                retargeting: "N/A",
                churnRate: "0%",
                isFallback: true
            });
        }

        const metrics = calculateBusinessMetrics(data, tz);
        const prompt = generateAIPrompt(metrics, type);
        const insights = await getAIInsights(prompt);
        const finalInsights = formatFinalResponse(insights, metrics, type);

        return NextResponse.json(finalInsights);

    } catch (error) {
        console.error("AI Insights Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
