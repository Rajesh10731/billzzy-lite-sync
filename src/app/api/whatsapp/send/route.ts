// // src/app/api/whatsapp/send/route.ts

// import { NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/lib/auth';
// import { sendWhatsAppMessage } from '@/lib/whatsapp';

// export async function POST(request: Request) {
//   try {
//     const session = await getServerSession(authOptions) as { user?: { email?: string | null } } | null;

//     if (!session || !session.user) {
//       return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
//     }

//     const messageData = await request.json();

//     // Validate required fields
//     if (!messageData.to) {
//       return NextResponse.json({
//         success: false,
//         message: 'Recipient phone number is required.'
//       }, { status: 400 });
//     }

//     if (!messageData.template?.name) {
//       return NextResponse.json({
//         success: false,
//         message: 'Template name is required.'
//       }, { status: 400 });
//     }

//     // Format phone number: just keep digits. 
//     // The frontend now provides the full number including dial code.
//     const to = messageData.to.replace(/\D/g, '');

//     // Construct the payload according to WhatsApp Business API format
//     const payload = {
//       messaging_product: "whatsapp",
//       recipient_type: "individual",
//       to: to,
//       type: "template",
//       template: messageData.template
//     };

//     console.log(`User ${session.user.email} is sending a WhatsApp message to ${to}`);

//     const result = await sendWhatsAppMessage(session.user.email as string, payload);

//     return NextResponse.json({
//       success: true,
//       message: 'Message sent successfully',
//       data: result,
//     });

//   } catch (error) {
//     console.error('Error in WhatsApp send route:', {
//       error: error instanceof Error ? error.message : 'Unknown error',
//     });

//     return NextResponse.json({
//       success: false,
//       message: error instanceof Error ? error.message : 'Internal server error',
//     }, { status: 500 });
//   }
// }


import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getWhatsAppConfig } from '@/lib/whatsapp-config';

export async function POST(request: Request) {
  try {
    // 1. Get the session (now includes plan and features)
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const messageData = await request.json();

    // 2. Validate required fields
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

    // 3. Resolve which WhatsApp Credentials to use (Dynamic Switch)
    const config = await getWhatsAppConfig(session);

    // 4. Format phone number
    const to = messageData.to.replace(/\D/g, '');

    // 5. Construct the payload
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "template",
      template: messageData.template
    };

    console.log(`[WhatsApp] User: ${session.user.email} | Mode: ${config.type} | Target: ${to}`);

    // 6. Execute the send via Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to send WhatsApp message');
    }

    return NextResponse.json({
      success: true,
      message: `Message sent successfully via ${config.type} account`,
      sentVia: config.type,
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