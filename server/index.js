const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3002;

// Middlewares
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Admin' },
  nickname: { type: String },
  name: { type: String }, // 真实姓名
  avatar: { type: String },
  gender: { type: String },
  birthDate: { type: String },
  height: { type: Number },
  weight: { type: Number },
  isVerified: { type: Boolean, default: false },
  isProfileComplete: { type: Boolean, default: false },
  firebaseUid: { type: String, index: true },
  phoneNumber: { type: String, index: true }
});

const User = mongoose.model('User', userSchema);

// Super Admin Initialization
const initializeSuperAdmin = async () => {
  try {
    let adminUser = await User.findOne({ username: 'admin' });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('123789', 10);
      adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'Super Admin',
      });
      await adminUser.save();
      console.log('Super admin created successfully.');
    } else {
      let needsUpdate = false;
      if (!adminUser.email) {
        adminUser.email = 'admin@example.com';
        needsUpdate = true;
      }
      if (adminUser.role !== 'Super Admin') {
        adminUser.role = 'Super Admin';
        needsUpdate = true;
      }

      if (needsUpdate) {
        await adminUser.save();
        console.log('Super admin account has been corrected and updated.');
      }
    }
  } catch (error) {
    console.error('Error initializing super admin:', error);
  }
};


// API Routes

// Login (Admin)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user && (await bcrypt.compare(password, user.password))) {
      const userResponse = {
        id: user._id,
        username: user.username,
        role: user.role,
        email: user.email,
      };
      res.status(200).json({ message: 'Login successful', user: userResponse });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET user by Firebase UID or Phone
app.get('/api/user/sync', async (req, res) => {
  const { uid, phone, email } = req.query;
  try {
    let user = null;
    if (uid) user = await User.findOne({ firebaseUid: uid });
    if (!user && phone) user = await User.findOne({ phoneNumber: phone });
    if (!user && email) user = await User.findOne({ email: email });

    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all users (Admin)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); 
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST a new user
app.post('/api/users', async (req, res) => {
    const { username, email, password, firebaseUid, phoneNumber } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password || 'default_password', 10);
        const newUser = new User({ 
          username: username || phoneNumber || email || firebaseUid, 
          email: email || `${phoneNumber || firebaseUid}@fivenursings.com`, 
          password: hashedPassword, 
          role: 'Admin',
          firebaseUid,
          phoneNumber
        });
        await newUser.save();
        const userResponse = newUser.toObject();
        delete userResponse.password;
        res.status(201).json(userResponse);
    } catch (error) {
        if (error.code === 11000) { 
            return res.status(409).json({ message: 'Username or email already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/user/:id - Update user profile
app.patch('/api/user/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    if (updates.nickname || updates.name || updates.gender) {
      updates.isVerified = true;
      updates.isProfileComplete = true;
    }

    let query = { _id: mongoose.Types.ObjectId.isValid(id) ? id : null };
    if (!query._id) {
       query = { firebaseUid: id };
    }

    const updatedUser = await User.findOneAndUpdate(query, { $set: updates }, { new: true, select: '-password' });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a user
app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const userToDelete = await User.findById(id);
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (userToDelete.role === 'Super Admin') {
            return res.status(403).json({ message: 'Super Admin cannot be deleted' });
        }
        await User.findByIdAndDelete(id);
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Server Initialization
const startServer = async () => {
    try {
        await mongoose.connect('mongodb+srv://admin:5Nursings+A@cluster0.k2sadls.mongodb.net/?appName=Cluster0', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        await initializeSuperAdmin();

        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
