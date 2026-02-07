require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3002;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'x-total-count'] }));
app.use(bodyParser.json());
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

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

// 使用 strict: false 保证所有字段都能存入，避免信息缺失
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Admin = mongoose.model('Admin', new mongoose.Schema({}, { strict: false }));
const MallItem = mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }));
const Protocol = mongoose.model('Protocol', new mongoose.Schema({}, { strict: false }));

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url });
});

const format = (doc) => { if (!doc) return null; const obj = doc.toObject ? doc.toObject() : doc; return { ...obj, id: obj._id }; };

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const adminUser = await Admin.findOne({ $or: [{ email }, { username: email }] });
    if (adminUser && (await bcrypt.compare(password, adminUser.password))) {
      res.json({ user: format(adminUser) });
    } else { res.status(401).json({ message: 'Invalid credentials' }); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 统一用户同步接口 (Find or Create)
app.post('/api/users/sync', async (req, res) => {
  const { firebaseUid, email, phoneNumber } = req.body;
  try {
    let user = await User.findOne({ firebaseUid });
    if (!user && (email || phoneNumber)) {
      user = await User.findOne({ $or: [{ email: email || '_none_' }, { phoneNumber: phoneNumber || '_none_' }] });
    }
    
    if (!user) {
      user = await User.create({
        firebaseUid,
        email: email || `${firebaseUid}@fivenursings.com`,
        phoneNumber,
        username: email || phoneNumber || firebaseUid,
        password: await bcrypt.hash('default_password', 10),
        isVerified: false,
        isProfileComplete: false,
        scores: { diet: 0, exercise: 0, sleep: 0, mental: 0, function: 0 }
      });
    } else if (!user.firebaseUid) {
      user.firebaseUid = firebaseUid;
      await user.save();
    }
    res.json(format(user));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const handleUserPatch = async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Success', user: format(updated) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

app.patch('/api/user/:id', handleUserPatch);
app.patch('/api/users/:id', handleUserPatch);

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
  app.delete(`/api/${path}/:id`, async (req, res) => {
    try { await Model.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
  });
};

createRoutes('users', User);
createRoutes('admins', Admin);
createRoutes('mall_items', MallItem);
createRoutes('protocols', Protocol);

const startServer = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI not set');
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log(`Connected to database: ${mongoose.connection.name}`);
        const adminEmail = 'admin@fivenursings.com';
        const adminExists = await Admin.findOne({ email: adminEmail });
        if (!adminExists) {
          const hashedPassword = await bcrypt.hash('123789', 10);
          await Admin.create({ username: 'admin', email: adminEmail, password: hashedPassword, role: 'Super Admin', nickname: '超级管理员' });
        }
        app.listen(port, () => console.log(`Server is running on port ${port}`));
    } catch (err) { console.error('Failed to start server:', err); }
};
startServer();
