const mongoose = require('mongoose');
async function check() {
    const conn = await mongoose.createConnection("mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_pro?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true });
    const cols = await conn.db.listCollections().toArray();
    console.log("Collections:", cols.map(c => c.name));
    for (let c of ['mall_items', 'mallitems']) {
        const count = await conn.db.collection(c).countDocuments();
        console.log(`${c} count: ${count}`);
    }
    process.exit(0);
}
check();
