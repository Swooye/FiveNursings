require('dotenv').config();
const mongoose = require('mongoose');
const { TaskTemplate } = require('./models');

async function healTemplates() {
    console.log("Connecting to DB...");
    const DB_NAME = process.env.MONGODB_DB_NAME || (process.env.NODE_ENV === 'production' ? 'fivenursing_pro' : 'fivenursing_dev');
    let baseUri = process.env.MONGODB_URI;
    
    if (!baseUri.includes(DB_NAME)) {
        if (baseUri.includes('?')) {
            baseUri = baseUri.replace(/\?/, `${DB_NAME}?`);
        } else {
            baseUri = baseUri.endsWith('/') ? `${baseUri}${DB_NAME}` : `${baseUri}/${DB_NAME}`;
        }
    }
    await mongoose.connect(baseUri);
    console.log("✅ Connected to", DB_NAME);
    
    console.log("Healing all active AI/Doctor templates with 'once' frequency to 'daily'...");
    
    // Find all active templates that are marked as 'once' and upgrade them to 'daily'
    const result = await TaskTemplate.updateMany(
        { frequency: "once", isActive: true },
        { $set: { frequency: "daily" } }
    );
    
    console.log(`✅ Success: Updated ${result.modifiedCount} templates to 'daily'.`);
    
    console.log("\nAll tasks finished. Disconnecting...");
    await mongoose.disconnect();
}

healTemplates().catch(async (e) => {
    console.error(e);
    await mongoose.disconnect();
    process.exit(1);
});
