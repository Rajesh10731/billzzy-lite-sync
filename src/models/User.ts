import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  name: string; // Add name field
  email: string;
  password?: string; // Password is selected: false
  role: 'user' | 'admin' | 'tenant'; // Added 'tenant' role
  tenantId: Types.ObjectId; // A reference to the Tenant this user belongs to
  phoneNumber?: string; // Added phone number field
  onboarded?: boolean; // Track onboarding status
  pin?: string; // unique PIN for client report access
  verificationOtp?: string; // OTP for phone verification
  verificationOtpExpires?: Date; // Expiry time for OTP
  salesTarget: number;
  merchantUpiId?: string;
  shopName?: string;
  shopAddress?: string;
  address?: string; // Personal address
  defaultCountryCode?: string; // Default country for phone numbers
}

const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: false, // Not required for OAuth users
    select: false, // Password will not be returned in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'tenant'], // Added 'tenant' to allowed roles
    default: 'user',
  },
  // This links a User to a specific Tenant
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant', // This must match the name you used in mongoose.model('Tenant', ...)
    required: false, // Not required, because the admin user will not have a tenantId
  },
  phoneNumber: {
    type: String,
    required: false,
  },
  onboarded: {
    type: Boolean,
    default: false,
  },
  pin: {
    type: String,
    required: false,
    default: null,
  },
  verificationOtp: {
    type: String,
    select: false,
  },
  verificationOtpExpires: {
    type: Date,
    select: false,
  },
  salesTarget: {
    type: Number,
    default: 10000, // Default target
  },
  merchantUpiId: {
    type: String,
    required: false,
  },
  shopName: {
    type: String,
    required: false,
  },
  shopAddress: {
    type: String,
    required: false,
  },
  address: {
    type: String,
    required: false,
  },
    defaultCountryCode: {
    type: String,
    required: false,
    default: 'IN', // Default to India
  },
}, {
  timestamps: true,
  collection: 'users' // Explicitly specify collection name
});


export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);