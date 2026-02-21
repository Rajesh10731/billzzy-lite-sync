import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Fetch last 50 notifications, latest first
        const notifications = await Notification.find({ userId: session.user.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        return NextResponse.json(notifications);
    } catch (error) {
        console.error('❌ Notification Fetch Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

// Optional: POST to mark as read
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { notificationId } = await req.json();
        await dbConnect();

        if (notificationId === 'all') {
            await Notification.updateMany({ userId: session.user.id }, { isRead: true });
        } else {
            await Notification.updateOne({ _id: notificationId, userId: session.user.id }, { isRead: true });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
