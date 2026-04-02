import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Sale from "@/models/Sales";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { startOfDay, endOfDay, subDays, subMonths, format } from "date-fns";

interface AggregatedSale {
    date: string;
    sales: number;
}

/**
 * Retrieves the authorized user email from either the merchant validation or session.
 */
async function getUserEmail(req: Request) {
    const { validateMerchantRequest } = await import('@/lib/api-validation');
    const tenant = await validateMerchantRequest(req);
    if (tenant) return tenant.ownerEmail || tenant.subdomain;

    const session = await getServerSession(authOptions) as { user?: { email?: string | null } } | null;
    return session?.user?.email;
}

/**
 * Calculates the start and end dates based on parameters.
 */
function getDateRange(searchParams: URLSearchParams) {
    const range = searchParams.get("range");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const today = new Date();

    if (startDateParam && endDateParam) {
        return {
            startDate: startOfDay(new Date(startDateParam)),
            endDate: endOfDay(new Date(endDateParam)),
            isCustom: true
        };
    }

    let startDate: Date;
    const endDate: Date = endOfDay(today);

    switch (range) {
        case "1D":
            startDate = startOfDay(today);
            break;
        case "7D":
            startDate = startOfDay(subDays(today, 6));
            break;
        case "1M":
            startDate = startOfDay(subMonths(today, 1));
            break;
        default:
            startDate = startOfDay(subMonths(today, 1));
    }

    return { startDate, endDate, isCustom: false };
}

/**
 * Fills in missing time units with zero-value sales.
 */
function fillChartGaps(aggregated: AggregatedSale[], startDate: Date, endDate: Date, unit: "hour" | "day", is1DToday: boolean) {
    const filledData: { date: string; sales: number }[] = [];
    const salesMap = new Map(aggregated.map(item => [item.date, item.sales]));
    const current = new Date(startDate);
    const effectiveEnd = is1DToday ? new Date() : endDate;

    while (current <= effectiveEnd) {
        const formatStr = unit === "hour" ? "yyyy-MM-dd'T'HH:00:00.000" : "yyyy-MM-dd'T'00:00:00.000";
        const dateStr = format(current, formatStr);

        filledData.push({
            date: dateStr,
            sales: salesMap.get(dateStr) || 0
        });

        if (unit === "hour") {
            current.setHours(current.getHours() + 1);
        } else {
            current.setDate(current.getDate() + 1);
        }
    }
    return filledData;
}

export async function GET(req: Request) {
    try {
        const userEmail = await getUserEmail(req);
        if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const { startDate, endDate } = getDateRange(searchParams);
        const range = searchParams.get("range");
        const startDateParam = searchParams.get("startDate");

        const escapedId = userEmail.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\\\$&');
        const query: Record<string, unknown> = {
            $or: [{ tenantId: userEmail }, { tenantId: { $regex: new RegExp(`^${escapedId}$`, 'i') } }]
        };

        if (range || (startDateParam && searchParams.get("endDate"))) {
            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        const isSmallRange = range === "1D" || (startDateParam && searchParams.get("endDate") && (new Date(searchParams.get("endDate")!).getTime() - new Date(startDateParam).getTime()) <= 48 * 60 * 60 * 1000);
        const unit = isSmallRange ? "hour" : "day";

        const aggregated = await Sale.aggregate([
            { $match: query },
            { $group: { _id: { $dateTrunc: { date: "$createdAt", unit, timezone: "Asia/Kolkata" } }, sales: { $sum: "$amount" } } },
            { $sort: { "_id": 1 } },
            {
                $project: {
                    _id: 0,
                    date: { $dateToString: { date: "$_id", format: unit === "hour" ? "%Y-%m-%dT%H:00:00.000" : "%Y-%m-%dT00:00:00.000", timezone: "Asia/Kolkata" } },
                    sales: 1
                }
            }
        ]);

        if (range === "1D" && !startDateParam) {
            const rawSales = await Sale.find(query).sort({ createdAt: 1 }).select("amount createdAt");
            return NextResponse.json([{ date: startOfDay(new Date()).toISOString(), sales: 0 }, ...rawSales.map(s => ({ date: s.createdAt.toISOString(), sales: s.amount }))]);
        }

        return NextResponse.json(fillChartGaps(aggregated, startDate, endDate, unit, range === "1D" && !startDateParam));

    } catch (error) {
        console.error("Error fetching sales chart data:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
