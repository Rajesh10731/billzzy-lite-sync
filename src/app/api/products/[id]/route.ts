// FILE: src/app/api/products/[id]/route.ts

import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Notification from "@/models/Notification";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { sendPushNotification } from "@/lib/send-push";
import { getRandomMessage } from "@/lib/notifications/messages";

// 1. Configure Cloudinaryall 
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Helper function to extract the Public ID from a Cloudinary URL.
 * Example URL: https://res.cloudinary.com/.../upload/v1234/billzzy-inventory/image.webp
 * Public ID: billzzy-inventory/image
 */
const getPublicIdFromUrl = (url: string) => {
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;

    let publicIdPart = parts[1];

    // Remove version prefix (e.g., "v1726567/") if present
    if (publicIdPart.startsWith('v')) {
      const versionEnd = publicIdPart.indexOf('/');
      if (versionEnd !== -1) {
        publicIdPart = publicIdPart.substring(versionEnd + 1);
      }
    }

    // Remove file extension (e.g., ".webp", ".jpg")
    const extensionIndex = publicIdPart.lastIndexOf('.');
    if (extensionIndex !== -1) {
      publicIdPart = publicIdPart.substring(0, extensionIndex);
    }

    return publicIdPart;
  } catch (error) {
    console.error("Error parsing Cloudinary URL:", error);
    return null;
  }
};

/**
 * Defines the shape of the context object for this route.
 * In Next.js 15+, `params` is a Promise that resolves to the route parameters.
 */
interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Handles PUT requests to update a product by its ID.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    await dbConnect();
    const body = await request.json();
    console.log("Updating Product:", id, JSON.stringify(body, null, 2));

    const query = { _id: id };

    let updateOperation;

    if (
      "quantityToDecrement" in body &&
      typeof body.quantityToDecrement === "number"
    ) {
      updateOperation = [
        {
          $set: {
            quantity: {
              $max: [0, { $subtract: ["$quantity", body.quantityToDecrement] }],
            },
          },
        },
      ];
    } else {
      updateOperation = { $set: body };
    }

    const updatedProduct = (await Product.findOneAndUpdate(query, updateOperation, {
      new: true,
      runValidators: true,
    }).lean()) as {
      _id: string;
      tenantId: string;
      name: string;
      quantity: number;
      lowStockThreshold?: number;
    } | null;

    if (!updatedProduct) {
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 }
      );
    }

    // Trigger Automated "Alive" Notification for Low Stock
    try {
      const threshold = updatedProduct.lowStockThreshold ?? 5;
      if (updatedProduct.quantity <= threshold) {
        const tenantId = updatedProduct.tenantId; // Use tenantId from product
        const message = getRandomMessage('STOCK_ALERTS', {
          name: updatedProduct.name,
          quantity: updatedProduct.quantity
        });
        const title = "Inventory Alert! ⚠️";
        const url = '/inventory';

        // 1. Save to Notification History
        await Notification.create({
          userId: tenantId,
          title,
          message,
          url,
          isRead: false
        });

        // 2. Send Live Push Alert
        await sendPushNotification(tenantId, title, message, url);
        console.log(`✅ Low Stock notification triggered for ${tenantId} (Product: ${updatedProduct.name})`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to trigger low stock notification:", pushErr);
    }

    return NextResponse.json(updatedProduct);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to update product:", error);
    return NextResponse.json(
      { message: "Failed to update product", error: message },
      { status: 500 }
    );
  }
}

/**
 * Handles DELETE requests to remove a product by its ID.
 * Also deletes the associated image from Cloudinary.
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    await dbConnect();

    // 1. Find the product first to get the image URL
    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 }
      );
    }

    // 2. If product has an image hosted on Cloudinary, delete it
    if (product.image && product.image.includes("cloudinary.com")) {
      const publicId = getPublicIdFromUrl(product.image);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Cloudinary image deleted: ${publicId}`);
        } catch (cloudError) {
          console.error("Failed to delete image from Cloudinary:", cloudError);
          // We continue execution even if image delete fails
        }
      }
    }

    // 3. Delete the product from the database
    const result = await Product.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 }
      );
    }

    // Return success message (200 OK with JSON is often easier to debug than 204 No Content)
    return NextResponse.json({ message: "Product and image deleted successfully" }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to delete product:", error);
    return NextResponse.json(
      { message: "Failed to delete product", error: message },
      { status: 500 }
    );
  }
}