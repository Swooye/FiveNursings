const mongoose = require('mongoose');

async function auditProd() {
    const PROD_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_pro?retryWrites=true&w=majority";
    try {
        await mongoose.connect(PROD_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = mongoose.connection.db;
        const users = await db.collection('users').find({}).toArray();

        console.log(`\n=== PRO DATABASE AUDIT (Count: ${users.length}) ===`);
        users.forEach(u => {
            console.log(`ID: ${u._id}`);
            console.log(`  UID:      [${u.firebaseUid}]`);
            console.log(`  Phone:    [${u.phoneNumber}]`);
            console.log(`  Nickname: [${u.nickname}]`);
            console.log(`  Name:     [${u.name}]`);
            console.log(`  Status:   ProfileComplete=${u.isProfileComplete}`);
            console.log("-----------------------------------------");
        });

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}
auditProd();
