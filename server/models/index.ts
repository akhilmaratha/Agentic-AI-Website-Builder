import mongoose, { Schema, Document } from 'mongoose';

// ─── Users ────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  name: string;
  email: string;
  image?: string;
  provider: 'google' | 'github';
  plan: 'free' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'expired' | 'none';
  subscriptionStart?: Date;
  subscriptionEnd?: Date;
  generationsToday: number;
  lastGenerationDate?: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  image: { type: String },
  provider: { type: String, enum: ['google', 'github'], required: true },
  plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  subscriptionStatus: { type: String, enum: ['active', 'expired', 'none'], default: 'none' },
  subscriptionStart: { type: Date },
  subscriptionEnd: { type: Date },
  generationsToday: { type: Number, default: 0 },
  lastGenerationDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.models?.User || mongoose.model<IUser>('User', UserSchema);

// ─── Generation Limit Helper ──────────────────────────────────────────────
const FREE_DAILY_LIMIT = 5;

export async function checkAndIncrementGeneration(email: string): Promise<{ allowed: boolean; remaining: number; plan: string }> {
  const user = await User.findOne({ email });
  if (!user) return { allowed: false, remaining: 0, plan: 'free' };

  // Pro users: unlimited
  if (user.plan === 'pro' || user.plan === 'enterprise') {
    return { allowed: true, remaining: -1, plan: user.plan }; // -1 = unlimited
  }

  // Auto-reset if date changed
  const today = new Date().toDateString();
  const lastGen = user.lastGenerationDate ? user.lastGenerationDate.toDateString() : '';
  
  if (today !== lastGen) {
    user.generationsToday = 0;
    user.lastGenerationDate = new Date();
  }

  if (user.generationsToday >= FREE_DAILY_LIMIT) {
    return { allowed: false, remaining: 0, plan: 'free' };
  }

  user.generationsToday += 1;
  await user.save();

  return { allowed: true, remaining: FREE_DAILY_LIMIT - user.generationsToday, plan: 'free' };
}

export async function getGenerationStatus(email: string): Promise<{ used: number; limit: number; plan: string }> {
  const user = await User.findOne({ email });
  if (!user) return { used: 0, limit: FREE_DAILY_LIMIT, plan: 'free' };

  if (user.plan === 'pro' || user.plan === 'enterprise') {
    return { used: user.generationsToday || 0, limit: -1, plan: user.plan };
  }

  const today = new Date().toDateString();
  const lastGen = user.lastGenerationDate ? user.lastGenerationDate.toDateString() : '';
  const todayCount = (today === lastGen) ? user.generationsToday : 0;

  return { used: todayCount, limit: FREE_DAILY_LIMIT, plan: 'free' };
}

// ─── Projects ─────────────────────────────────────────────────────────────
export interface IProject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  folderId?: mongoose.Types.ObjectId | null;
  framework: 'nextjs' | 'react' | 'html';
  status: 'active' | 'deleted';
  previewHTML?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
  framework: { type: String, enum: ['nextjs', 'react', 'html'], default: 'nextjs' },
  status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  previewHTML: { type: String, default: '' },
}, { timestamps: true });

export const Project = mongoose.models?.Project || mongoose.model<IProject>('Project', ProjectSchema);

// ─── Files ────────────────────────────────────────────────────────────────
export interface IFile extends Document {
  projectId: mongoose.Types.ObjectId;
  path: string;
  content: string;
  updatedAt: Date;
}

const FileSchema = new Schema<IFile>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  path: { type: String, required: true },
  content: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

export const FileModel = mongoose.models?.File || mongoose.model<IFile>('File', FileSchema);

// ─── Generations ──────────────────────────────────────────────────────────
export interface IGeneration extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  prompt: string;
  generatedFiles: Record<string, string>;
  createdAt: Date;
}

const GenerationSchema = new Schema<IGeneration>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  prompt: { type: String, required: true },
  generatedFiles: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

export const Generation = mongoose.models?.Generation || mongoose.model<IGeneration>('Generation', GenerationSchema);

// ─── Subscriptions ────────────────────────────────────────────────────────
export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  plan: 'free' | 'pro' | 'enterprise';
  paymentProvider: 'razorpay' | 'stripe';
  status: 'active' | 'canceled' | 'past_due';
  expiresAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['free', 'pro', 'enterprise'], required: true },
  paymentProvider: { type: String, enum: ['razorpay', 'stripe'], required: true },
  status: { type: String, enum: ['active', 'canceled', 'past_due'], default: 'active' },
  expiresAt: { type: Date, required: true }
});

export const Subscription = mongoose.models?.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);

// ─── Deployments ──────────────────────────────────────────────────────────
export interface IDeployment extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  deploymentUrl: string;
  provider: 'vercel' | 'aws';
  createdAt: Date;
}

const DeploymentSchema = new Schema<IDeployment>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deploymentUrl: { type: String, required: true },
  provider: { type: String, enum: ['vercel', 'aws'], required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Deployment = mongoose.models?.Deployment || mongoose.model<IDeployment>('Deployment', DeploymentSchema);

// ─── Chat Messages ────────────────────────────────────────────────────────
export interface IChatMessage extends Document {
  userEmail: string;
  projectId?: mongoose.Types.ObjectId;
  role: 'user' | 'ai';
  content: string;
  code?: string;
  filename?: string;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  userEmail: { type: String, required: true, index: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  role: { type: String, enum: ['user', 'ai'], required: true },
  content: { type: String, required: true },
  code: { type: String },
  filename: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const ChatMessage = mongoose.models?.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

// ─── Folders ─────────────────────────────────────────────────────────────
export interface IFolder extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  isCollapsed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  isCollapsed: { type: Boolean, default: false },
}, { timestamps: true });

export const Folder = mongoose.models?.Folder || mongoose.model<IFolder>('Folder', FolderSchema);

// ─── Versions ────────────────────────────────────────────────────────────
export interface IVersion extends Document {
  projectId: mongoose.Types.ObjectId;
  versionNumber: number;
  description: string;
  filesSnapshot: Record<string, string>;
  createdAt: Date;
}

const VersionSchema = new Schema<IVersion>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  versionNumber: { type: Number, required: true },
  description: { type: String, default: '' },
  filesSnapshot: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

export const Version = mongoose.models?.Version || mongoose.model<IVersion>('Version', VersionSchema);
