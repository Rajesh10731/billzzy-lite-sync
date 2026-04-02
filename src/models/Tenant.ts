import mongoose, { Schema, Document } from 'mongoose';
import { generateMerchantId } from '@/lib/api-keys';

export interface ITenant extends Document {
  name: string;
  subdomain: string; // Used as the Merchant ID
  merchantId: string; // Permanent unique ID (e.g. BZ_12345)
  apiKeyHash: string;
  displayApiKey?: string; // Storing raw key for display (as requested)
  ownerEmail: string; // The email of the merchant user (used as FK for products/sales)
}

const TenantSchema: Schema = new Schema({
  name: { type: String, required: true },
  subdomain: { type: String, required: true, unique: true },
  // Permanent public ID for API access
  merchantId: {
    type: String,
    required: true,
    unique: true,
    default: () => generateMerchantId()
  },
  apiKeyHash: { type: String, default: null, unique: true, index: true, sparse: true },
  displayApiKey: { type: String, default: null },
  ownerEmail: { type: String, required: true, index: true },
}, {
  collection: 'tenants',
  timestamps: true
});

export default mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);