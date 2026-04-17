const mongoose = require('mongoose');

async function list() {
    const uri = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/test?retryWrites=true&w=majority";
    const conn = await mongoose.createConnection(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const admin = conn.db.admin();
    const dbs = await admin.listDatabases();
    console.log(JSON.stringify(dbs, null, 2));
    await conn.close();
    process.exit(0);
}

list();
