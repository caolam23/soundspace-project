const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500 },
  coverImage: { type: String, required: true },
  privacy: { type: String, enum: ['public', 'manual', 'private'], default: 'public' },
  roomCode: { type: String, unique: true, sparse: true },

  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['host', 'listener'], default: 'listener' },
    joinedAt: { type: Date, default: Date.now }
  }],

  isActive: { type: Boolean, default: true }
}, { timestamps: true });
