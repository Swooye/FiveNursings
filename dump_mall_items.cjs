const mongoose = require('mongoose');

const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_dev?retryWrites=true&w=majority";

async function dumpMallItems() {
    try {
        await mongoose.connect(BASE_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = mongoose.connection.db;
        const items = await db.collection('mall_items').find({}).limit(5).toArray();
        console.log('--- Mall Items Collection Dump ---');
        console.log(JSON.stringify(items, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

dumpMallItems();
