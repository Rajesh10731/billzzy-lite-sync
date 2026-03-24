import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import User from '@/models/User';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getServerSession(authOptions) as { user?: { role?: string } } | null;
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Get all subscriptions
        const subscriptions = await PushSubscription.find({}).lean();

        // Extract unique user IDs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userIds = subscriptions.map((sub: any) => sub.userId);

        // Fetch user details for those who have subscriptions
        const users = await User.find({ _id: { $in: userIds } })
            .select('name email role shopName phoneNumber')
            .lean();

        // Combine data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = users.map((user: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sub = subscriptions.find((s: any) => s.userId === user._id.toString());
            return {
                id: user._id.toString(),
                name: user.name || 'N/A',
                email: user.email || 'N/A',
                role: user.role || 'user',
                shopName: user.shopName || 'N/A',
                phoneNumber: user.phoneNumber || 'N/A',
                subscriptionDate: sub?.createdAt || null,
            };
        });

        return NextResponse.json({ success: true, users: result });
    } catch (error) {
        console.error('Fetch subscribed users error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
