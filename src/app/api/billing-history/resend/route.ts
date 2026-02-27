import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Sales from "@/models/Sales";
import Customer from "@/models/Customer";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// This file handles POST requests to: /api/billing-history/resend
export async function POST(req: Request) {
  console.log("Resend API: Hit");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { billId, newPhone } = await req.json();

    await dbConnect();

    // 1. Find the existing record
    const existingSale = await Sales.findOne({ _id: billId, tenantId: session.user.email });

    if (!existingSale) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // 2. UPDATE Existing Record
    existingSale.customerPhone = newPhone;
    existingSale.isEdited = true;
    existingSale.editCount = (existingSale.editCount || 0) + 1;
    existingSale.updatedAt = new Date();

    // Check if publicToken needs regeneration or keep existing? 
    // Usually keep existing if link shouldn't break, but if number changes link might be sent to new person.
    // For now, we keep the record same.

    await existingSale.save();

    console.log("Resend: Updated existing bill:", existingSale.billId);

    const updatedSale = existingSale; // Use the updated instance

    // 1.5 Sync with CRM (Customer Database)
    // Check if a customer with this new phone exists
    const existingCustomer = await Customer.findOne({ tenantId: session.user.email, phoneNumber: newPhone });

    if (!existingCustomer && updatedSale.customerName) {
      // Create new customer if not exists and we have a name
      await Customer.create({
        tenantId: session.user.email,
        name: updatedSale.customerName,
        phoneNumber: newPhone,
        email: "" // Optional
      });
      console.log("CRM: Created new customer for updated phone:", newPhone);
    } else if (existingCustomer) {
      console.log("CRM: Customer already exists for phone:", newPhone);
      // Optional: Update name if provided? For now, we leave existing customer as is.
    }


    // 2. Prepare WhatsApp logic
    let cleanPhone = newPhone.replace(/\D/g, '');

    // Safety check for India (10 digits)
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('91')) {
      cleanPhone = '91' + cleanPhone;
    }

    // Fix: Handle items safely - Replaced 'any' with specific type
    const itemsList = updatedSale.items
      ? updatedSale.items.map((i: { name: string; quantity: number }) => `${i.name} (x${i.quantity})`).join(', ')
      : 'Items';

    // Truncate itemsList if too long (WhatsApp limits apply)
    const displayItems = itemsList.length > 500 ? itemsList.substring(0, 497) + "..." : itemsList;

    let templateName = 'payment_receipt_cashh';
    if (updatedSale.paymentMethod === 'qr-code' || updatedSale.paymentMethod === 'upi') {
      templateName = 'payment_receipt_upii';
    } else if (updatedSale.paymentMethod === 'card') {
      templateName = 'payment_receipt_card';
    }

    const discount = updatedSale.discount || 0;
    const subtotal = updatedSale.amount + discount;

    const whatsappPayload = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: String(updatedSale.billId || updatedSale._id) },
            { type: "text", text: updatedSale.merchantName || "Merchant" },
            { type: "text", text: `₹${subtotal.toFixed(2)}` },
            { type: "text", text: displayItems },
            { type: "text", text: discount > 0 ? `₹${discount.toFixed(2)}` : "₹0.00" }
          ]
        }]
      }
    };

    // 3. Send WhatsApp
    const wsResponse = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_BUSINESS_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(whatsappPayload),
      }
    );

    if (!wsResponse.ok) {
      const errData = await wsResponse.json();
      console.error("WhatsApp API Error:", errData);
      return NextResponse.json({ success: false, message: "WhatsApp API Failed" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Resent successfully!" });

  } catch (error) {
    console.error("Resend API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
