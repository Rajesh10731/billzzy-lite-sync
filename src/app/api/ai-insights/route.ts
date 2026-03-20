import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Sale, { ISale } from "@/models/Sales";
import Product from "@/models/Product";
import Service from "@/models/Service";

interface SaleItem {
    name: string;
    quantity: number;
    price: number;
    type?: "product" | "service";
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tz = searchParams.get("tz") || "UTC";
        const type = searchParams.get("type") || "all"; // "product", "service", or "all"

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        
        // ... (existing logic for tenantQuery and fetching data)
        const tenantId = session.user.email;
        await dbConnect();

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
            Sale.find({
                ...tenantQuery,
                createdAt: { $gte: ninetyDaysAgo }
            }).lean() as unknown as ISale[],
            Product.find(tenantQuery).lean() as unknown as { name: string; quantity: number; lowStockThreshold?: number }[],
            Service.find(tenantQuery).lean() as unknown as { name: string }[]
        ]);

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

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSales = salesHistory.filter(s => s.createdAt >= thirtyDaysAgo);

        // Product & Service Statistics
        const productStats: Record<string, { quantity: number; revenue: number }> = {};
        const serviceStats: Record<string, { quantity: number; revenue: number }> = {};
        
        tenantProducts.forEach(p => productStats[p.name] = { quantity: 0, revenue: 0 });
        tenantServices.forEach(s => serviceStats[s.name] = { quantity: 0, revenue: 0 });

        salesHistory.forEach(sale => {
            sale.items.forEach((item: SaleItem) => {
                const name = item.name.trim();
                const isService = item.type === "service";
                const stats = isService ? serviceStats : productStats;
                
                if (!stats[name]) {
                    stats[name] = { quantity: 0, revenue: 0 };
                }
                stats[name].quantity += item.quantity;
                stats[name].revenue += (item.quantity * item.price);
            });
        });

        const sortInsights = (stats: Record<string, { quantity: number; revenue: number }>) => {
            const sortedByRev = Object.entries(stats).sort((a, b) => b[1].revenue - a[1].revenue);
            const sortedByQty = Object.entries(stats).sort((a, b) => a[1].quantity - b[1].quantity);
            return {
                top: sortedByRev[0]?.[0] || "N/A",
                slow: sortedByQty[0]?.[0] || "None"
            };
        };

        const prodInsights = sortInsights(productStats);
        const servInsights = sortInsights(serviceStats);

        const topProduct = prodInsights.top;
        const slowProduct = prodInsights.slow;
        const topService = servInsights.top;
        const slowService = servInsights.slow;

        // Peak Sales Time (Timezone Aware & Daily Breakdown)
        const hourCounts: Record<number, number> = {};
        const dayCounts: Record<number, number> = {};
        const dayHourCounts: Record<number, Record<number, number>> = {};
        const dayMap: Record<string, number> = { "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6 };

        salesHistory.forEach(sale => {
            const date = new Date(sale.createdAt);
            const hourStr = date.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", hour12: false });
            const dayStr = date.toLocaleDateString("en-US", { timeZone: tz, weekday: "short" });
            const hour = parseInt(hourStr) || 0;
            const day = dayMap[dayStr] ?? 0;

            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            dayCounts[day] = (dayCounts[day] || 0) + 1;

            if (!dayHourCounts[day]) dayHourCounts[day] = {};
            dayHourCounts[day][hour] = (dayHourCounts[day][hour] || 0) + 1;
        });

        const peakHourEntries = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
        const peakDayEntries = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]);
        const peakHour = peakHourEntries[0]?.[0];
        const peakDay = peakDayEntries[0]?.[0];
        
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        
        const dailyPeaks: Record<string, string> = {};
        days.forEach((dayName, idx) => {
            const hoursForDay = dayHourCounts[idx];
            if (hoursForDay) {
                const bestHour = Object.entries(hoursForDay).sort((a, b) => b[1] - a[1])[0]?.[0];
                if (bestHour) {
                    const hNum = parseInt(bestHour);
                    const period = hNum >= 12 ? "PM" : "AM";
                    const h12 = hNum % 12 || 12;
                    dailyPeaks[dayName] = `${h12}:00 ${period}`;
                } else {
                    dailyPeaks[dayName] = "N/A";
                }
            } else {
                dailyPeaks[dayName] = "N/A";
            }
        });

        let peakTimeStr = "N/A";
        if (peakHour) {
            const hourNum = parseInt(peakHour);
            const period = hourNum >= 12 ? "PM" : "AM";
            const hour12 = hourNum % 12 || 12;
            peakTimeStr = `${hour12}:00 ${period} on ${days[Number(peakDay)]}s`;
        }

        // Customer Insights
        const customerStats: Record<string, { count: number; lastDate: Date }> = {};
        salesHistory.forEach(sale => {
            if (sale.customerPhone) {
                const stats = customerStats[sale.customerPhone] || { count: 0, lastDate: sale.createdAt };
                stats.count++;
                if (sale.createdAt > stats.lastDate) stats.lastDate = sale.createdAt;
                customerStats[sale.customerPhone] = stats;
            }
        });

        const lastMonthStart = new Date();
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        const prevMonthStart = new Date();
        prevMonthStart.setMonth(prevMonthStart.getMonth() - 2);

        const activeLastMonth = Object.values(customerStats).filter(c => c.lastDate >= lastMonthStart).length;
        const activePrevMonth = Object.values(customerStats).filter(c => c.lastDate >= prevMonthStart && c.lastDate < lastMonthStart).length;
        const churnRateVal = activePrevMonth > 0 ? Math.max(0, ((activePrevMonth - activeLastMonth) / activePrevMonth) * 100) : 0;
        const atRiskCustomers = Object.entries(customerStats)
            .filter(([, stats]) => stats.lastDate < thirtyDaysAgo && stats.count > 1)
            .length;

        // Purchase Suggestions (Velocity based)
        const purchaseSuggestions: string[] = [];
        tenantProducts.forEach(p => {
            const monthlySales = recentSales.reduce((acc, sale) => {
                const item = sale.items.find(i => i.name === p.name);
                return acc + (item?.quantity || 0);
            }, 0);
            
            const dailyVelocity = monthlySales / 30;
            const daysOfStockLeft = dailyVelocity > 0 ? p.quantity / dailyVelocity : 999;

            if (daysOfStockLeft < 14 || p.quantity <= (p.lowStockThreshold || 10)) {
                const weeklyNeed = Math.ceil(dailyVelocity * 7);
                const suggestQty = Math.max(weeklyNeed * 2, 10);
                purchaseSuggestions.push(`${p.name}: Low stock, suggest restock ~${suggestQty} units.`);
            }
        });

        const prompt = `You are an AI business ${type === "service" ? "service advisor" : type === "product" ? "inventory advisor" : "advisor"} for small retail shop owners.
Analyze following data and generate short, professional, and actionable insights.

Data Summary:
${type !== "service" ? `- Top Product (Revenue): ${topProduct}
- Slow Product (Sales): ${slowProduct}` : ""}
${type !== "product" ? `- Top Service (Revenue): ${topService}
- Slow Service (Sales): ${slowService}` : ""}
- Peak Sales Time: ${peakTimeStr}
- Churn Rate: ${churnRateVal.toFixed(1)}%
- At-Risk Customers: ${atRiskCustomers}
${type !== "service" ? `- Purchase Suggestions: ${purchaseSuggestions.slice(0, 3).join(", ") || "None"}` : ""}

Rules (STRICT JSON):
1. salesInsight: ${type === "service" ? "Booking trends & peak hours" : "Stock performance & peak times"}. (under 12 words)
2. topProduct/topService: ${type === "service" ? "Most popular service" : "Best selling items"}. (under 10 words total)
3. slowProduct/slowService: ${type === "service" ? "Service improvement fix" : "Inventory/Discount fix"}. (under 10 words total)
4. suggestion: Actionable step for ${type === "service" ? "customer retention" : "inventory/churn"}. (under 12 words)
5. retargeting: Specific group message. (under 10 words)

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
  "churnRate": "${churnRateVal.toFixed(1)}%"
}
`;

        const apiKey = process.env.AI_APIKEY || "";
        let insights;

        try {
            if (!apiKey) throw new Error("No API Key");

            let aiResponse;
            if (apiKey.startsWith("gsk_")) {
                aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [{ role: "user", content: prompt }],
                        response_format: { type: "json_object" }
                    })
                });
            } else if (apiKey.startsWith("sk-")) {
                const isDeepSeek = apiKey.includes("ds");
                const baseUrl = isDeepSeek ? "https://api.deepseek.com/v1" : "https://api.openai.com/v1";
                aiResponse = await fetch(`${baseUrl}/chat/completions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model: isDeepSeek ? "deepseek-chat" : "gpt-4o-mini",
                        messages: [{ role: "user", content: prompt }],
                        response_format: { type: "json_object" }
                    })
                });
            } else if (apiKey.startsWith("AIza")) {
                aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt + " (Strictly return JSON format)" }] }],
                        generationConfig: { response_mime_type: "application/json" }
                    })
                });
                
                if (aiResponse.ok) {
                    const data = await aiResponse.json();
                    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (content) insights = JSON.parse(content);
                }
            }

            if (aiResponse && aiResponse.ok && !insights) {
                const data = await aiResponse.json();
                const content = data.choices[0].message.content;
                if (content) insights = JSON.parse(content);
            }

        } catch (error) {
            console.warn("AI call failed, using local processing:", error);
        }

        if (!insights) {
            return NextResponse.json({
                salesInsight: `Stable performance, peak at ${peakTimeStr}.`,
                peakTime: peakTimeStr,
                dailyPeaks,
                topProduct: `Top revenue from ${topProduct}.`,
                slowProduct: `Improve ${slowProduct} sales.`,
                topService: `Top revenue from ${topService}.`,
                slowService: `Improve ${slowService} sales.`,
                suggestion: purchaseSuggestions[0] || "Maintain current inventory levels.",
                retargeting: atRiskCustomers > 0 ? "Re-engage at-risk customers." : "Engage with loyal customers.",
                churnRate: `${churnRateVal.toFixed(1)}%`,
                lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isFallback: true
            });
        }

        return NextResponse.json({
            ...insights,
            peakTime: peakTimeStr,
            dailyPeaks,
            lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

    } catch (error) {
        console.error("AI Insights Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
