import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsappSetting extends Document {
  shopId: string; // The email of the merchant user (used as FK)
  whatsappBusinessNumber: string;
  gowhatsApiToken: string;
  phoneNumberId: string;
  whatsappBusinessAccountId: string;
  templateNameCash?: string;
  templateNameUPI?: string;
  templateNameCard?: string;
}

const WhatsappSettingSchema: Schema = new Schema({
  shopId: { type: String, required: true, unique: true, index: true },
  whatsappBusinessNumber: { type: String, required: false },
  gowhatsApiToken: { type: String, required: false },
  phoneNumberId: { type: String, required: false },
  whatsappBusinessAccountId: { type: String, required: false },
  templateNameCash: { type: String, required: false },
  templateNameUPI: { type: String, required: false },
  templateNameCard: { type: String, required: false },
}, {
  collection: 'whatsapp_settings',
  timestamps: true
});

export default mongoose.models.WhatsappSetting || mongoose.model<IWhatsappSetting>('WhatsappSetting', WhatsappSettingSchema);
