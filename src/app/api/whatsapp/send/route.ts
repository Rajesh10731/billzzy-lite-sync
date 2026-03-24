// src/app/api/whatsapp/send/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as { user?: { email?: string | null } } | null;

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const messageData = await request.json();

    // Validate required fields
    if (!messageData.to) {
      return NextResponse.json({
        success: false,
        message: 'Recipient phone number is required.'
      }, { status: 400 });
    }

    if (!messageData.template?.name) {
      return NextResponse.json({
        success: false,
        message: 'Template name is required.'
      }, { status: 400 });
    }

    // Format phone number: just keep digits. 
    // The frontend now provides the full number including dial code.
    const to = messageData.to.replace(/\D/g, '');

    // Construct the payload according to WhatsApp Business API format
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "template",
      template: messageData.template
    };

    console.log(`User ${session.user.email} is sending a WhatsApp message to ${to}`);

    const result = await sendWhatsAppMessage(session.user.email as string, payload);

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: result,
    });

  } catch (error) {
    console.error('Error in WhatsApp send route:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
