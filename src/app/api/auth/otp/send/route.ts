
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { defaultWhatsappConfig as whatsappConfig, whatsappTemplates } from "@/lib/whatsapp-config";

// Helper to generate 6 digit OTP
const generateOTP = () => {
    return crypto.randomInt(100000, 1000000).toString();
};

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions) as { user?: { email?: string | null } } | null;

        if (!session?.user?.email) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized"
            }, { status: 401 });
        }

        const { phoneNumber } = await request.json();
        if (!phoneNumber) {
            return NextResponse.json({ success: false, message: "Phone number is required." }, { status: 400 });
        }

        // WhatsApp Cloud API expects: country code + number, NO '+' 
        const formattedPhone = phoneNumber.replaceAll(/\D/g, '');

        if (formattedPhone.length < 7) { // Basic sanity check for international numbers
            return NextResponse.json({ success: false, message: "Please enter a valid phone number." }, { status: 400 });
        }

        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await dbConnect();

        // Save OTP to user
        await User.findOneAndUpdate(
            { email: session.user.email },
            {
                verificationOtp: otp,
                verificationOtpExpires: otpExpires
            }
        );

        // Send WhatsApp Message
        // Using the same structure as your existing /api/whatsapp/send/route.ts
        // but calling the External API directly here for better control/separation

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "template",
            template: {
                name: whatsappTemplates.otp_verification.name,
                language: whatsappTemplates.otp_verification.language,
                components: [
                    {
                        type: "body",
                        parameters: [
                            {
                                type: "text",
                                text: otp
                            }
                        ]
                    },
                    {
                        type: "button",
                        sub_type: "url",
                        index: 0,
                        parameters: [
                            {
                                type: "text",
                                text: otp
                            }
                        ]
                    }
                ]
            }
        };

        const response = await fetch(
            `https://graph.facebook.com/v21.0/${whatsappConfig.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${whatsappConfig.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('WhatsApp API error:', data);
            return NextResponse.json({
                success: false,
                message: 'Failed to send WhatsApp message. Please check the template configuration.',
                error: data.error
            }, { status: response.status });
        }

        return NextResponse.json({
            success: true,
            message: "OTP sent successfully"
        });

    } catch (error) {
        console.error("Error sending OTP:", error);
        return NextResponse.json({
            success: false,
            message: "Internal server error"
        }, { status: 500 });
    }
}
