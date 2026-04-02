import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { sendPushNotification } from "@/lib/send-push";
import { getRandomMessage } from "@/lib/notifications/messages";

/**
 * API to handle "Smart Engagement" notifications.
 * Triggered when a user opens the dashboard.
 * Sends a random greeting/tip if one hasn't been sent today.
 */
export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        await dbConnect();

        // 1. Check if a greeting was already sent TODAY
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const existingNotification = await Notification.findOne({
            userId,
            title: { $in: ["Good Morning! ☀️", "Daily Tip! 💡"] },
            createdAt: { $gte: startOfToday }
        });

        if (existingNotification) {
            return NextResponse.json({ message: "Already engaged today" });
        }

        // 2. Decide: Greeting or Tip? (50/50 chance)
        const isTip = crypto.randomInt(0, 2) === 0;
        const category = isTip ? 'TIPS' : 'MORNING_GREETINGS';
        const title = isTip ? "Daily Tip! 💡" : "Good Morning! ☀️";

        const message = getRandomMessage(category);

        // 3. Save to History
        await Notification.create({
            userId,
            title,
            message,
            url: isTip ? '/inventory' : '/dashboard',
            isRead: false
        });

        // 4. Send Push
        await sendPushNotification(userId, title, message, isTip ? '/inventory' : '/dashboard');

        return NextResponse.json({ message: "Engagement triggered", type: category });

    } catch (error) {
        console.error("Engagement API Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
