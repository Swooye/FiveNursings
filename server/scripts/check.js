const mongoose = require('mongoose');
async function run() {
    const conn = await mongoose.createConnection("mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_pro?retryWrites=true&w=majority");
    const items = await conn.db.collection('mall_items').find({}).toArray();
    console.log(JSON.stringify(items, null, 2));
    process.exit(0);
}
run();
