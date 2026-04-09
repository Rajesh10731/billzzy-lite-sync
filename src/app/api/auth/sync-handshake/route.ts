import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth"; // Adjust import based on your next-auth setup
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    
    // 1. Get the current logged-in user in Billzzy-Lite
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const liteTenantId = session.user.id; // Or however you store tenantId in the session

    // 2. Verify the token sent from Billzzy Master
    interface SyncJwtPayload {
      orgId: string;
    }
    const decoded = jwt.verify(token, process.env.SYNC_SECRET!) as SyncJwtPayload;
    
    // 3. Tell Billzzy Master to save the link!
    const response = await fetch(`${process.env.NEXT_PUBLIC_BILLZZY_MASTER_URL}/api/integrations/billzzy-lite/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId: decoded.orgId,
        tenantId: liteTenantId,
        secret: process.env.SYNC_SECRET
      })
    });

    if (!response.ok) {
      throw new Error('Master rejected the link');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Handshake error:', errorMessage);
    return NextResponse.json({ error: 'Handshake failed' }, { status: 500 });
  }
}