import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function usage() {
  console.log([
    'Usage:',
    '  node scripts/export-firestore.mjs --project <projectId> --serviceAccount <path-to-json> [--collection participants] [--out exports/participants.json]',
    '',
    'Example:',
    '  node scripts/export-firestore.mjs --project experiment-fb083 --serviceAccount service-account-experiment-fb083.json --collection participants --out exports/participants.json'
  ].join('\n'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    usage();
    return;
  }

  const projectId = args.project || process.env.FIREBASE_PROJECT_ID || 'experiment-fb083';
  const collectionName = args.collection || 'participants';
  const serviceAccountPath = args.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!serviceAccountPath) {
    throw new Error('Missing service account path. Pass --serviceAccount <path> or set GOOGLE_APPLICATION_CREDENTIALS.');
  }

  const defaultOut = path.join('exports', `${collectionName}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  const outputPath = args.out || defaultOut;

  const resolvedKeyPath = path.resolve(serviceAccountPath);
  if (!fs.existsSync(resolvedKeyPath)) {
    throw new Error(`Service account file not found: ${resolvedKeyPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(resolvedKeyPath, 'utf8'));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId
    });
  }

  const db = admin.firestore();
  const snapshot = await db.collection(collectionName).get();

  const exportedAtIso = new Date().toISOString();
  const documents = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));

  const payload = {
    projectId,
    collection: collectionName,
    exportedAtIso,
    documentCount: documents.length,
    documents
  };

  const resolvedOut = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
  fs.writeFileSync(resolvedOut, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Export complete: ${resolvedOut}`);
  console.log(`Documents exported: ${documents.length}`);
}

main().catch((error) => {
  console.error('Export failed:', error.message);
  process.exitCode = 1;
});
