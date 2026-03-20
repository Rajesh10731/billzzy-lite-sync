import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Sales from "@/models/Sales";
import { authOptions } from "@/lib/auth";

// This file handles requests to: /api/billing-history
export async function GET(req: Request) {
  // ... your existing GET logic here
  try {
    const { validateMerchantRequest } = await import('@/lib/api-validation');
    const tenant = await validateMerchantRequest(req);
    let tenantId;

    if (tenant) {
      tenantId = tenant.ownerEmail || tenant.subdomain;
    } else {
      const session = await getServerSession(authOptions) as { user?: { email?: string | null } } | null;
      tenantId = session?.user?.email;
    }

    if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    startDate.setHours(0, 0, 0, 0);
    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const escapedId = tenantId.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&');

    // Build the query
    const query: { $or: { tenantId: string | { $regex: RegExp } }[]; createdAt?: { $gte: Date; $lte: Date } } = {
      $or: [
        { tenantId: tenantId },
        { tenantId: { $regex: new RegExp(`^${escapedId}$`, 'i') } }
      ]
    };

    // Only apply date filter if explicitly requested
    if (from || to) {
      const startDate = from ? new Date(from) : new Date(0); // Epoch if only 'to' is provided
      if (from) startDate.setHours(0, 0, 0, 0);

      const endDate = to ? new Date(to) : new Date();
      if (to) endDate.setHours(23, 59, 59, 999);

      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const bills = await Sales.find(query).sort({ createdAt: -1 });

    return NextResponse.json(bills);
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
