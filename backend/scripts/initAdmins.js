const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const initAdmins = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    console.log('Connected to MongoDB');

    // Check if admins already exist
    const existingStandardAdmin = await Admin.findOne({ role: 'ADMIN_STANDARD' });
    const existingSuperAdmin = await Admin.findOne({ role: 'ADMIN_SUPER' });

    if (existingStandardAdmin && existingSuperAdmin) {
      console.log('Admins already exist. Skipping initialization.');
      process.exit(0);
    }

    // Create Standard Admin
    if (!existingStandardAdmin) {
      const standardAdmin = await Admin.create({
        username: process.env.STANDARD_ADMIN_USERNAME || 'standard_admin',
        email: process.env.STANDARD_ADMIN_EMAIL || 'admin@standard.com',
        passwordHash: process.env.STANDARD_ADMIN_PASSWORD || 'ChangeThisPassword123!',
        role: 'ADMIN_STANDARD',
      });
      console.log('Standard Admin created:', {
        username: standardAdmin.username,
        email: standardAdmin.email,
        role: standardAdmin.role,
      });
    }

    // Create Super Admin
    if (!existingSuperAdmin) {
      const superAdmin = await Admin.create({
        username: process.env.SUPER_ADMIN_USERNAME || 'super_admin',
        email: process.env.SUPER_ADMIN_EMAIL || 'admin@super.com',
        passwordHash: process.env.SUPER_ADMIN_PASSWORD || 'ChangeThisPassword123!',
        role: 'ADMIN_SUPER',
      });
      console.log('Super Admin created:', {
        username: superAdmin.username,
        email: superAdmin.email,
        role: superAdmin.role,
      });
    }

    console.log('Admin initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing admins:', error);
    process.exit(1);
  }
};

initAdmins();
