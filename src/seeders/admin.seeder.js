import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';

const seedAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@mindgym.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

        const existingAdmin = await User.findOne({
            where: {
                email: adminEmail,
                user_type: 'admin'
            }
        });

        if (existingAdmin) {
            console.log('Admin already exists. Skipping seeding.');
            return;
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        await User.create({
            name: 'System Admin',
            email: adminEmail,
            password: hashedPassword,
            user_type: 'admin',
            phone: '9999999999',
            is_active: true,
            kyc_status: 'approved',
            profile: {
                url: "",
                public_id: "",
                initials: "SA"
            }
        });

        console.log('Admin user seeded successfully!');
    } catch (error) {
        console.error('Error seeding admin user:', error.message);
    }
};

export default seedAdmin;
