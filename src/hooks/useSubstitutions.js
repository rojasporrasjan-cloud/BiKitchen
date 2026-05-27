import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

const DEFAULT_SUBSTITUTIONS = {
  proteins: [],
  vegetables: [],
  carbos: [],
};

let cachedSubs = null;
let listeners = [];

// Singleton listener — share one Firestore snapshot across all consumers
function subscribeToSubstitutions(cb) {
  if (cachedSubs !== null) {
    cb(cachedSubs);
  }
  listeners.push(cb);

  // Start the singleton listener on first subscriber
  if (listeners.length === 1) {
    const unsub = onSnapshot(
      doc(db, 'config', 'substitutions'),
      (snap) => {
        const data = snap.exists() ? snap.data() : {};
        cachedSubs = {
          proteins: Array.isArray(data.proteins) ? data.proteins : [],
          vegetables: Array.isArray(data.vegetables) ? data.vegetables : [],
          carbos: Array.isArray(data.carbos) ? data.carbos : [],
        };
        listeners.forEach((fn) => fn(cachedSubs));
      },
      () => {
        // On error fall back to defaults
        cachedSubs = DEFAULT_SUBSTITUTIONS;
        listeners.forEach((fn) => fn(cachedSubs));
      }
    );

    // Store unsub for cleanup (won't be called in production SPA lifecycle, but good practice)
    subscribeToSubstitutions._unsub = unsub;
  }

  return () => {
    listeners = listeners.filter((fn) => fn !== cb);
  };
}

export function useSubstitutions() {
  const [substitutions, setSubstitutions] = useState(cachedSubs || DEFAULT_SUBSTITUTIONS);
  const [loading, setLoading] = useState(cachedSubs === null);

  useEffect(() => {
    const unsub = subscribeToSubstitutions((subs) => {
      setSubstitutions(subs);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { substitutions, loading };
}
