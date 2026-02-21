import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    userId: string;
    title: string;
    message: string;
    url?: string;
    isRead: boolean;
    createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    url: { type: String },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
