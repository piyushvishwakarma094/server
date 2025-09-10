const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile/:id
// @desc    Get user profile by ID
// @access  Public
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('tripsCreated', 'title fromCity toCity travelDate status currentParticipants maxParticipants')
      .populate('tripsJoined', 'title fromCity toCity travelDate status currentParticipants maxParticipants');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
  body('city').optional().trim().isLength({ min: 2 }).withMessage('City must be at least 2 characters'),
  body('phone').optional().trim(),
  body('age').optional().isInt({ min: 18, max: 100 }).withMessage('Age must be between 18 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, bio, city, phone, age } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (bio !== undefined) updateFields.bio = bio;
    if (city) updateFields.city = city;
    if (phone !== undefined) updateFields.phone = phone;
    if (age) updateFields.age = age;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('tripsCreated', 'title fromCity toCity travelDate status')
     .populate('tripsJoined', 'title fromCity toCity travelDate status');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/my-trips
// @desc    Get current user's trips (created and joined)
// @access  Private
router.get('/my-trips', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'tripsCreated',
        populate: {
          path: 'participants',
          select: 'name city'
        }
      })
      .populate({
        path: 'tripsJoined',
        populate: {
          path: 'creator participants',
          select: 'name city'
        }
      });

    res.json({
      tripsCreated: user.tripsCreated,
      tripsJoined: user.tripsJoined
    });
  } catch (error) {
    console.error('Get my trips error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/search
// @desc    Search users by name or city
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, city } = req.query;
    const query = {};

    if (q) {
      query.name = new RegExp(q, 'i');
    }
    if (city) {
      query.city = new RegExp(city, 'i');
    }

    // Exclude current user from search results
    query._id = { $ne: req.user._id };

    const users = await User.find(query)
      .select('name city age bio')
      .limit(20);

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;