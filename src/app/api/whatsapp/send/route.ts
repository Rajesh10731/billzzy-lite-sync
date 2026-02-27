// src/app/api/whatsapp/send/route.ts

import { NextResponse } from 'next/server';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_BUSINESS_API_TOKEN;
const BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

export async function POST(request: Request) {
  try {
    // Validate all required environment variables
    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN || !BUSINESS_ACCOUNT_ID) {
      console.error('Missing WhatsApp credentials:', {
        hasPhoneId: !!PHONE_NUMBER_ID,
        hasToken: !!ACCESS_TOKEN,
        hasBusinessAccountId: !!BUSINESS_ACCOUNT_ID
      });
      return NextResponse.json({
        success: false,
        message: 'WhatsApp API credentials not configured.'
      }, { status: 500 });
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

    // Ensure it doesn't have a leading '+' or '00' (already handled by \D/g but for clarity)
    // WhatsApp Cloud API expects the number starting with the country code, no '+'.

    // Construct the payload according to WhatsApp Business API format
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "template",
      template: messageData.template
    };

    console.log('Sending WhatsApp message:', {
      to: to,
      template: messageData.template.name,
      phoneNumberId: PHONE_NUMBER_ID,
      businessAccountId: BUSINESS_ACCOUNT_ID
    });

    // Make API request using the phone number ID
    const response = await fetch(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API error:', {
        status: response.status,
        message: data.error?.message,
        code: data.error?.code,
        businessAccountId: BUSINESS_ACCOUNT_ID
      });

      return NextResponse.json({
        success: false,
        message: data.error?.message || 'Failed to send message',
        error: data.error,
        businessAccountId: BUSINESS_ACCOUNT_ID
      }, { status: response.status });
    }

    console.log('WhatsApp message sent successfully:', {
      messageId: data.messages?.[0]?.id,
      businessAccountId: BUSINESS_ACCOUNT_ID
    });

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: data,
      businessAccountId: BUSINESS_ACCOUNT_ID
    });

  } catch (error) {
    console.error('Error in WhatsApp send route:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      businessAccountId: BUSINESS_ACCOUNT_ID
    });

    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      businessAccountId: BUSINESS_ACCOUNT_ID
    }, { status: 500 });
  }
}