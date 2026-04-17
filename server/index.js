const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// 1. Initialize DB Connection
require('./db');

// 2. Setup Express
const app = express();
const port = process.env.PORT || 3002;

// 3. Ensure necessary directories
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

// 4. Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-total-count']
}));
app.use(bodyParser.json());
app.use('/uploads', express.static(uploadPath));
app.use(require('./middleware/requestLogger'));

// 5. Routes
app.get('/api/ping', (req, res) => res.json({ status: "pong", version: "2.0.0-modular" }));

// Route Modules
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/dailyTasks'));
app.use('/api', require('./routes/health'));
app.use('/api', require('./routes/orders'));
app.use('/api', require('./routes/chat'));
app.use('/api', require('./routes/messages'));
app.use('/api', require('./routes/common'));
app.use('/api', require('./routes/service'));

// 6. Global Setup
console.log("\n>>> [MODULAR ARCHITECTURE] FiveNursings Backend Active <<<");
console.log(`Server running on port ${port}\n`);

app.listen(port);
