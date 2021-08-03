import firebase from "firebase/app"
import "firebase/auth"
import 'firebase/storage'
import 'firebase/firestore'

firebase.initializeApp(
    {
        apiKey: "AIzaSyAKlLIufUjF3RW-bPKaf3sHhFqNK5GVUN0",
        authDomain: "fir-b2183.firebaseapp.com",
        projectId: "fir-b2183",
        storageBucket: "fir-b2183.appspot.com",
        messagingSenderId: "263511883399",
        appId: "1:263511883399:web:b9d8b88b06ebaf97d00222"
      }
)

export const auth = firebase.auth();
const firestore = firebase.firestore();
export const database ={
    Emails:firestore.collection('Emails'),
    posts:firestore.collection('posts'),
    getCurrentTimeStamp : firebase.firestore.FieldValue.serverTimestamp
}
export const storage = firebase.storage();
// export default firebase;