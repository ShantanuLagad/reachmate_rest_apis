// Firebase.js
var admin = require("firebase-admin");
// var serviceAccount = require("../reachmate-ac63c-firebase-adminsdk-144sn-399fa3af37.json");
var serviceAccount = require("../reachmate-77453-firebase-adminsdk-vj344-9d40d54904.json");


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// module.exports = db;

module.exports = {
    db : db,
    admin : admin,
};