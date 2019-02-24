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

function updateBalance(to,from,amount){
  return db.collection('accounts').where('account_no','==',to).get().then((toDocs)=>{
    let toDoc;
    toDocs.forEach((doc)=>{
      toDoc = doc;
    }); 
    console.log(toDoc.id);
    return db.collection('accounts').doc(toDoc.id).update({
      balance: toDoc.data()['balance']+amount
    }).then(()=>{
      return db.collection('accounts').where('account_no','==',from).get().then((fromDocs)=>{
        let fromDoc;
        fromDocs.forEach((doc)=>{
          fromDoc = doc;
        });
        return db.collection('accounts').doc(fromDoc.id).update({
          balance: fromDoc.data()['balance']-amount
        }).then((doc) => doc)
      })
    })
  })
}


function sortByKey(array, key) {
  return array.sort(function(a, b) {
      var x =new Date(a[key].toDate()); var y =new Date(b[key].toDate());
      return ((x < y) ? 1 : ((x > y) ? -1 : 0));
  });
}


function changeDate(array) {
  return array.map(function(v) {
    v.timestamp=new Date(v.timestamp.toDate()).toDateString();

    return v;
  });
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
      return response.sendDate(401);
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
              let data = {accounts : []};
              accounts.forEach((account) => {
                account = objectToJSON(account.data());
                data.accounts.push({account_no: account.account_no});
              });
              return response.send(JSON.stringify(data));
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
                const accountData = objectToJSON(account.data());
                delete accountData['uid']
                data.push(accountData);
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

app.post('/makeTransaction', (request, response) => {
  const uid = request.body['uid'];
  const __token = request.body['__token'];
  const to = request.body['to']*1;
  const from = request.body['from']*1;
  const amount = request.body['amount']*1;
  db.collection('users').doc(uid)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return verifyAuthToken(uid, __token).then((isAuth) => {
          if (isAuth) {
            return updateBalance(to,from,amount).then((a)=>{
              return db.collection('transactions').add({
                to : to,
                from : from,
                amount: amount,
                timestamp: new Date()
              }).then((docId) => {
                return response.send(200,{transactionId: docId.id});
              }).catch((error)=>{
                return response.send(400,error);
              })
            });
          }
          return response.sendStatus(401);
        });
      }
      return response.send(400, "No such user found.");
    }).catch((error) => {
    console.log(error);
  });
});

app.post('/transactionHistory', (request, response) => {
  const uid = request.body['uid'];
  const __token = request.body['__token'];
  const account_no = request.body['account_no']*1;
  db.collection('users').doc(uid)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return verifyAuthToken(uid, __token).then((isAuth) => {
          if (isAuth) {
            let data = { transactions:[] };
            let todata = []
            return db.collection('transactions').where('to','==',account_no).get().then((toDocs)=>{
              toDocs.forEach((toDoc)=>{
                let d=toDoc.data();
                d.amount +=' Credited';
                d.account=d.from;
                todata.push(d);
              });
            }).then(()=>{
              return db.collection('transactions').where('from','==',account_no).get().then((fromDocs)=>{
                let fromdata = []
                fromDocs.forEach((fromDoc)=>{
                  let d=fromDoc.data();
                  d.amount +=' Debited';
                  d.account=d.to;
                  fromdata.push(d);
                });
                data['transactions'] = data['transactions'].concat(todata,fromdata);
                data['transactions'] = sortByKey(data['transactions'],'timestamp');
                data['transactions'] = changeDate(data['transactions']);
                return response.send(data)
              })
            });
            
          }
          return response.sendStatus(401);
        });
      }
      return response.send(400, "No such user found.");
    }).catch((error) => {
    console.log(error);
  });
});

exports.app = functions.https.onRequest(app);
