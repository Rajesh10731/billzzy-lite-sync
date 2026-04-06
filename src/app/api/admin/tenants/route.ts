// src/app/api/admin/tenants/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import Sale from '@/models/Sales';
import Product from '@/models/Product';
import Purchase from '@/models/purchase';
import Tenant from '@/models/Tenant';
import Customer from '@/models/Customer';
import Service from '@/models/Service';
import WhatsappSetting from '@/models/WhatsappSetting';
import Notification from '@/models/Notification';
import PushSubscription from '@/models/PushSubscription';

// export async function GET(request: Request) {
//   const session = await getServerSession(authOptions);

//   if (!session || (session.user as { role: string }).role !== 'admin') {
//     return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
//   }

//   try {
//     await dbConnect();

//     // Get query parameters for date filtering
//     const { searchParams } = new URL(request.url);
//     const startDate = searchParams.get('startDate');
//     const endDate = searchParams.get('endDate');

//     // Find all users where the role is NOT 'admin'
//     const users = await User.find({ role: { $ne: 'admin' } }).select('name email createdAt phoneNumber onboarded pin');

//     // Get bill count for each user with optional date filtering
//     const usersWithBillCount = await Promise.all(users.map(async (user: IUser) => {
//       // Build the query for sales - use regex for case-insensitive matching
//       const saleQuery: { tenantId: { $regex: RegExp }; createdAt?: { $gte?: Date; $lte?: Date } } = {
//         tenantId: { $regex: new RegExp(`^${user.email}$`, 'i') }
//       };

//       // Add date filters if provided
//       if (startDate || endDate) {
//         saleQuery.createdAt = {};
//         if (startDate) {
//           saleQuery.createdAt.$gte = new Date(startDate);
//         }
//         if (endDate) {
//           saleQuery.createdAt.$lte = new Date(endDate);
//         }
//       }

//       const result = await Sale.aggregate([
//         { $match: saleQuery },
//         {
//           $group: {
//             _id: null,
//             total: { $sum: { $add: [1, { $ifNull: ["$editCount", 0] }] } }
//           }
//         }
//       ]);
//       const billCount = result.length > 0 ? result[0].total : 0;
//       return {
//         ...user.toObject(),
//         billCount
//       };
//     }));

//     return NextResponse.json(usersWithBillCount);

//   } catch (error) {
//     console.error('API Error:', error);
//     return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
//   }
// }


export async function GET(request: Request) {
  const session = await getServerSession(authOptions) as { user?: { role?: string } } | null;
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const users = await User.find({ role: { $ne: 'admin' } }).select('name email createdAt phoneNumber onboarded pin plan features');
    const tenants = await Tenant.find({}); // Fetch keys

    const usersWithBillCount = await Promise.all(users.map(async (user: IUser) => {
      // Find the API Key for this user
      const tenantRecord = tenants.find(t => t.subdomain.toLowerCase() === user.email.toLowerCase());

      const saleQuery: { tenantId: { $regex: RegExp }; createdAt?: { $gte?: Date; $lte?: Date } } = { tenantId: { $regex: new RegExp(`^${user.email}$`, 'i') } };
      if (startDate || endDate) {
        saleQuery.createdAt = {};
        if (startDate) saleQuery.createdAt.$gte = new Date(startDate);
        if (endDate) saleQuery.createdAt.$lte = new Date(endDate);
      }

      const result = await Sale.aggregate([
        { $match: saleQuery },
        { $group: { _id: null, total: { $sum: { $add: [1, { $ifNull: ["$editCount", 0] }] } } } }
      ]);
      const billCount = result.length > 0 ? result[0].total : 0;

      return {
        ...user.toObject(),
        billCount,
        // Added these two fields for the dashboard
        merchantId: tenantRecord?.subdomain || user.email,
        apiKey: tenantRecord?.displayApiKey || null,
        billzzyHook: tenantRecord?.displayApiKey ? `${tenantRecord.subdomain || user.email}:${tenantRecord.displayApiKey}` : null
      };
    }));

    return NextResponse.json(usersWithBillCount);
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions) as { user?: { role?: string } } | null;

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    const { userId, onboarded, pin, phoneNumber } = await request.json();

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const updateData: { onboarded?: boolean; pin?: string; phoneNumber?: string } = {};
    if (typeof onboarded === 'boolean') updateData.onboarded = onboarded;
    if (pin !== undefined) updateData.pin = pin;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions) as { user?: { role?: string } } | null;

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    // Find the user and check if it's a tenant
    const user = await User.findOne({ _id: userId, role: { $ne: 'admin' } });

    if (!user) {
      return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
    }

    // Delete all data associated with this tenant
    // 1. Delete the tenant user
    await User.deleteOne({ _id: userId });

    // 2. Delete all sales records associated with this tenant
    await Sale.deleteMany({ tenantId: user.email });

    // 3. Delete all products associated with this tenant
    await Product.deleteMany({ tenantId: user.email });

    // 4. Delete all purchases associated with this tenant
    await Purchase.deleteMany({ tenantId: user.email });

    // 5. Delete all customers associated with this tenant
    await Customer.deleteMany({ tenantId: user.email });

    // 6. Delete all services associated with this tenant
    await Service.deleteMany({ tenantId: user.email });

    // 7. Delete the tenant record itself
    await Tenant.deleteOne({ ownerEmail: user.email });

    // 8. Delete WhatsApp settings
    await WhatsappSetting.deleteOne({ shopId: user.email });

    // 9. Delete notifications for this user
    await Notification.deleteMany({ userId: user._id });

    // 10. Delete push subscriptions
    await PushSubscription.deleteMany({ userId: user._id });

    // Note: If there are any other collections that store tenant-specific data,
    // they should also be deleted here to ensure complete data removal

    return NextResponse.json({
      message: 'Tenant and all associated data deleted successfully. User can now start fresh.'
    });
  } catch (error) {
    console.error('Delete Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
