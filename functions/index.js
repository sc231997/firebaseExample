const functions = require('firebase-functions');
const firebase = require('firebase-admin');
const express = require('express');

const app = express();
// using json parser
app.use(express.json())

const firebaseApp = firebase.initializeApp(
  functions.config().firebase
);

function getUsers() {
  const users = firebaseApp.database().ref('users');
  return users.once('value').then(snap => snap.val())
}

function setUser(data){
  const users = firebaseApp.database().ref('users');
  return users.update(data);
}

app.get('/users', (request, response) => {
  getUsers().then(data => {
    return response.send(data);
  }).catch(err =>{
    console.error(err);
  });
});

app.post('/users',(request, response) => {
  setUser(request.body).then(data => {
    return response.send('success!');
  }).catch(err =>{
    console.error(err);
  });
});

exports.app = functions.https.onRequest(app);
