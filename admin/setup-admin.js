
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = 'admin@example.com';
const password = '123789';

admin.auth().createUser({
  email: email,
  password: password,
  displayName: 'Admin'
})
.then((userRecord) => {
  console.log('Successfully created new user:', userRecord.uid);
})
.catch((error) => {
  console.log('Error creating new user:', error);
});
