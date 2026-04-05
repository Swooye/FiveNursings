require('dotenv').config();
const mongoose = require('mongoose');
const { User, DailyTask, TaskTemplate } = require('./models');

async function healIds() {
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
    
    // [FIX] Handling password encoding if it fails or has special chars
    // But since it's already encoded in .env, we assume it's correct for now.
    
    await mongoose.connect(baseUri);
    console.log("✅ Connected to", DB_NAME);
    
    const collections = [DailyTask, TaskTemplate];
    let totalFixed = 0;

    for (const Model of collections) {
        const modelName = Model.modelName;
        console.log(`\nScanning ${modelName} for legacy userIds...`);
        
        // Find all records where userId is likely a Firebase UID (non-ObjectId format)
        // Note: Simple regex to check if it's NOT a 24-char hex string
        const legacyRecords = await Model.find({ 
            userId: { $not: /^[0-9a-fA-F]{24}$/ } 
        }).select('userId').lean();

        const uniqueLegacyIds = [...new Set(legacyRecords.map(r => r.userId))];
        console.log(`Found ${uniqueLegacyIds.length} unique legacy IDs in ${modelName}.`);

        for (const legacyId of uniqueLegacyIds) {
            const user = await User.findOne({ firebaseUid: legacyId }).select('_id').lean();
            if (user) {
                const mongoId = user._id.toString();
                const result = await Model.updateMany(
                    { userId: legacyId },
                    { $set: { userId: mongoId } }
                );
                console.log(`  - Migrated ${legacyId} -> ${mongoId} (${result.modifiedCount} records).`);
                totalFixed += result.modifiedCount;
            } else {
                console.warn(`  - [WARN] No user found for legacy ID ${legacyId}`);
            }
        }
    }

    console.log(`\n✅ Migration Finished. Total records updated: ${totalFixed}`);
    await mongoose.disconnect();
}

healIds().catch(async (e) => {
    console.error(e);
    await mongoose.disconnect();
    process.exit(1);
});
