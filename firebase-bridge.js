/* Firebase compatibility bridge for the existing single-file game. */
(function () {
  let uid = null;
  let peers = [];
  let party = null;
  let myPresence = {};

  function makeDb(database) {
    return {
      doc(path) {
        const ref = database.ref(path);
        return {
          async get() {
            const snap = await ref.once('value');
            return { exists: snap.exists(), data: () => snap.val() };
          },
          set(value) { return ref.set(value); }
        };
      },
      collection(path) {
        const ref = database.ref(path);
        return {
          onSnapshot(callback, error) {
            const listener = ref.on('value', snap => {
              const data = snap.val() || {};
              callback({ docs: Object.entries(data).map(([id, value]) => ({ id, data: () => value })) });
            }, error);
            return () => ref.off('value', listener);
          }
        };
      }
    };
  }

  function makeRoom(database) {
    const presenceRef = database.ref('presence');
    const eventsRef = database.ref('events').limitToLast(250);
    const listeners = [];
    return {
      peers: () => peers,
      async presence(data) {
        if (!uid) return;
        const ref = database.ref('presence/' + uid);
        if (data && data.uid === null) { await ref.remove(); myPresence = {}; return; }
        const prior = (peers.find(p => p.key === uid) || {}).presence || {};
        const next = Object.assign({}, prior, myPresence, data, { uid, seenAt: firebase.database.ServerValue.TIMESTAMP });
        if (next.party !== undefined) party = next.party;
        myPresence = next;
        await ref.set(next);
        ref.onDisconnect().remove();
      },
      onPeers(callback) {
        const listener = presenceRef.on('value', snap => {
          const value = snap.val() || {};
          peers = Object.entries(value).map(([key, presence]) => ({ key, presence }));
          callback({ peers });
        });
        return () => presenceRef.off('value', listener);
      },
      on(type, callback) {
        // Each subscription should ignore historical events that Firebase emits
        // when attaching child_added, including after returning to the lobby.
        const eventStart = Date.now();
        const listener = eventsRef.on('child_added', snap => {
          const item = snap.val();
          if (!item || item.type !== type || Number(item.at || 0) < eventStart) return;
          callback({ data: item.data || {}, isMe: item.from === uid, eventId: snap.key });
        });
        listeners.push(() => eventsRef.off('child_added', listener));
        return () => eventsRef.off('child_added', listener);
      },
      emit(type, data) {
        return database.ref('events').push({ type, data, from: uid, party, at: Date.now() }).then(() => {
          // Bound retained event history so the public lobby does not grow forever.
          return database.ref('events').limitToLast(251).once('value').then(snap => {
            const entries = Object.entries(snap.val() || {});
            if (entries.length > 250) return Promise.all(entries.slice(0, -250).map(([key]) => database.ref('events/' + key).remove()));
          });
        });
      },
      close() { listeners.splice(0).forEach(off => off()); }
    };
  }

  window.GGBackend = {
    async init() {
      const config = window.GG_FIREBASE_CONFIG;
      if (!config || !config.apiKey || !config.databaseURL) throw new Error('Firebase web config or Realtime Database URL is missing.');
      if (!firebase.apps.length) firebase.initializeApp(config);
      const auth = firebase.auth();
      const result = auth.currentUser ? { user: auth.currentUser } : await auth.signInAnonymously();
      const current = result.user;
      uid = current.uid;
      const database = firebase.database();
      const room = makeRoom(database);
      return { user: { id: async () => uid }, db: makeDb(database), room };
    }
  };
})();
