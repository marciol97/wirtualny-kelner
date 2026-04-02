import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCMduC8CnOXkaxoeqWd6iyvKqPdMMjGAFs",
    authDomain: "wirtualny-kelner-7d473.firebaseapp.com",
    projectId: "wirtualny-kelner-7d473",
    storageBucket: "wirtualny-kelner-7d473.firebasestorage.app",
    messagingSenderId: "160135440633",
    appId: "1:160135440633:web:e1b23e2f0a43a42da25a28"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
