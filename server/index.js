const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3002;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Admin' },
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
      // Ensure the admin user has an email
      if (!adminUser.email) {
        adminUser.email = 'admin@example.com';
        needsUpdate = true;
      }
      // Ensure the admin user's role is 'Super Admin'
      if (adminUser.role !== 'Super Admin') {
        adminUser.role = 'Super Admin';
        needsUpdate = true;
      }

      if (needsUpdate) {
        await adminUser.save();
        console.log('Super admin account has been corrected and updated.');
      } else {
        console.log('Super admin already exists with correct role and email.');
      }
    }
  } catch (error) {
    console.error('Error initializing super admin:', error);
    process.exit(1);
  }
};


// API Routes

// Login
app.post('/login', async (req, res) => {
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

// GET all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // Exclude password from result
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST a new user
app.post('/api/users', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, role: 'Admin' });
        await newUser.save();
        const userResponse = newUser.toObject();
        delete userResponse.password;
        res.status(201).json(userResponse);
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            return res.status(409).json({ message: 'Username or email already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT (update) a user's password
app.put('/api/users/:id/password', async (req, res) => {
    const { id } = req.params;
    const { password, originalPassword } = req.body; // originalPassword can be undefined

    try {
        if (!password) {
            return res.status(400).json({ message: 'New password is required' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If the user is a Super Admin, we must verify the original password
        if (user.role === 'Super Admin') {
            if (!originalPassword) {
                return res.status(400).json({ message: 'Original password is required for Super Admin' });
            }
            const isMatch = await bcrypt.compare(originalPassword, user.password);
            if (!isMatch) {
                return res.status(403).json({ message: 'Incorrect original password' });
            }
        }

        // Hash the new password and update the user
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error("Update password error:", error);
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
        // Connect to MongoDB
        await mongoose.connect('mongodb+srv://admin:5Nursings+A@cluster0.k2sadls.mongodb.net/?appName=Cluster0', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // Initialize Super Admin (and wait for it to finish)
        await initializeSuperAdmin();

        // Start the Express server
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

// Run the server
startServer();
