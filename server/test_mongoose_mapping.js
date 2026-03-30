const mongoose = require('mongoose');

const mallItemSchema = new mongoose.Schema({}, { strict: false, collection: 'mall_items' });

async function test() {
    const uri = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_pro?retryWrites=true&w=majority";
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    
    // Check with schema
    const MallItemWithSchema = mongoose.model('MallItemSchema', mallItemSchema);
    const countSchema = await MallItemWithSchema.countDocuments();
    console.log(`Count with schema 'mall_items': ${countSchema}`);

    // Check with default model name 'MallItem' (might pluralize to mallitems)
    try {
        const MallItemDefault = mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }));
        const countDefault = await MallItemDefault.countDocuments();
        console.log(`Count with model 'MallItem' (default): ${countDefault}`);
    } catch (e) { console.log("MallItem model already exists"); }

    await mongoose.disconnect();
    process.exit(0);
}

test();
