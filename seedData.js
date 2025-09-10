const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Post = require('./models/Post');

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-partner-finder');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Post.deleteMany({});
    console.log('Cleared existing data');

    // Create demo users
    const users = [
      {
        name: 'Demo User',
        email: 'demo@example.com',
        password: 'demo123',
        city: 'Mumbai',
        age: 25,
        bio: 'Love to travel and explore new places. Looking for travel companions!'
      },
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: 'password123',
        city: 'Delhi',
        age: 28,
        bio: 'Adventure seeker and photography enthusiast. Always ready for the next trip!'
      },
      {
        name: 'Bob Smith',
        email: 'bob@example.com',
        password: 'password123',
        city: 'Bangalore',
        age: 30,
        bio: 'Tech professional who loves weekend getaways and mountain treks.'
      },
      {
        name: 'Carol Davis',
        email: 'carol@example.com',
        password: 'password123',
        city: 'Chennai',
        age: 26,
        bio: 'Beach lover and foodie. Enjoy exploring coastal destinations.'
      },
      {
        name: 'David Wilson',
        email: 'david@example.com',
        password: 'password123',
        city: 'Pune',
        age: 32,
        bio: 'History buff and culture enthusiast. Love visiting heritage sites.'
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
    }
    console.log('Created demo users');

    // Create demo posts
    const posts = [
      {
        title: 'Weekend Trip to Goa - Beach Paradise',
        description: 'Planning a relaxing weekend trip to Goa. Looking for travel companions to share the experience, split costs, and have fun together. We\'ll visit beautiful beaches, try local cuisine, and enjoy water sports.',
        fromCity: 'Mumbai',
        toCity: 'Goa',
        travelDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        travelTime: '08:00',
        maxParticipants: 4,
        creator: createdUsers[0]._id,
        participants: [createdUsers[0]._id],
        transportMode: 'bus',
        estimatedCost: 3000,
        notes: 'Accommodation will be in a beach resort. Bring sunscreen and comfortable clothes!'
      },
      {
        title: 'Himalayan Trek - Manali to Kasol',
        description: 'Adventure trek through the beautiful Himalayas. This will be a 5-day trek with stunning mountain views, camping under stars, and experiencing local culture. Perfect for adventure enthusiasts!',
        fromCity: 'Delhi',
        toCity: 'Manali',
        travelDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        travelTime: '06:00',
        maxParticipants: 6,
        creator: createdUsers[1]._id,
        participants: [createdUsers[1]._id, createdUsers[2]._id],
        currentParticipants: 2,
        transportMode: 'bus',
        estimatedCost: 8000,
        notes: 'Good physical fitness required. Trekking gear will be provided.'
      },
      {
        title: 'Cultural Tour of Rajasthan',
        description: 'Explore the rich culture and heritage of Rajasthan. Visit magnificent palaces, forts, and experience the vibrant local culture. This will be a week-long journey through Jaipur, Udaipur, and Jodhpur.',
        fromCity: 'Bangalore',
        toCity: 'Jaipur',
        travelDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
        travelTime: '10:00',
        maxParticipants: 5,
        creator: createdUsers[2]._id,
        participants: [createdUsers[2]._id],
        transportMode: 'flight',
        estimatedCost: 15000,
        notes: 'Heritage hotels booked. Camera enthusiasts welcome!'
      },
      {
        title: 'Kerala Backwaters Experience',
        description: 'Peaceful journey through Kerala\'s famous backwaters. Enjoy houseboat stays, traditional Kerala cuisine, and serene natural beauty. Perfect for those seeking relaxation and tranquility.',
        fromCity: 'Chennai',
        toCity: 'Alleppey',
        travelDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        travelTime: '07:30',
        maxParticipants: 3,
        creator: createdUsers[3]._id,
        participants: [createdUsers[3]._id, createdUsers[4]._id],
        currentParticipants: 2,
        transportMode: 'train',
        estimatedCost: 5000,
        notes: 'Houseboat accommodation included. Vegetarian meals available.'
      },
      {
        title: 'Mumbai Food Trail',
        description: 'Explore Mumbai\'s incredible street food scene! We\'ll visit famous food streets, try local delicacies, and discover hidden gems. Perfect for food lovers and those new to Mumbai.',
        fromCity: 'Pune',
        toCity: 'Mumbai',
        travelDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        travelTime: '11:00',
        maxParticipants: 4,
        creator: createdUsers[4]._id,
        participants: [createdUsers[4]._id, createdUsers[0]._id],
        currentParticipants: 2,
        transportMode: 'train',
        estimatedCost: 1500,
        notes: 'Day trip only. Come hungry! We\'ll try everything from vada pav to kulfi.'
      }
    ];

    for (const postData of posts) {
      const post = new Post(postData);
      await post.save();
      
      // Update user's trips
      await User.findByIdAndUpdate(postData.creator, {
        $push: { tripsCreated: post._id }
      });
      
      // Update participants' joined trips
      for (const participantId of postData.participants) {
        if (participantId.toString() !== postData.creator.toString()) {
          await User.findByIdAndUpdate(participantId, {
            $push: { tripsJoined: post._id }
          });
        }
      }
    }
    console.log('Created demo posts');

    console.log('Demo data seeded successfully!');
    console.log('\nDemo login credentials:');
    console.log('Email: demo@example.com');
    console.log('Password: demo123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();