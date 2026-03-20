// // // src/app/api/analytics/sales-chart/route.ts
// import { NextResponse } from "next/server";
// import connectToDatabase from "@/lib/mongodb";
// import Sale from "@/models/Sales"; // Importing 'Sale' to match your model export
// import { getServerSession } from "next-auth/next";
// import { authOptions } from "@/lib/auth";
// import { startOfDay, subDays, subMonths, subYears, startOfYear } from "date-fns";

// export async function GET(req: Request) {
//   try {
//     // 1. Get Logged-in User
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.email) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }
//     const userEmail = session.user.email;

//     await connectToDatabase();

//     // 2. Get Date Range from Frontend
//     const { searchParams } = new URL(req.url);
//     const range = searchParams.get("range") || "1D";

//     let startDate = new Date();
//     let endDate = new Date(); // Default to now
//     const today = new Date();

//     switch (range) {
//       case "1D":
//         startDate = startOfDay(today);
//         endDate = new Date(); // till now
//         break;
//       case "Yesterday":
//         startDate = startOfDay(subDays(today, 1));
//         endDate = startOfDay(today);
//         break;
//       case "7D": startDate = subDays(today, 6); break; // 6 days ago + today = 7 days
//       case "1M": startDate = subMonths(today, 1); break;
//       case "YTD": startDate = startOfYear(today); break;
//       case "1Y": startDate = subYears(today, 1); break;
//       case "5Y": startDate = subYears(today, 5); break;
//       case "MAX": startDate = new Date(0); break;
//       default:
//         startDate = startOfDay(today);
//         endDate = new Date();
//     }

//     // 3. Fetch Every Individual Bill
//     // We filter by tenantId (email) and the date range.
//     const query: { tenantId: string; createdAt: { $gte: Date; $lt?: Date } } = {
//       tenantId: userEmail,
//       createdAt: { $gte: startDate }
//     };

//     // For Yesterday, we need an upper bound (less than today start)
//     if (range === "Yesterday") {
//       query.createdAt.$lt = endDate;
//     }

//     const salesData = await Sale.find(query)
//       .sort({ createdAt: 1 }) // Sort oldest to newest
//       .select("amount createdAt"); // Select 'amount' to match your Schema

//     // 4. Format and Send to Frontend
//     const formatted = salesData.map((item) => ({
//       date: item.createdAt.toISOString(),
//       sales: item.amount, // Using 'amount'
//     }));

//     return NextResponse.json(formatted);

//   } catch (error) {
//     console.error("Error fetching sales chart data:", error);
//     return NextResponse.json({ error: "Internal Error" }, { status: 500 });
//   }
// }



import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Sale from "@/models/Sales"; // Importing 'Sale' to match your model export
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
// --- MODIFIED: Ensure endOfDay is imported for accurate date range filtering ---
import { startOfDay, endOfDay, subDays, subMonths, format } from "date-fns";

export async function GET(req: Request) {
  try {
    const { validateMerchantRequest } = await import('@/lib/api-validation');
    const tenant = await validateMerchantRequest(req);
    let userEmail;

    if (tenant) {
      userEmail = tenant.ownerEmail || tenant.subdomain;
    } else {
      const session = await getServerSession(authOptions) as { user?: { email?: string | null } } | null;
      userEmail = session?.user?.email;
    }

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range");
    // --- NEW: Read startDate and endDate parameters for the custom range ---
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date = new Date(); // Default to now, will be adjusted

    // --- NEW: This logic block makes the custom date range work ---
    // It checks for the calendar dates FIRST.
    if (startDateParam && endDateParam) {
      startDate = startOfDay(new Date(startDateParam));
      endDate = endOfDay(new Date(endDateParam)); // CRUCIAL: Gets all data from the end date until midnight
    }
    // If no custom dates are sent, it falls back to your original logic for "Today", "Weekly", etc.
    else {
      const today = new Date();
      switch (range) {
        case "1D":
          startDate = startOfDay(today);
          endDate = endOfDay(today); // Use endOfDay for consistency
          break;
        case "7D":
          startDate = startOfDay(subDays(today, 6));
          endDate = endOfDay(today);
          break;
        case "1M":
          startDate = startOfDay(subMonths(today, 1));
          endDate = endOfDay(today);
          break;
        // Add any other presets you might have
        default:
          startDate = startOfDay(subMonths(today, 1));
          endDate = endOfDay(today);
      }
    }

    // This query now works for BOTH presets and custom ranges
    const escapedId = userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&');
    const query: { $or: { tenantId: string | { $regex: RegExp } }[]; createdAt?: { $gte: Date; $lte: Date } } = {
      $or: [
        { tenantId: userEmail },
        { tenantId: { $regex: new RegExp(`^${escapedId}$`, 'i') } }
      ]
    };

    // Only apply date filter if range or specific dates are provided
    if (range || (startDateParam && endDateParam)) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    // --- MODIFIED: Use aggregation to group data by hour/day for neater charts ---
    const isSmallRange = range === "1D" ||
      (startDateParam && endDateParam && (new Date(endDateParam).getTime() - new Date(startDateParam).getTime()) <= 48 * 60 * 60 * 1000);

    const unit = isSmallRange ? "hour" : "day";

    const aggregationPipeline = [
      { $match: query },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: "$createdAt",
              unit: unit,
              timezone: "Asia/Kolkata"
            }
          },
          sales: { $sum: "$amount" }
        }
      },
      { $sort: { "_id": 1 } as const },
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: {
              date: "$_id",
              format: unit === "hour" ? "%Y-%m-%dT%H:00:00.000" : "%Y-%m-%dT00:00:00.000",
              timezone: "Asia/Kolkata"
            }
          },
          sales: 1
        }
      }
    ];

    const aggregated = await Sale.aggregate(aggregationPipeline);

    // --- MODIFIED: For Today (1D) view, return raw sales for better granularity ---
    if (range === "1D" && !startDateParam) {
      const rawSales = await Sale.find(query).sort({ createdAt: 1 }).select("amount createdAt");
      const formattedRaw = rawSales.map(item => ({
        date: item.createdAt.toISOString(),
        sales: item.amount
      }));

      // Still need to start at 12 AM with 0 for a neat start
      return NextResponse.json([
        { date: startOfDay(new Date()).toISOString(), sales: 0 },
        ...formattedRaw
      ]);
    }

    // --- NEW: Fill Gaps with 0 Sales for a "Perfect" Timeline (Weekly/Monthly/Custom) ---
    const filledData: { date: string; sales: number }[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    // Create a map for quick lookup
    const salesMap = new Map(aggregated.map(item => [item.date, item.sales]));

    // --- MODIFIED: For Today (1D) view, truncate at current hour instead of midnight ---
    const effectiveEnd = (range === "1D" && !startDateParam) ? new Date() : end;

    while (current <= effectiveEnd) {
      const dateStr = unit === "hour"
        ? format(current, "yyyy-MM-dd'T'HH:00:00.000")
        : format(current, "yyyy-MM-dd'T'00:00:00.000");

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

    return NextResponse.json(filledData);

  } catch (error) {
    console.error("Error fetching sales chart data:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
