const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('OK'));
app.listen(3002, () => console.log('Minimal server on 3002'));
