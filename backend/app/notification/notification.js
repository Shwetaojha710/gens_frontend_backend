var admin = require("firebase-admin");


var serviceAccount = require("../notification/notification.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



module.exports = admin


