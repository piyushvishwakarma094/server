const express = require('express');
const { body, validationResult } = require('express-validator');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/posts
// @desc    Get all posts with optional filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { fromCity, toCity, date, page = 1, limit = 10 } = req.query;
    const query = { status: 'active' };

    // Add filters if provided
    if (fromCity) {
      query.fromCity = new RegExp(fromCity, 'i');
    }
    if (toCity) {
      query.toCity = new RegExp(toCity, 'i');
    }
    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.travelDate = {
        $gte: searchDate,
        $lt: nextDay
      };
    }

    const posts = await Post.find(query)
      .populate('creator', 'name city age')
      .populate('participants', 'name city')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/:id
// @desc    Get single post by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('creator', 'name city age bio phone')
      .populate('participants', 'name city age')
      .populate('comments.user', 'name city');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', [
  auth,
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 characters'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters'),
  body('fromCity').trim().isLength({ min: 2 }).withMessage('From city is required'),
  body('toCity').trim().isLength({ min: 2 }).withMessage('To city is required'),
  body('travelDate').isISO8601().withMessage('Valid travel date is required'),
  body('travelTime').notEmpty().withMessage('Travel time is required'),
  body('maxParticipants').isInt({ min: 2, max: 10 }).withMessage('Max participants must be 2-10')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      fromCity,
      toCity,
      travelDate,
      travelTime,
      maxParticipants,
      transportMode,
      estimatedCost,
      notes
    } = req.body;

    // Check if travel date is in the future
    if (new Date(travelDate) <= new Date()) {
      return res.status(400).json({ message: 'Travel date must be in the future' });
    }

    const post = new Post({
      title,
      description,
      fromCity,
      toCity,
      travelDate,
      travelTime,
      maxParticipants,
      creator: req.user._id,
      participants: [req.user._id],
      transportMode: transportMode || 'car',
      estimatedCost: estimatedCost || 0,
      notes: notes || ''
    });

    await post.save();

    // Add to user's created trips
    await User.findByIdAndUpdate(req.user._id, {
      $push: { tripsCreated: post._id }
    });

    const populatedPost = await Post.findById(post._id)
      .populate('creator', 'name city age')
      .populate('participants', 'name city');

    res.status(201).json({
      message: 'Post created successfully',
      post: populatedPost
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:id/join
// @desc    Join a trip
// @access  Private
router.post('/:id/join', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.status !== 'active') {
      return res.status(400).json({ message: 'This trip is no longer active' });
    }

    if (post.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot join your own trip' });
    }

    if (post.participants.includes(req.user._id)) {
      return res.status(400).json({ message: 'You have already joined this trip' });
    }

    if (post.currentParticipants >= post.maxParticipants) {
      return res.status(400).json({ message: 'This trip is already full' });
    }

    // Add user to participants
    post.participants.push(req.user._id);
    post.currentParticipants += 1;

    // Update status if full
    if (post.currentParticipants >= post.maxParticipants) {
      post.status = 'full';
    }

    await post.save();

    // Add to user's joined trips
    await User.findByIdAndUpdate(req.user._id, {
      $push: { tripsJoined: post._id }
    });

    const updatedPost = await Post.findById(post._id)
      .populate('creator', 'name city age')
      .populate('participants', 'name city');

    res.json({
      message: 'Successfully joined the trip',
      post: updatedPost
    });
  } catch (error) {
    console.error('Join trip error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:id/leave
// @desc    Leave a trip
// @access  Private
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Trip creator cannot leave the trip' });
    }

    if (!post.participants.includes(req.user._id)) {
      return res.status(400).json({ message: 'You are not part of this trip' });
    }

    // Remove user from participants
    post.participants = post.participants.filter(
      participant => participant.toString() !== req.user._id.toString()
    );
    post.currentParticipants -= 1;

    // Update status if no longer full
    if (post.status === 'full') {
      post.status = 'active';
    }

    await post.save();

    // Remove from user's joined trips
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { tripsJoined: post._id }
    });

    res.json({ message: 'Successfully left the trip' });
  } catch (error) {
    console.error('Leave trip error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:id/comments
// @desc    Add comment to post
// @access  Private
router.post('/:id/comments', [
  auth,
  body('text').trim().isLength({ min: 1, max: 500 }).withMessage('Comment must be 1-500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const newComment = {
      user: req.user._id,
      text: req.body.text
    };

    post.comments.push(newComment);
    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('comments.user', 'name city');

    res.json({
      message: 'Comment added successfully',
      comments: updatedPost.comments
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;