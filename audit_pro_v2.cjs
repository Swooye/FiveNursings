const mongoose = require('mongoose');

async function auditProCollections() {
    const PROD_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_pro?retryWrites=true&w=majority";
    try {
        await mongoose.connect(PROD_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        console.log(`Scanning all collections in fivenursing_pro...`);

        for (const col of collections) {
            const name = col.name;
            const count = await db.collection(name).countDocuments();
            console.log(`Collection: ${name} (Count: ${count})`);
            
            if (count > 0) {
                const sample = await db.collection(name).findOne({});
                console.log(`  Sample Keys: ${Object.keys(sample).join(', ')}`);
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

auditProCollections();
