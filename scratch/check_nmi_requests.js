import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({
  projectId: 'bikitchen-food'
});
const db = getFirestore(app);

async function checkCollection() {
  try {
    const collections = await db.listCollections();
    const collectionNames = collections.map(col => col.id);
    console.log('Collections:', collectionNames);
    if (collectionNames.includes('nmi_requests')) {
      console.log('SUCCESS: Collection nmi_requests exists.');
      const snapshot = await db.collection('nmi_requests').limit(1).get();
      if (!snapshot.empty) {
        console.log('Document found in nmi_requests:', snapshot.docs[0].id);
        console.log('Fields:', Object.keys(snapshot.docs[0].data()));
      } else {
        console.log('Collection exists but is empty.');
      }
    } else {
      console.log('FAILURE: Collection nmi_requests does NOT exist.');
    }
  } catch (error) {
    console.error('Error checking collections:', error.message);
  }
}

checkCollection();
