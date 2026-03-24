
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Tenant from '@/models/Tenant';
import User from '@/models/User';
import { generateAPIKey, hashKey } from '@/lib/api-keys';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as { user?: { email?: string | null; name?: string | null } } | null;
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    const identifier = user?.tenantId || user?.subdomain || session.user.email;

    const tenant = await Tenant.findOne({ subdomain: identifier });

    return NextResponse.json({
      exists: !!tenant?.apiKeyHash,
      merchantId: tenant?.subdomain || identifier,
    });
  } catch {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}


export async function POST() {
  try {
    const session = await getServerSession(authOptions) as { user?: { email?: string | null; name?: string | null } } | null;
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    const identifier = user?.tenantId || user?.subdomain || session.user.email;

    const existingTenant = await Tenant.findOne({ subdomain: identifier });
    if (existingTenant?.apiKeyHash) {
      // If a key exists, return it (since we are storing displayApiKey now) or indicate it exists
      // The prompt says "permanent", so maybe valid to just return existing if we have it? 
      // User requirements say "permanent unique ID ... like WhatsApp... fetch data ... without login".
      // If they already have one, we can return the display one if available, or error.
      // Existing code returned error. I will return the existing credentials if available for convenience, or error if strictly one-time generation.
      // Let's stick to the existing logic but ensure we return the display key if it exists, otherwise error.
      if (existingTenant.displayApiKey) {
        return NextResponse.json({
          merchantId: existingTenant.subdomain || identifier,
          apiKey: existingTenant.displayApiKey,
          message: "API Key already exists."
        });
      }
      return NextResponse.json({ error: 'API Key already exists' }, { status: 403 });
    }

    const rawKey = generateAPIKey();
    const hashedKey = hashKey(rawKey);

    const updatedTenant = await Tenant.findOneAndUpdate(
      { subdomain: identifier },
      {
        apiKeyHash: hashedKey,
        displayApiKey: rawKey, // SAVE RAW KEY FOR DISPLAY
        name: session.user.name || identifier
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      merchantId: updatedTenant.subdomain,
      apiKey: rawKey,
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
