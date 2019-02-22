const functions = require('firebase-functions');
const firebase = require('firebase-admin');
const express = require('express');

const app = express();
// using json parser
app.use(express.json());

const firebaseApp = firebase.initializeApp(
  functions.config().firebase
);

// Cloud Firestore object
const db = firebaseApp.firestore();

// Helper functions

function getUsers() {
  const users = firebaseApp.database().ref('users');
  return users.once('value').then(snap => snap.val())
}

function setUser(data) {
  const users = firebaseApp.database().ref('users');
  return users.update(data);
}

// API Definations

app.get('/users', (request, response) => {
  getUsers().then(data => {
    return response.send(data);
  }).catch(err => {
    console.error(err);
  });
});

app.post('/users', (request, response) => {
  setUser(request.body).then(data => {
    return response.send('success!');
  }).catch(err => {
    console.error(err);
  });
});

// Helper functions for demo

function generateAuthToken(uid) {
  return db.collection('users').doc(uid)
    .set({
      __token: (new Date).valueOf().toString(36)
    }, {merge: true});
}

function verifyAuthToken(uid, __token) {
  return db.collection('users').doc(uid).get().then((snap) => {
    const snapData = objectToJSON(snap.data());
    if (snapData['__token'] === __token)
      return true;
    return false;
  });
}

function objectToJSON(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Aadhar Demo APIs

app.post('/login', (request, response) => {
  const uid = request.body['uid'];
  const passwd = request.body['passwd'];
  var docRef = db.collection('users').doc(uid);
  docRef.get().then((doc) => {
    if (doc.exists) {
      const userData = objectToJSON(doc.data());
      if (userData['passwd'] === passwd) {
        return generateAuthToken(uid).then(() => {
          return db.collection('users').doc(uid).get().then((snap) => {
            let snapData = objectToJSON(snap.data());
            delete snapData['passwd'];
            return response.send(snapData);
          })
        })
      }
    }
    return response.send(400, "No such user found.");
  }).catch((error) => {
    console.log(error);
  })
});

app.post('/allAccounts', (request, response) => {
  const uid = request.body['uid'];
  const __token = request.body['__token'];
  db.collection('users').doc(uid).get().then((doc) => {
    if (doc.exists) {
      return verifyAuthToken(uid, __token).then((isAuth) => {
        if (isAuth) {
          return db.collection('accounts')
            .get()
            .then((accounts) => {
              let data = [];
              accounts.forEach((account) => {
                data.push(account.data()['account_no']);
              });
              return response.send(data);
            });
        }
        return response.sendStatus(401);
      });
    }
    return response.send(400, "No such user found");
  }).catch((error) => {
    console.log(error);
  })
});

app.post('/accounts', (request, response) => {
  const uid = request.body['uid'];
  const __token = request.body['__token'];
  db.collection('users').doc(uid).get().then((doc) => {
    if (doc.exists) {
      return verifyAuthToken(uid, __token).then((isAuth) => {
        if (isAuth) {
          return db.collection('accounts').where('uid', '==', uid)
            .get()
            .then((accounts) => {
              let data = [];
              accounts.forEach((account) => {
                data.push(account.data()['account_no']);
              });
              return response.send(data);
            });
        }
        return response.sendStatus(401);
      });
    }
    return response.send(400, "No such user found.");
  }).catch((error) => {
    console.log(error);
  })
});

app.post('/transaction', (request, response) => {
  const uid = request.body['uid'];
  const passwd = request.body['passwd'];
  db.collection('users').doc(uid)
    .get()
    .then((doc) => {
      if (doc.exists) {
        let userData = JSON.stringify(doc.data());
        userData = JSON.parse(userData);
        if (userData['passwd'] === passwd) {
          return db.collection('accounts').where('uid', '==', uid)
            .get()
            .then((accounts) => {
              let data = [];
              accounts.forEach((account) => {
                data.push(account.data()['account_no']);
              });
              return response.send(data);
            });
        }
      }
      return response.send(400, "No such user found.");
    }).catch((error) => {
    console.log(error);
  })
});

exports.app = functions.https.onRequest(app);
