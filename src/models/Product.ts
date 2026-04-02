import mongoose, { Schema, models, Document } from 'mongoose';

export interface IProduct extends Document {
  tenantId: string;
  name: string;
  sku?: string;
  quantity: number;
  buyingPrice: number;
  sellingPrice: number;
  gstRate: number;
  image?: string;
  lowStockThreshold?: number;
  profitPerUnit?: number;
  createdAt: Date;
  updatedAt: Date;
  source: 'MASTER' | 'LITE';
}

const ProductSchema = new Schema<IProduct>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    sku: {
      type: String,
      trim: true,
      sparse: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 0
    },
    buyingPrice: {
      type: Number,
      required: false,
      default: 0
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      default: 0
    },
    gstRate: {
      type: Number,
      required: false,
      default: 0
    },
    image: {
      type: String,
      required: false
    },
    lowStockThreshold: {
      type: Number,
      required: false
    },
    profitPerUnit: {
      type: Number,
      required: false,
      default: 0
    },
    source: { type: String, enum: ['MASTER', 'LITE'], default: 'LITE' }
  },
  {
    timestamps: true,
    collection: 'products' // Explicitly specify collection name
  }
);

ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true, sparse: true });

const Product = models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
