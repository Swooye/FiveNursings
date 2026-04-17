const url = require('url');

const uri = "mongodb://admin:5Nursings%2BA@ac-pv5ksts-shard-00-00.k2sadls.mongodb.net:27017/fivenursing_dev?authSource=admin&replicaSet=atlas-5war90-shard-0&retryWrites=true&w=majority&ssl=true";

try {
    console.log(`Testing Single Host URI...`);
    url.parse(uri);
    console.log(`SUCCESS: Legacy URL.parse handles single host.`);
} catch (e) {
    console.log(`FAILED: ${e.message}`);
}
