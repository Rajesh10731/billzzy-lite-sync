import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import WhatsappSetting from '@/models/WhatsappSetting';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

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

  try {
    await dbConnect();

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
