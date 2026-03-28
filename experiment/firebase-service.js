// Firebase Service — initialises the app and exposes window.saveParticipantData
// All experiment pages include this file. It degrades gracefully if the config
// has not been filled in (local dev mode).
(function () {
  const cfg = window.FIREBASE_CONFIG;

  if (!cfg || cfg.apiKey === 'YOUR_API_KEY') {
    console.warn('[Firebase] Config not set — data will only be saved locally.');
    window.saveParticipantData = function () { return Promise.resolve(); };
    return;
  }

  try {
    const app = firebase.initializeApp(cfg);
    const db = firebase.firestore(app);

    // saveParticipantData(participantId, field, data)
    // Merges { [field]: data } into participants/{participantId}.
    // Safe to call multiple times — later calls add fields without overwriting others.
    window.saveParticipantData = function (participantId, field, data) {
      if (!participantId) return Promise.resolve();
      const payload = {};
      payload[field] = data;
      return db.collection('participants').doc(participantId)
        .set(payload, { merge: true })
        .catch(function (err) {
          console.error('[Firebase] Save error for field "' + field + '":', err);
        });
    };

    console.log('[Firebase] Ready. Project:', cfg.projectId);
  } catch (e) {
    console.error('[Firebase] Initialisation failed:', e);
    window.saveParticipantData = function () { return Promise.resolve(); };
  }
}());
