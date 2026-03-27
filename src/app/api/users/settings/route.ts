import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
    const session = await getServerSession(authOptions) as { user?: { email?: string | null } } | null;

    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();

        const user = await User.findOne({ email: (session.user as { email: string }).email })
            .select('name email phoneNumber address shopName shopAddress merchantUpiId defaultCountryCode plan features');

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        console.log("GET /api/users/settings - Found User:", JSON.stringify(user, null, 2));

        return NextResponse.json(user);
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions) as { user?: { email?: string | null } } | null;

    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();

        const body = await request.json();
        console.log("PUT /api/users/settings - Body:", JSON.stringify(body, null, 2));

        // Whitelist allowed fields to update
        const { 
            name, phoneNumber, address, shopName, shopAddress, merchantUpiId, defaultCountryCode
        } = body;

        // Update the user
        const updatedUser = await User.findOneAndUpdate(
            { email: (session.user as { email: string }).email },
            {
                name,
                phoneNumber,
                address,
                shopName,
                shopAddress,
                merchantUpiId,
                defaultCountryCode
            },
            { new: true }
        ).select('name email phoneNumber address shopName shopAddress merchantUpiId defaultCountryCode');

        console.log("PUT /api/users/settings - Updated User:", JSON.stringify(updatedUser, null, 2));

        if (!updatedUser) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
