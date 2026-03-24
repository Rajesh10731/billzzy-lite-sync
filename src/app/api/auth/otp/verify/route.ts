
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions) as { user?: { email?: string | null } } | null;

        if (!session?.user?.email) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized"
            }, { status: 401 });
        }

        const { otp, phoneNumber } = await request.json();

        if (!otp || !phoneNumber) {
            return NextResponse.json({
                success: false,
                message: "OTP and Phone Number are required."
            }, { status: 400 });
        }

        await dbConnect();

        // Find user with matching email and select hidden OTP fields
        const user = await User.findOne({ email: session.user.email })
            .select('+verificationOtp +verificationOtpExpires');

        if (!user) {
            return NextResponse.json({
                success: false,
                message: "User not found."
            }, { status: 404 });
        }

        if (!user.verificationOtp || !user.verificationOtpExpires) {
            return NextResponse.json({
                success: false,
                message: "No OTP request found."
            }, { status: 400 });
        }

        // Check if OTP matches
        if (user.verificationOtp !== otp) {
            return NextResponse.json({
                success: false,
                message: "Invalid OTP."
            }, { status: 400 });
        }

        // Check expiry
        if (new Date() > user.verificationOtpExpires) {
            return NextResponse.json({
                success: false,
                message: "OTP has expired."
            }, { status: 400 });
        }

        // OTP Valid: Update Phone Number and Clear OTP
        user.phoneNumber = phoneNumber;
        user.verificationOtp = undefined;
        user.verificationOtpExpires = undefined;
        await user.save();

        return NextResponse.json({
            success: true,
            message: "Phone number verified successfully."
        });

    } catch (error) {
        console.error("Error verifying OTP:", error);
        return NextResponse.json({
            success: false,
            message: "Internal server error"
        }, { status: 500 });
    }
}
