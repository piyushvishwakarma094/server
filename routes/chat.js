const express = require('express');
const { body, validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/chat/conversations
// @desc    Get all conversations for current user
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    })
    .populate('participants', 'name city')
    .populate('relatedPost', 'title fromCity toCity')
    .sort({ lastMessage: -1 });

    // Format conversations to show the other participant
    const conversations = chats.map(chat => {
      const otherParticipant = chat.participants.find(
        participant => participant._id.toString() !== req.user._id.toString()
      );
      
      const lastMessage = chat.messages.length > 0 
        ? chat.messages[chat.messages.length - 1]
        : null;

      return {
        _id: chat._id,
        participant: otherParticipant,
        relatedPost: chat.relatedPost,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          timestamp: lastMessage.timestamp,
          sender: lastMessage.sender.toString(),
          read: lastMessage.read
        } : null,
        unreadCount: chat.messages.filter(
          msg => msg.sender.toString() !== req.user._id.toString() && !msg.read
        ).length
      };
    });

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/chat/:userId
// @desc    Get or create chat with specific user
// @access  Private
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { postId } = req.query;

    // Check if the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find existing chat between these users
    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, userId] }
    })
    .populate('participants', 'name city')
    .populate('messages.sender', 'name')
    .populate('relatedPost', 'title fromCity toCity');

    // If no chat exists, create one
    if (!chat) {
      chat = new Chat({
        participants: [req.user._id, userId],
        relatedPost: postId || null
      });
      await chat.save();
      
      chat = await Chat.findById(chat._id)
        .populate('participants', 'name city')
        .populate('messages.sender', 'name')
        .populate('relatedPost', 'title fromCity toCity');
    }

    res.json(chat);
  } catch (error) {
    console.error('Get/Create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/chat/:chatId/messages
// @desc    Send message in chat
// @access  Private
router.post('/:chatId/messages', [
  auth,
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { chatId } = req.params;
    const { content } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is participant in this chat
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }

    const newMessage = {
      sender: req.user._id,
      content,
      timestamp: new Date()
    };

    chat.messages.push(newMessage);
    chat.lastMessage = new Date();
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('messages.sender', 'name');

    const sentMessage = updatedChat.messages[updatedChat.messages.length - 1];

    res.json({
      message: 'Message sent successfully',
      sentMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/chat/:chatId/read
// @desc    Mark messages as read
// @access  Private
router.put('/:chatId/read', auth, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is participant in this chat
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }

    // Mark all messages from other participants as read
    chat.messages.forEach(message => {
      if (message.sender.toString() !== req.user._id.toString()) {
        message.read = true;
      }
    });

    await chat.save();

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;