import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';

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

async function run() {
    try {
        console.log('Searching for 100 CRC testing product...');
        const q = query(
            collection(db, 'products'),
            where('price', '==', 100)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log('No testing product found with price 100.');
            process.exit(0);
        }

        for (const document of querySnapshot.docs) {
            console.log(`Found product: ${document.data().name} (ID: ${document.id})`);
            // We will set isActive to false just to be safe, instead of hard deleting
            await updateDoc(doc(db, 'products', document.id), {
                isActive: false,
                isTestProduct: true
            });
            console.log(`Product ${document.id} deactivated.`);
        }
        
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

run();
