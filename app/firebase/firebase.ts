// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getDatabase } from "firebase/database";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBb0D8eDQlWi7OFkazvKUlGq00HoxN4rH0",
  authDomain: "linechecks-8a929.firebaseapp.com",
  databaseURL: "https://linechecks-8a929-default-rtdb.firebaseio.com",
  projectId: "linechecks-8a929",
  storageBucket: "linechecks-8a929.firebasestorage.app",
  messagingSenderId: "821457221553",
  appId: "1:821457221553:web:f58a4e7e7ba23191ce6f90",
  measurementId: "G-48ZV7SFXGV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
