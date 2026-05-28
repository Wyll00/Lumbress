require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seedUser = async () => {
    try {
        console.log('Intentando conectar a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/biblioteca-personal');
        console.log('✅ Conectado a MongoDB');

        // Check if user exists
        let user = await User.findOne({ email: 'admin@admin.com' });
        if (user) {
            console.log('⚠️ El usuario admin ya existe.');
            process.exit(0);
        }

        // Create new user
        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash('admin123', salt);

        user = new User({
            username: 'admin',
            email: 'admin@admin.com',
            password: password
        });

        await user.save();
        console.log('🎉 Usuario creado con éxito!');
        console.log('Email: admin@admin.com');
        console.log('Contraseña: admin123');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error fatal:', err);
        process.exit(1);
    }
};

seedUser();
