import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import { getDatabase } from
    "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";


const firebaseConfig = {
    apiKey: "AIzaSyARSe4REc4Om4LuJE_4oo4KCImRmRtkRK4",
    authDomain: "baguga-s-card-game.firebaseapp.com",
    databaseURL: "https://baguga-s-card-game-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "baguga-s-card-game",
    storageBucket: "baguga-s-card-game.firebasestorage.app",
    messagingSenderId: "146068583038",
    appId: "1:146068583038:web:18420090936557613d5e2f"
};


const app = initializeApp(firebaseConfig);

const database = getDatabase(app);


export {
    app,
    database
};