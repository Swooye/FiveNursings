const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Multer Config for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- Health Check ---
router.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// --- File Upload ---
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

module.exports = router;
