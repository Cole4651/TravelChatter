const mongoose = require('mongoose');

const itineraryItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['flight', 'hotel', 'meeting', 'activity', 'other'],
    default: 'other',
  },
  date: { type: Date },
  time: { type: String },
  location: { type: String },
  notes: { type: String },
});

const wishlistItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, default: 'activity' },
  description: { type: String },
  location: { type: String },
  addedAt: { type: Date, default: Date.now },
});

const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true },
  destination: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  purpose: { type: String, trim: true },
  status: {
    type: String,
    enum: ['planning', 'approval', 'travel', 'post'],
    default: 'planning',
  },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  itinerary: [itineraryItemSchema],
  wishlist: [wishlistItemSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Trip', tripSchema);
