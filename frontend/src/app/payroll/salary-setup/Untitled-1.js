// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCBII2E72DiTXfMWyRLoQ2JGtz9EZ1TXks",
  authDomain: "gens-7d05d.firebaseapp.com",
  projectId: "gens-7d05d",
  storageBucket: "gens-7d05d.firebasestorage.app",
  messagingSenderId: "683749483987",
  appId: "1:683749483987:web:57fc25532aa7a7030efb26",
  measurementId: "G-DC6RY4EE0K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);