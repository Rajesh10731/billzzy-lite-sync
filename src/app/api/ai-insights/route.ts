// src/app/api/ai-insights/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Sale from "@/models/Sales";

interface SaleItem {
    name: string;
    quantity: number;
}


export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tz = searchParams.get("tz") || "UTC";

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

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
        const salesHistory = await Sale.find({ ...tenantQuery, createdAt: { $gte: ninetyDaysAgo } }).sort({ createdAt: -1 });

        const Product = (await import("@/models/Product")).default;
        const products = await Product.find(tenantQuery);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSales = salesHistory.filter(s => s.createdAt >= thirtyDaysAgo);

        const productVelocity: Record<string, number> = {};
        recentSales.forEach(sale => {
            sale.items.forEach((item: SaleItem) => {
                productVelocity[item.name] = (productVelocity[item.name] || 0) + item.quantity;
            });
        });

        const purchaseSuggestions: string[] = [];
        products.forEach(p => {
            const monthlySales = productVelocity[p.name] || 0;
            const dailyVelocity = monthlySales / 30;
            const daysOfStockLeft = dailyVelocity > 0 ? p.quantity / dailyVelocity : 999;

            if (daysOfStockLeft < 14 || p.quantity <= (p.lowStockThreshold || 10)) {
                const weeklyNeed = Math.ceil(dailyVelocity * 7);
                const suggestQty = Math.max(weeklyNeed * 2, 10); // Buy 2 weeks worth
                purchaseSuggestions.push(`${p.name}: Weekly need is ~${weeklyNeed}, suggest restock: ${suggestQty} units.`);
            }
        });

        const hourCounts: Record<number, number> = {};
        const dayCounts: Record<number, number> = {};
        const dayMap: Record<string, number> = { "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6 };

        salesHistory.forEach(sale => {
            const date = new Date(sale.createdAt);
            
            // Extract hour and day in the target timezone
            const hourStr = date.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", hour12: false });
            const dayStr = date.toLocaleDateString("en-US", { timeZone: tz, weekday: "short" });
            
            const hour = parseInt(hourStr) || 0;
            const day = dayMap[dayStr] ?? 0;
            
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });

        const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const peakTimeStr = peakHour ? `${peakHour}:00 on ${days[Number(peakDay)]}s` : "N/A";

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

        const sortedProducts = Object.entries(productVelocity).sort((a, b) => b[1] - a[1]);
        const topProdName = sortedProducts[0]?.[0] || "None";
        const slowProdName = sortedProducts.length > 1 ? sortedProducts[sortedProducts.length - 1]?.[0] : "None";

        if (salesHistory.length === 0) {
            return NextResponse.json({
                salesInsight: "No historical sales data yet.",
                topProduct: "N/A",
                slowProduct: "N/A",
                suggestion: "Start recording sales to see AI insights!",
                churnRate: "0%",
                peakTime: "N/A",
                retargeting: "N/A"
            });
        }

        const prompt = `You are an AI business advisor for small retail shop owners.
Analyze the following detailed business data and generate short, professional, and actionable insights.

Data Summary:
- Top Product: ${topProdName}
- Slow Product: ${slowProdName}
- Peak Sales Time: ${peakTimeStr}
- Churn Rate: ${churnRateVal.toFixed(1)}%
- At-Risk Customers: ${atRiskCustomers}
- Purchase Suggestions: ${purchaseSuggestions.slice(0, 3).join(", ") || "None"}

Rules:
1. salesInsight: Overall performance & peak times. (under 12 words)
2. topProduct: Why it's winning. (under 10 words)
3. slowProduct: Specific fix (discount, bundle). (under 10 words)
4. suggestion: Actionable step for churn or inventory. (under 12 words)
5. retargeting: Specific group to message (loyal vs at-risk). (under 10 words)

Return valid JSON.
{
  "salesInsight": "",
  "peakTime": "${peakTimeStr}",
  "topProduct": "",
  "slowProduct": "",
  "suggestion": "",
  "retargeting": "",
  "churnRate": "${churnRateVal.toFixed(1)}%"
}
`;

        const apiKey = process.env.AI_APIKEY || "";
        let insights;
        let aiResponse;

        try {
            if (!apiKey) throw new Error("No API Key");

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

                const data = await aiResponse.json();
                const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!content) throw new Error("Gemini failed");
                insights = JSON.parse(content);
            }

            if (aiResponse && !aiResponse.ok) {
                const errorData = await aiResponse.json();
                console.error("AI Provider Error:", errorData);
                throw new Error("AI call failed");
            }

            if (!insights && aiResponse) {
                const data = await aiResponse.json();
                insights = JSON.parse(data.choices[0].message.content);
            }
        } catch (error) {
            console.warn("AI Insights failed, returning fallback data:", error);
            return NextResponse.json({
                salesInsight: `Overall performance is stable.`,
                peakTime: peakTimeStr,
                topProduct: topProdName,
                slowProduct: slowProdName,
                suggestion: purchaseSuggestions[0] || "Continue tracking your high-selling items.",
                retargeting: atRiskCustomers > 0 ? "Re-engage at-risk customers." : "Engage with your top customers.",
                churnRate: `${churnRateVal.toFixed(1)}%`,
                lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isFallback: true
            });
        }

        return NextResponse.json({
            ...insights,
            lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

    } catch (error) {
        console.error("AI Insights Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
