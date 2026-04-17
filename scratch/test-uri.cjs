const url = require('url');

const uris = [
    "mongodb://admin:5Nursings%2BA@ac-pv5ksts-shard-00-00.k2sadls.mongodb.net:27017,ac-pv5ksts-shard-00-01.k2sadls.mongodb.net:27017,ac-pv5ksts-shard-00-02.k2sadls.mongodb.net:27017/fivenursing_dev?authSource=admin&replicaSet=atlas-5war90-shard-0&retryWrites=true&w=majority&ssl=true",
    "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_dev",
    "mongodb+srv://admin:5Nursings+A@cluster0.k2sadls.mongodb.net/fivenursing_dev",
    "mongodb://admin:5Nursings+A@ac-pv5ksts-shard-00-00.k2sadls.mongodb.net:27017/fivenursing_dev"
];

uris.forEach((uri, i) => {
    try {
        console.log(`Testing URI ${i}...`);
        url.parse(uri);
        console.log(`URI ${i} (Legacy URL.parse): SUCCESS`);
    } catch (e) {
        console.log(`URI ${i} (Legacy URL.parse): FAILED - ${e.message}`);
    }
});
