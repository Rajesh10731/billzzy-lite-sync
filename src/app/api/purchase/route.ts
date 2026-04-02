import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Purchase from "@/models/purchase";

// ✅ GET all purchases for the tenant
export async function GET(request: Request) {
  try {
    const { validateMerchantRequest } = await import('@/lib/api-validation');
    const tenant = await validateMerchantRequest(request);
    let tenantId;

    if (tenant) {
      tenantId = tenant.ownerEmail || tenant.subdomain;
    } else {
      const session = await getServerSession(authOptions);
      tenantId = session?.user?.email;
    }

    // Protect the route: ensure the user is authenticated
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const escapedId = tenantId.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\\\$&');
    const purchases = await Purchase.find({
      $or: [
        { tenantId: tenantId },
        { tenantId: { $regex: new RegExp(`^${escapedId}$`, 'i') } }
      ]
    }).sort({ createdAt: -1 });
    return NextResponse.json(purchases);
  } catch (error) {
    console.error("Failed to fetch purchases:", error);
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }
}

// ✅ POST new purchase for the tenant
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.email;

    // Protect the route: ensure the user is authenticated
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const newPurchase = await Purchase.create({ ...body, tenantId });
    return NextResponse.json(newPurchase);
  } catch {
    return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 });
  }
}