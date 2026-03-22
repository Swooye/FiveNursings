const mongoose = require('mongoose');

async function fixImageUrls() {
    const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
    const AUTH_PARAMS = "?retryWrites=true&w=majority";
    const TARGET_DBS = ["fivenursing_dev", "fivenursing_pro"];

    try {
        for (const dbName of TARGET_DBS) {
            console.log(`Fixing images in ${dbName}...`);
            const conn = await mongoose.createConnection(`${BASE_URI}${dbName}${AUTH_PARAMS}`, { useNewUrlParser: true, useUnifiedTopology: true });
            const col = conn.db.collection('mall_items');

            const items = await col.find({}).toArray();
            for (const item of items) {
                let imageUrl = item.imageUrl || item.image || "";
                
                // 如果是本地地址，替换为生产环境可访问的地址
                if (imageUrl.includes('localhost:3002')) {
                    imageUrl = imageUrl.replace('http://localhost:3002', 'https://api-u46fik5vcq-uc.a.run.app');
                }
                
                await col.updateOne({ _id: item._id }, { $set: { imageUrl: imageUrl, status: "on_sale" } });
            }
            console.log(`Done for ${dbName}`);
            await conn.close();
        }
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}

fixImageUrls();
