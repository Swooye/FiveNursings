const mongoose = require('mongoose');

async function syncProtocols() {
    const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
    try {
        const sourceConn = await mongoose.createConnection(BASE_URI + "test?retryWrites=true&w=majority");
        const targetConn = await mongoose.createConnection(BASE_URI + "fivenursing_pro?retryWrites=true&w=majority");
        
        const protocols = await sourceConn.db.collection('protocols').find({}).toArray();
        console.log(`Found ${protocols.length} protocols in test db.`);

        for (const p of protocols) {
            const cleaned = { ...p };
            delete cleaned._id;
            await targetConn.db.collection('protocols').updateOne(
                { key: p.key },
                { $set: cleaned },
                { upsert: true }
            );
        }
        console.log("Protocols synced to Pro successfully.");
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}
syncProtocols();
