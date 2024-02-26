// Firebase.js
var admin = require("firebase-admin");
var serviceAccount = require("./vibe-3f42f-firebase-adminsdk-4y7jb-49e8405cd8.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// module.exports = db;

module.exports = {
    db : db,
    admin : admin,
};