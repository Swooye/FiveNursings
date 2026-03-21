require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3002;

const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_dev?retryWrites=true&w=majority";

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'x-total-count'] }));
app.use(bodyParser.json());
app.use('/uploads', express.static(uploadDir));

app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (Array.isArray(data)) {
            res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
            res.setHeader('X-Total-Count', data.length);
        }
        return originalJson.call(this, data);
    };
    next();
});

const userSchema = new mongoose.Schema({
    firebaseUid: { type: String, index: true },
    phoneNumber: String,
    email: String,
    nickname: String,
    name: String,
    age: Number,
    gender: String,
    height: Number,
    weight: Number,
    cancerType: String,
    stage: String,
    isProfileComplete: Boolean,
    isQuestionnaireComplete: Boolean,
    avatar: String,
    scores: {
        diet: { type: Number, default: 0 },
        exercise: { type: Number, default: 0 },
        sleep: { type: Number, default: 0 },
        mental: { type: Number, default: 0 },
        function: { type: Number, default: 0 }
    }
}, { strict: false, collection: 'users', timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', new mongoose.Schema({}, { strict: false }), 'admins');
const MallItem = mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }), 'mall_items');
const Protocol = mongoose.model('Protocol', new mongoose.Schema({}, { strict: false }), 'protocols');
const ChatMessage = mongoose.model('ChatMessage', new mongoose.Schema({}, { strict: false }), 'chatmessages');

const format = (doc) => { 
    if (!doc) return null; 
    const obj = doc.toObject ? doc.toObject({ getters: true }) : doc; 
    return { ...obj, id: obj._id ? obj._id.toString() : null }; 
};

app.post('/api/users/sync', async (req, res) => {
    const { firebaseUid, email, phoneNumber } = req.body;
    if (!firebaseUid) return res.status(400).json({ error: "Missing firebaseUid" });

    try {
        const cleanUid = firebaseUid.trim();
        const phoneDigits = phoneNumber ? phoneNumber.replace(/\D/g, '').replace(/^86/, '') : '';

        let user = await User.findOne({
            $or: [
                { firebaseUid: cleanUid },
                { firebaseUid: new RegExp('^' + cleanUid) },
                { phoneNumber: phoneNumber },
                { phoneNumber: new RegExp(phoneDigits + '$') }
            ]
        });

        if (user) {
            if (user.firebaseUid !== cleanUid) {
                user.firebaseUid = cleanUid;
                await user.save();
            }
            return res.json(format(user));
        }

        user = await User.create({
            firebaseUid: cleanUid,
            email,
            phoneNumber,
            nickname: '新用户',
            isProfileComplete: false
        });
        res.json(format(user));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const adminUser = await Admin.findOne({ $or: [{ email }, { username: email }] });
    if (adminUser && (await bcrypt.compare(password, adminUser.password))) {
      res.json({ user: format(adminUser) });
    } else { res.status(401).json({ message: 'Invalid credentials' }); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/user/:id', async (req, res) => {
    try {
        const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ message: 'Success', user: format(updated) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const createRoutes = (path, Model) => {
  app.get(`/api/${path}`, async (req, res) => {
    try { const data = await Model.find().sort({ createdAt: -1 }); res.json(data.map(format)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.get(`/api/${path}/:id`, async (req, res) => {
    try { const data = await Model.findById(req.params.id); res.json(format(data)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.post(`/api/${path}`, async (req, res) => {
    try { const data = await Model.create(req.body); res.json(format(data)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.patch(`/api/${path}/:id`, async (req, res) => {
    try { 
        const updated = await Model.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
        res.json(format(updated)); 
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.delete(`/api/${path}/:id`, async (req, res) => {
    try { await Model.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
  });
};

createRoutes('users', User);
createRoutes('admins', Admin);
createRoutes('mall_items', MallItem);
createRoutes('protocols', Protocol);

mongoose.connect(BASE_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
});
