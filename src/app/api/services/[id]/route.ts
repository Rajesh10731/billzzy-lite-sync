import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from '@/lib/mongodb';
import Service from '@/models/Service';
import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.email;

  if (!tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await dbConnect();
    const body = await request.json();

    const updatedService = await Service.findOneAndUpdate(
      { _id: id, tenantId: tenantId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return NextResponse.json({ message: 'Service not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(updatedService);
  } catch (error) {
    console.error("Failed to update service:", error);
    return NextResponse.json({ message: 'Failed to update service' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.email;

  if (!tenantId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await dbConnect();

    const result = await Service.deleteOne({ _id: id, tenantId: tenantId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Service not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error("Failed to delete service:", error);
    return NextResponse.json({ message: 'Failed to delete service' }, { status: 500 });
  }
}
