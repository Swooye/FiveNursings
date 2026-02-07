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

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Admin = mongoose.model('Admin', new mongoose.Schema({}, { strict: false }));
const MallItem = mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }));
const Protocol = mongoose.model('Protocol', new mongoose.Schema({}, { strict: false }));

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url });
});

const format = (doc) => { if (!doc) return null; const obj = doc.toObject(); return { ...obj, id: obj._id }; };

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ $or: [{ email }, { username: email }] });
    if (admin && (await bcrypt.compare(password, admin.password))) {
      res.json({ user: format(admin) });
    } else { res.status(401).json({ message: 'Invalid credentials' }); }
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
    try { const data = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(format(data)); } catch (e) { res.status(500).json({ error: e.message }); }
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
        const user = 'admin';
        const pass = encodeURIComponent('5Nursings+A');
        const uri = `mongodb+srv://${user}:${pass}@cluster0.k2sadls.mongodb.net/?appName=Cluster0`;
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB');
        const adminEmail = 'admin@fivenursings.com';
        if (!await Admin.findOne({ email: adminEmail })) {
          const hashedPassword = await bcrypt.hash('123789', 10);
          await Admin.create({ username: 'admin', email: adminEmail, password: hashedPassword, role: 'Super Admin' });
        }
        app.listen(port, () => console.log(`Server is running on port ${port}`));
    } catch (err) { console.error('Failed to start server:', err); }
};
startServer();
