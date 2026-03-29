
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

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

async function checkOrder() {
    console.log("Checking order ORD-5507...");
    const q = query(collection(db, "pedidos"), where("orderNumber", "==", "ORD-5507"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        console.log("Order not found!");
        return;
    }

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Order Data:", JSON.stringify({
            id: doc.id,
            status: data.status,
            paymentStatus: data.paymentStatus,
            paymentConfirmed: data.paymentConfirmed,
            pointsAwarded: data.pointsAwarded,
            total: data.total
        }, null, 2));
    });
}

checkOrder().catch(console.error);
