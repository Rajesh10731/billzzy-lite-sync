import mongoose, { Schema, models, Document } from "mongoose";

export interface IService extends Document {
  tenantId: string;
  name: string;
  price: number;
  duration?: string; // e.g., "30 mins", "1 hour"
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>({
  tenantId: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, "Service name is required"],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    default: 0,
  },
  duration: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  collection: 'services'
});

// Index for faster lookups by tenant
ServiceSchema.index({ tenantId: 1, name: 1 });

const Service = models.Service || mongoose.model<IService>("Service", ServiceSchema);

export default Service;
