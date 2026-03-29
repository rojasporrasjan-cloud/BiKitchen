import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD6ZUpIYtXhTFp9lZGZgLX4mPp959H0PCo",
    authDomain: "bikitchen-food.firebaseapp.com",
    projectId: "bikitchen-food",
    storageBucket: "bikitchen-food.firebasestorage.app",
    messagingSenderId: "281700974825",
    appId: "1:281700974825:web:0b45828ccc7745b340b078"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkLoyalty() {
    try {
        console.log("Checking loyalty history for redemptions around 16:37...");
        const q = collection(db, "loyalty");
        const snap = await getDocs(q);
        
        snap.forEach(doc => {
            const data = doc.data();
            const history = data.history || [];
            history.forEach(entry => {
                if (entry.type === 'redeemed' && entry.points === -500) {
                    console.log(`- User: ${doc.id}, Entry:`, entry);
                }
            });
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

checkLoyalty();
