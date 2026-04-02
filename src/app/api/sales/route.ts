// src/app/api/sales/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Sale from "@/models/Sales";
import Notification from "@/models/Notification";
import { authOptions } from "@/lib/auth";
import { sendPushNotification } from "@/lib/send-push";
import { getRandomMessage } from "@/lib/notifications/messages";

/**
 * GET: Securely fetches sales summary data for the dashboard
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    let tenantId = session?.user?.email;

    if (!tenantId) {
      // Check for API Key auth
      const { validateMerchantRequest } = await import('@/lib/api-validation');
      const tenant = await validateMerchantRequest(request);
      if (tenant) {
        tenantId = tenant.ownerEmail || tenant.subdomain;
      }
    }

    if (!tenantId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');
    const startParam = searchParams.get('startDate');
    const endParam = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date = new Date();
    const now = new Date();

    if (startParam && endParam) {
      startDate = new Date(startParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (period) {
        case 'weekly':
          const firstDayOfWeek = now.getDate() - now.getDay();
          startDate = new Date(now.setDate(firstDayOfWeek));
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        default: // today
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
      }
    }

    await dbConnect();

    const escapedId = tenantId.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\\\$&');
    const query: { $or: { tenantId: string | { $regex: RegExp } }[]; createdAt?: { $gte: Date; $lte: Date } } = {
      $or: [
        { tenantId: tenantId },
        { tenantId: { $regex: new RegExp(`^${escapedId}$`, 'i') } }
      ]
    };

    // Only apply date filter if explicitly requested (period, startDate, or endDate)
    if (period || startParam || endParam) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const periodSales = await Sale.find(query);

    const cashSales = periodSales
      .filter((sale) => sale.paymentMethod === "cash")
      .reduce((sum, sale) => sum + sale.amount, 0);

    const qrSales = periodSales
      .filter((sale) => sale.paymentMethod === "qr-code" || sale.paymentMethod === "qr")
      .reduce((sum, sale) => sum + sale.amount, 0);

    const cardSales = periodSales
      .filter((sale) => sale.paymentMethod === "card")
      .reduce((sum, sale) => sum + sale.amount, 0);

    const totalBills = periodSales.reduce((sum, sale) => sum + 1 + (sale.editCount || 0), 0);
    const totalProfit = periodSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
    const totalSales = cashSales + qrSales + cardSales;

    return NextResponse.json({
      total: totalSales,
      cash: cashSales,
      qr: qrSales,
      card: cardSales,
      profit: totalProfit,
      bills: totalBills,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Failed to fetch sales data:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Securely creates a sale with items and customer phone
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.email;
    await dbConnect();

    const { amount, paymentMethod, profit, items, customerPhone, customerName, merchantName, discount } = await request.json();
    console.log("Creating Sale:", { billId: `BILL-${Date.now()}`, amount, customerPhone, customerName });

    if (!amount || !paymentMethod) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Generate simple bill ID
    const billId = `BILL-${Date.now()}`;

    const newSale = new Sale({
      tenantId,
      billId,
      amount,
      paymentMethod,
      profit: profit || 0,
      customerPhone: customerPhone || "",
      customerName: customerName || "",
      merchantName: merchantName || "",
      discount: discount || 0,
      items: items || [],
    });

    await newSale.save();

    // Trigger Automated "Alive" Notification
    try {
      const celebrationMsg = getRandomMessage('SALE_CELEBRATIONS', { amount });
      const title = "New Sale recorded! 💰";
      const url = `/billing-history?billId=${newSale._id}`;

      // 1. Save to Notification History
      await Notification.create({
        userId: session.user.id,
        title,
        message: celebrationMsg,
        url,
        isRead: false
      });

      // 2. Send Live Push Alert
      await sendPushNotification(session.user.id, title, celebrationMsg, url);
      console.log(`✅ Automated Sale notification triggered for ${tenantId}`);
    } catch (pushErr) {
      console.error("❌ Failed to trigger automated sale notification:", pushErr);
    }

    return NextResponse.json({ message: "Sale created successfully", sale: newSale }, { status: 201 });
  } catch (error) {
    console.error("Failed to create sale:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}