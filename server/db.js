const mongoose = require('mongoose');

const DB_NAME = process.env.MONGODB_DB_NAME || (process.env.NODE_ENV === 'production' ? 'fivenursing_pro' : 'fivenursing_dev');
const rawUri = process.env.MONGODB_URI || '';
let BASE_URI = rawUri;

// [ROBUSTNESS] 仅在 URI 不包含数据库路径或查询参数时尝试拼接
if (rawUri && !rawUri.includes('?') && !rawUri.includes(`/${DB_NAME}`)) {
    const separator = rawUri.endsWith('/') ? '' : '/';
    BASE_URI = `${rawUri}${separator}${DB_NAME}?retryWrites=true&w=majority`;
}

console.log(`[DB] Using URI from env: ${BASE_URI.replace(/:([^@]+)@/, ":****@")}`);
console.log(`[DB] Environment: ${process.env.NODE_ENV || 'development'} | Target Database: ${DB_NAME}`);

mongoose.connect(BASE_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log("MongoDB connected successfully");
}).catch(err => {
    console.error("MongoDB connection error:", err);
});

module.exports = mongoose;
