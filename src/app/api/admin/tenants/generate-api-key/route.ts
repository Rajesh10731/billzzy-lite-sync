// src/app/api/admin/tenants/generate-api-key/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Tenant from '@/models/Tenant';
import User from '@/models/User';
import { generateAPIKey, hashKey, generateMerchantId } from '@/lib/api-keys';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions) as { user?: { email?: string | null; role?: string } } | null;
        if (!session?.user?.email) {
            // Allow master admin bypass if environmental variables match (optional, but sticking to DB check is safer)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Verify Admin Role - CHECK BOTH SESSION AND DB FOR SAFETY
        const adminUser = await User.findOne({ email: session.user.email });
        if (adminUser?.role !== 'admin' && session.user.role !== 'admin') {
            // Double check your role definition in User model
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
        }

        const { userId } = await request.json(); // Expecting userId from the frontend row
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Find the target merchant user
        const merchantUser = await User.findById(userId);
        if (!merchantUser) {
            return NextResponse.json({ error: 'Merchant user not found' }, { status: 404 });
        }

        // Determine the identifier (subdomain/tenantId)
        // In OnboardedClients, we are iterating over Users who are Tenants.
        // Their `subdomain` field or `email` is the link to the Tenant model.
        const identifier = merchantUser.subdomain || merchantUser.tenantId || merchantUser.email;

        if (!identifier) {
            return NextResponse.json({ error: 'User has no valid subdomain/identifier' }, { status: 400 });
        }

        // Find the Tenant
        let tenant = await Tenant.findOne({
            $or: [
                { subdomain: identifier },
                { ownerEmail: merchantUser.email }
            ]
        });

        // If no tenant found, create one (auto-heal)
        if (!tenant) {
            console.warn(`Tenant not found for identifier: ${identifier}. Creating default.`);
            tenant = await Tenant.create({
                name: merchantUser.name || 'New Merchant',
                subdomain: identifier,
                ownerEmail: merchantUser.email,
                merchantId: generateMerchantId()
            });
        }

        // Link User to Tenant if not already linked
        if (!merchantUser.tenantId || merchantUser.tenantId.toString() !== tenant._id.toString()) {
            merchantUser.tenantId = tenant._id;
            await merchantUser.save();
        }

        if (!tenant.ownerEmail) {
            tenant.ownerEmail = merchantUser.email;
            await tenant.save();
        }

        // Return existing key if present
        if (tenant.displayApiKey) {
            const mId = tenant.merchantId || tenant.subdomain;
            return NextResponse.json({
                merchantId: mId,
                apiKey: tenant.displayApiKey,
                billzzyHook: `${mId}:${tenant.displayApiKey}`,
                message: 'Existing API Key retrieved'
            });
        }

        // Generate NEW key
        const rawKey = generateAPIKey();
        const hashedKey = hashKey(rawKey);

        tenant.apiKeyHash = hashedKey;
        tenant.displayApiKey = rawKey;
        if (!tenant.merchantId) {
            tenant.merchantId = generateMerchantId();
        }
        await tenant.save();

        const mId = tenant.merchantId;
        return NextResponse.json({
            merchantId: mId,
            apiKey: rawKey,
            billzzyHook: `${mId}:${rawKey}`,
            message: 'New API Key generated'
        });

    } catch (error) {
        console.error("Admin Generate Key Error:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}
