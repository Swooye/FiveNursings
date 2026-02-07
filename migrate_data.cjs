const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function migrate() {
    const sourceUri = process.env.MONGODB_URI.replace('/fivenursing_dev', '/test');
    const targetUri = process.env.MONGODB_URI;

    console.log('--- Database Migration Started ---');
    console.log(`Source: test`);
    console.log(`Target: fivenursing_dev`);

    try {
        // Connect to source
        const sourceConn = await mongoose.createConnection(sourceUri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to source database.');

        // Connect to target
        const targetConn = await mongoose.createConnection(targetUri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to target database.');

        const collections = await sourceConn.db.listCollections().toArray();
        
        for (const col of collections) {
            const name = col.name;
            if (name.startsWith('system.')) continue;

            console.log(`Migrating collection: ${name}...`);
            const data = await sourceConn.db.collection(name).find({}).toArray();
            
            if (data.length > 0) {
                // Clean target collection first if needed, or just insert
                // To be safe, we'll only insert if target is empty for that collection
                const count = await targetConn.db.collection(name).countDocuments();
                if (count === 0) {
                    await targetConn.db.collection(name).insertMany(data);
                    console.log(`  Done! Migrated ${data.length} documents.`);
                } else {
                    console.log(`  Skipped! Target collection ${name} already has data.`);
                }
            } else {
                console.log(`  Empty collection, skipped.`);
            }
        }

        console.log('--- Migration Finished Successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
