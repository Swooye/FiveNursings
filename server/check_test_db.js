const mongoose = require('mongoose');

async function check() {
    const uri = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/test?retryWrites=true&w=majority";
    const conn = await mongoose.createConnection(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const collections = await conn.db.listCollections().toArray();
    for (const col of collections) {
        const count = await conn.db.collection(col.name).countDocuments();
        console.log(`  ${col.name}: ${count}`);
    }
    await conn.close();
    process.exit(0);
}

check();
