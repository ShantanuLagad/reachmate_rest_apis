// Firebase.js
var admin = require("firebase-admin");
var serviceAccount = require("../reachmate-ac63c-firebase-adminsdk-144sn-399fa3af37.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// module.exports = db;

module.exports = {
    db : db,
    admin : admin,
};