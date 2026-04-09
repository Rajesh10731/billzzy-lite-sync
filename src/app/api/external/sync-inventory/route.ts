import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import User from '@/models/User';
import mongoose from 'mongoose';

// This log will run as soon as the server starts/reloads
console.log("⚡ [EXTERNAL API] SYNC-INVENTORY FILE LOADED");

export async function POST(req: Request) {
  console.log("📥 [EXTERNAL API] Incoming POST request detected!");

  try {
    const secret = req.headers.get('x-sync-secret');
    console.log("🔑 [EXTERNAL API] Received Secret:", secret);

    if (secret !== process.env.SYNC_SECRET) {
      console.log("❌ [EXTERNAL API] Secret Mismatch!");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log("📦 [EXTERNAL API] Request Body:", body);

    const { sku, quantity, sellingPrice, tenantId } = body;

    await dbConnect();
    console.log("DB [EXTERNAL API] Connected to MongoDB");

    // 1. Find User
    const user = await User.findById(new mongoose.Types.ObjectId(tenantId));
    if (!user) {
      console.log(`❌ [EXTERNAL API] User ID ${tenantId} not found.`);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    console.log(`👤 [EXTERNAL API] Found User: ${user.email}`);

    // 2. Update Product
    const updatedProduct = await Product.findOneAndUpdate(
      {
        tenantId: user.email,
        sku: { $regex: new RegExp(`^${sku}$`, 'i') }
      },
      {
        $set: {
          quantity: Number(quantity),
          sellingPrice: Number(sellingPrice),
          source: 'MASTER',
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updatedProduct) {
      console.log(`⚠️ [EXTERNAL API] Product ${sku} NOT FOUND for owner ${user.email}`);
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    console.log(`✅ [EXTERNAL API] SUCCESS! Updated ${updatedProduct.name} to ${updatedProduct.quantity}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [EXTERNAL API] CRITICAL ERROR:', errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}