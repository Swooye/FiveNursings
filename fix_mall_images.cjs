const mongoose = require('mongoose');

async function fix() {
    const uri = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
    const params = "?retryWrites=true&w=majority";
    const dbs = ["fivenursing_dev", "fivenursing_pro"];

    for (const dbName of dbs) {
        console.log(`\n--- Processing ${dbName} ---`);
        const conn = await mongoose.createConnection(`${uri}${dbName}${params}`, { useNewUrlParser: true, useUnifiedTopology: true });
        
        // 1. 处理 mall_items 集合
        const col = conn.db.collection('mall_items');
        const items = await col.find({}).toArray();
        console.log(`  Found ${items.length} items in mall_items.`);
        
        for (const item of items) {
            let url = item.imageUrl || item.image || "";
            let originalUrl = url;
            
            // 转换为相对路径
            if (url.includes('/uploads/')) {
                url = '/uploads/' + url.split('/uploads/')[1];
            }
            
            if (url !== originalUrl) {
                console.log(`    Fixed URL: ${originalUrl} -> ${url}`);
            }
            
            await col.updateOne({ _id: item._id }, { $set: { imageUrl: url, status: 'on_sale' } });
        }

        // 2. 处理 mallitems (无下划线) 集合，合并到 mall_items
        const altCol = conn.db.collection('mallitems');
        const altItems = await altCol.find({}).toArray();
        if (altItems.length > 0) {
            console.log(`  Found ${altItems.length} items in mallitems. Merging...`);
            for (const item of altItems) {
                let url = item.imageUrl || item.image || "";
                if (url.includes('/uploads/')) url = '/uploads/' + url.split('/uploads/')[1];
                
                // 检查是否已存在
                const exists = await col.findOne({ name: item.name });
                if (!exists) {
                    const newItem = { ...item, imageUrl: url, status: 'on_sale' };
                    delete newItem._id;
                    await col.insertOne(newItem);
                    console.log(`    Merged: ${item.name}`);
                }
            }
            // 可选：清空旧集合
            // await altCol.deleteMany({});
        }
        
        await conn.close();
    }
    console.log("\nDone!");
    process.exit(0);
}

fix();
