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

async function checkCoupons() {
    try {
        console.log("Checking for orphaned coupons...");
        // First, check for null generatedBy
        const q = query(
            collection(db, "coupons"),
            orderBy("createdAt", "desc"),
            limit(10)
        );
        
        const snap = await getDocs(q);
        console.log(`Found ${snap.size} recent coupons:`);
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`- ID: ${doc.id}, Code: ${data.code}, Desc: ${data.description}, GenBy: ${data.generatedBy}, Created: ${data.createdAt?.toDate?.() || data.createdAt}`);
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

checkCoupons();
