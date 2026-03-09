// src/app/api/ai-insights/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Sale from "@/models/Sales";

const AI_APIKEY = process.env.AI_APIKEY;

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const tenantId = session.user.email;
        await dbConnect();

        // Get Today's range
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        // Fetch sales for today
        const escapedId = tenantId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const query = {
            $or: [
                { tenantId: tenantId },
                { tenantId: { $regex: new RegExp(`^${escapedId}$`, 'i') } }
            ],
            createdAt: { $gte: startDate, $lte: endDate }
        };

        const todaySales = await Sale.find(query);

        // Aggregate data
        let totalSales = 0;
        const productMap: Record<string, number> = {};

        todaySales.forEach(sale => {
            totalSales += sale.amount;
            sale.items.forEach((item: { name: string; quantity: number }) => {
                productMap[item.name] = (productMap[item.name] || 0) + item.quantity;
            });
        });

        const productList = Object.entries(productMap)
            .map(([name, qty]) => `${name} - ${qty}`)
            .join('\n');

        // Handle Mock Fallback if API Key is missing
        if (!AI_APIKEY) {
            console.warn("AI_APIKEY is missing. Returning mock data.");
            return NextResponse.json({
                salesInsight: totalSales > 0 ? "Daily sales are looking good! Keep promoting your top items." : "No sales recorded yet today. Try offering a morning discount!",
                topProduct: Object.keys(productMap).length > 0 ? Object.keys(productMap)[0] : "N/A",
                slowProduct: Object.keys(productMap).length > 1 ? Object.keys(productMap)[1] : "N/A",
                suggestion: "Consider a bundle offer to increase average order value.",
                isMock: true
            });
        }

        const prompt = `You are an AI business advisor for small retail shop owners using the Billzzy Lite billing application.
Analyze shop sales data and generate short, useful business insights.
Focus on:
1. Sales performance
2. Top selling product
3. Slow selling product
4. One actionable suggestion to improve sales

Rules:
- Keep ALWAYS under 10 words per insight.
- Use simple, direct business language.
- Avoid repeating the category names (e.g., don't say "Top product is...", just say the product name and why).
- Return the result strictly in JSON format.

Format:
{
  "salesInsight": "",
  "topProduct": "",
  "slowProduct": "",
  "suggestion": ""
}

Data:
Total Sales Today: ₹${totalSales}
Products Sold:
${productList || "None"}
`;

        // --- AI PROVIDER DETECTION ---
        const apiKey = process.env.AI_APIKEY || "";
        let aiResponse;

        if (apiKey.startsWith("gsk_")) {
            // GROQ
            aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                })
            });
        } else if (apiKey.startsWith("sk-")) {
            // OPENAI / DEEPSEEK
            const isDeepSeek = apiKey.includes("ds");
            const baseUrl = isDeepSeek ? "https://api.deepseek.com/v1" : "https://api.openai.com/v1";

            aiResponse = await fetch(`${baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: isDeepSeek ? "deepseek-chat" : "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                })
            });
        } else if (apiKey.startsWith("AIza")) {
            // GOOGLE GEMINI (via Fetch API)
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
            if (!content) throw new Error("Gemini failed to generate content");

            return NextResponse.json({
                ...JSON.parse(content),
                lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        } else {
            throw new Error("Unsupported or missing API key prefix");
        }

        if (!aiResponse.ok) {
            const errorData = await aiResponse.json();
            console.error("AI Provider Error:", errorData);
            throw new Error("AI call failed");
        }

        const data = await aiResponse.json();
        const insights = JSON.parse(data.choices[0].message.content);

        return NextResponse.json({
            ...insights,
            lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

    } catch (error) {
        console.error("AI Insights Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
