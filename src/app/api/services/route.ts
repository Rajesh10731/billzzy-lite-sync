import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from '@/lib/mongodb';
import Service from '@/models/Service';
import Product from '@/models/Product';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

    if (!tenantId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const escapedId = tenantId.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\\\$&');

    const services = await Service.find({
      $or: [
        { tenantId: tenantId },
        { tenantId: { $regex: new RegExp(`^${escapedId}$`, 'i') } }
      ]
    }).sort({ createdAt: -1 });

    return NextResponse.json(services);
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return NextResponse.json({ message: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.email;

  if (!tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const body = await request.json();

    // --- FREE TIER LIMIT ENFORCEMENT ---
    const user = await import('@/models/User').then(m => m.default.findOne({ email: tenantId }));
    const isPro = user?.plan === 'PRO';

    if (!isPro) {
      const escapedId = tenantId.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\\\$&');
      const tenantQuery = {
        $or: [
          { tenantId: tenantId },
          { tenantId: { $regex: new RegExp(`^${escapedId}$`, 'i') } }
        ]
      };

      // Count existing products (case-insensitive)
      const productCount = await Product.countDocuments(tenantQuery);
      // Removed unused serviceCount
      // Mutual Exclusion: If they have products, they cannot add services on the Free Tier
      if (productCount > 0) {
        return NextResponse.json(
          { message: `Free tier limit: You are already using the Inventory module. To use Services, please remove all products or upgrade to Pro.` },
          { status: 403 }
        );
      }
    }

    const newService = await Service.create({
      ...body,
      tenantId: tenantId
    });

    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    console.error("Failed to create service:", error);
    return NextResponse.json({ message: 'Failed to create service' }, { status: 500 });
  }
}
