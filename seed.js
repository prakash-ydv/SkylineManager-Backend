import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import connectDB from './src/config/db.js';

dotenv.config();

connectDB();

const seedAdmin = async () => {
  try {
    await User.deleteMany();

    const admin = await User.create({
      name: '',
      email: '',
      password: '',
      role: 'admin',
      status: 'active',
    });
    
    console.log('✅ Admin User Created:');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: password123`);
    process.exit();
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
