const mongoose = require('mongoose');

async function syncRoles() {
    const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
    const DBs = ["fivenursing_dev", "fivenursing_pro"];
    
    try {
        console.log("Connecting to source DB (test)...");
        const sourceConn = await mongoose.createConnection(`${BASE_URI}test?retryWrites=true&w=majority`);
        const roles = await sourceConn.db.collection('roles').find({}).toArray();
        console.log(`Found ${roles.length} roles in test db.`);
        await sourceConn.close();

        for (const dbName of DBs) {
            console.log(`\nConnecting to target DB (${dbName})...`);
            const targetConn = await mongoose.createConnection(`${BASE_URI}${dbName}?retryWrites=true&w=majority`);
            const collection = targetConn.db.collection('roles');
            
            for (const role of roles) {
                const cleaned = { ...role };
                delete cleaned._id;
                await collection.updateOne(
                    { key: role.key },
                    { $set: cleaned },
                    { upsert: true }
                );
            }
            console.log(`Successfully synced ${roles.length} roles to ${dbName}.`);
            await targetConn.close();
        }

        console.log("\nAll databases are now up-to-date with roles.");
        process.exit(0);
    } catch (e) { 
        console.error("An error occurred during sync:", e);
        process.exit(1);
    }
}

syncRoles();
