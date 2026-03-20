// // src/app/api/user/target/route.ts
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User"; // We use the User model to store the target
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// 1. GET: Fetch the current target
export async function GET() {
  try {
    const session = await getServerSession(authOptions) as { user?: { email?: string | null } } | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Find user by email to get their saved target
    const user = await User.findOne({ email: session.user.email });

    // Return saved target or default to 0
    return NextResponse.json({ target: user?.salesTarget || 0 });

  } catch (error) {
    console.error("Error fetching target:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// 2. POST: Update the target (This fixes the 405 Error)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as { user?: { email?: string | null } } | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { target } = await req.json();

    if (typeof target !== 'number') {
        return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    await connectToDatabase();

    // Update the user's target in the database
    // "upsert: true" ensures it works even if the field didn't exist before
    await User.findOneAndUpdate(
      { email: session.user.email },
      { salesTarget: target },
      { upsert: true, new: true } 
    );

    return NextResponse.json({ success: true, target });

  } catch (error) {
    console.error("Error updating target:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
