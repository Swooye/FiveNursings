const mongoose = require('mongoose');

async function dump() {
    const uri = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_pro?retryWrites=true&w=majority";
    const conn = await mongoose.createConnection(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const col = conn.db.collection('mall_items');
    const items = await col.find({}).toArray();
    console.log(JSON.stringify(items, null, 2));
    await conn.close();
    process.exit(0);
}

dump();
