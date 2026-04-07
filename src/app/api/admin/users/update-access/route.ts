import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    // 1. Check if the requester is an ADMIN
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, plan, features, selectedModule } = await req.json();

    await dbConnect();

    // 2. Update the user record
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          plan: plan, // 'FREE' or 'PRO'
          features: features, // e.g., { productAI: true, serviceAI: true, customWhatsapp: true }
          selectedModule: selectedModule // 'INVENTORY' or 'SERVICE'
        } 
      },
      { new: true }
    );

    return NextResponse.json({ message: "Access updated", user: updatedUser });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}