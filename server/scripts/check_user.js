const mongoose = require('mongoose');
require('dotenv').config();

// Define schema directly to avoid double model registration if needed
const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const User = mongoose.models.User || mongoose.model('User', userSchema);

const BASE_URI = (process.env.MONGODB_URI?.includes('?') ? process.env.MONGODB_URI.replace(/\?/, 'fivenursing_pro?') : (process.env.MONGODB_URI + 'fivenursing_pro?')) + 'retryWrites=true&w=majority';

async function check() {
    try {
        await mongoose.connect(BASE_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        // Look for users who have been calculated recently
        const users = await User.find({}).sort({ updatedAt: -1 }).limit(5);
        
        console.log('--- Recent User Data ---');
        users.forEach(u => {
            const steps = u.wearable?.steps;
            const score = u.scores?.exercise;
            console.log(`ID: ${u._id}, Nickname: ${u.nickname}, Steps: ${steps}, ExerciseScore: ${score}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
