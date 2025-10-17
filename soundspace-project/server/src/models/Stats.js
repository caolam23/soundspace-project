// server/src/models/Stats.js
const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
  totalVisits: { type: Number, default: 0 },
}, { timestamps: true });

// Singleton pattern: chỉ có 1 document Stats duy nhất
statsSchema.statics.getSingleton = async function() {
  let stats = await this.findOne();
  if (!stats) {
    stats = await this.create({});
  }
  return stats;
};

module.exports = mongoose.model('Stats', statsSchema);
