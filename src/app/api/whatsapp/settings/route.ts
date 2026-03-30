import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import WhatsappSetting from '@/models/WhatsappSetting';
import User from '@/models/User';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // --- NEW: RE-VALIDATE PLAN FROM DATABASE (Enforce Downgrades) ---
  await dbConnect();
  const dbUser = await User.findOne({ email: (session.user as { email: string }).email }).select('plan features');
  
  if (!dbUser) {
    return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  }

  const features = dbUser.features;
  const plan = dbUser.plan;

  // Feature Gating: Check if User has 'customWhatsapp' enabled
  if (!features?.customWhatsapp && plan !== 'PRO') {
      return NextResponse.json({ message: 'Custom WhatsApp Integration is locked for your plan.' }, { status: 403 });
  }

  try {
    // dbConnect() already called above
    const settings = await WhatsappSetting.findOne({ shopId: (session.user as { email: string }).email });

    if (!settings) {
      return NextResponse.json({ message: 'No settings found' }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // --- NEW: RE-VALIDATE PLAN FROM DATABASE (Enforce Downgrades) ---
  await dbConnect();
  const dbUser = await User.findOne({ email: (session.user as { email: string }).email }).select('plan features');
  
  if (!dbUser) {
    return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  }

  const features = dbUser.features;
  const plan = dbUser.plan;

  // Feature Gating: Check if User has 'customWhatsapp' enabled
  if (!features?.customWhatsapp && plan !== 'PRO') {
      return NextResponse.json({ message: 'Custom WhatsApp Integration is locked for your plan.' }, { status: 403 });
  }

  try {
    // dbConnect() already called above
    const body = await request.json();
    const { 
      whatsappBusinessNumber, gowhatsApiToken, phoneNumberId, whatsappBusinessAccountId,
      templateNameCash, templateNameUPI, templateNameCard
    } = body;

    const updatedSettings = await WhatsappSetting.findOneAndUpdate(
      { shopId: (session.user as { email: string }).email },
      {
        whatsappBusinessNumber,
        gowhatsApiToken,
        phoneNumberId,
        whatsappBusinessAccountId,
        templateNameCash,
        templateNameUPI,
        templateNameCard
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: 'Settings saved', data: updatedSettings });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
