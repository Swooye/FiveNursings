const mongoose = require('mongoose');

async function sync() {
    const uri = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_pro?retryWrites=true&w=majority";
    const conn = await mongoose.createConnection(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    
    console.log("Syncing mall_items to mallitems...");
    const source = conn.db.collection('mall_items');
    const target = conn.db.collection('mallitems');
    
    const items = await source.find({}).toArray();
    if (items.length > 0) {
        // Clear target to avoid duplicates
        await target.deleteMany({});
        await target.insertMany(items);
        console.log(`Synced ${items.length} items.`);
    }

    await conn.close();
    process.exit(0);
}

sync();
