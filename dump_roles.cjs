const mongoose = require('mongoose');

const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_dev?retryWrites=true&w=majority";

async function dumpRoles() {
    try {
        await mongoose.connect(BASE_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = mongoose.connection.db;
        const roles = await db.collection('roles').find({}).toArray();
        console.log('--- Roles Collection Dump ---');
        console.log(JSON.stringify(roles, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

dumpRoles();
