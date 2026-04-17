const mongoose = require('mongoose');

async function check() {
    const uri = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
    const params = "?retryWrites=true&w=majority";
    const dbs = ["fivenursing_dev", "fivenursing_pro"];

    for (const db of dbs) {
        console.log(`Checking ${db}...`);
        const conn = await mongoose.createConnection(`${uri}${db}${params}`, { useNewUrlParser: true, useUnifiedTopology: true });
        const collections = await conn.db.listCollections().toArray();
        for (const col of collections) {
            const count = await conn.db.collection(col.name).countDocuments();
            console.log(`  ${col.name}: ${count}`);
        }
        await conn.close();
    }
    process.exit(0);
}

check();
