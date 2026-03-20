// src/app/api/merchant/details/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    // Get the user's session
    const session = await getServerSession(authOptions) as { user?: { email?: string | null; name?: string | null } } | null;
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Return merchant details
    // In production, you'd fetch this from a database
    const merchantDetails = {
      name: session.user.name || 'Billzzy Merchant',
      email: session.user.email,
      upiId: 'varunprasanna2020-1@oksbi', // From your existing code
      phoneNumber: '9597586785', // From your existing code
    };
    
    return NextResponse.json(merchantDetails);
  } catch (error) {
    console.error('Error fetching merchant details:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
