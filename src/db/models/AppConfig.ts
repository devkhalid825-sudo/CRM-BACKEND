import mongoose, { Document, Schema } from 'mongoose';

export interface IAppConfig extends Document {
  key: string;
  valueEnc: string;
  group: string;
  version: number;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AppConfigSchema = new Schema<IAppConfig>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    valueEnc: { type: String, required: true },
    group: { type: String, default: 'general', index: true },
    version: { type: Number, default: 1 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export const AppConfig = mongoose.model<IAppConfig>('AppConfig', AppConfigSchema);
