const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  fromCity: {
    type: String,
    required: true,
    trim: true
  },
  toCity: {
    type: String,
    required: true,
    trim: true
  },
  travelDate: {
    type: Date,
    required: true
  },
  travelTime: {
    type: String,
    required: true
  },
  maxParticipants: {
    type: Number,
    required: true,
    min: 2,
    max: 10
  },
  currentParticipants: {
    type: Number,
    default: 1
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  status: {
    type: String,
    enum: ['active', 'full', 'completed', 'cancelled'],
    default: 'active'
  },
  transportMode: {
    type: String,
    enum: ['car', 'bus', 'train', 'flight', 'other'],
    default: 'car'
  },
  estimatedCost: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Index for search functionality
postSchema.index({ fromCity: 1, toCity: 1, travelDate: 1 });
postSchema.index({ creator: 1 });
postSchema.index({ status: 1 });

module.exports = mongoose.model('Post', postSchema);