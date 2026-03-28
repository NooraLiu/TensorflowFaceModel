import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

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
    '  node scripts/export-trials-csv.mjs --in exports/participants.json --out exports/trials.csv [--surveyOut exports/surveys.csv]',
    '',
    'Example:',
    '  node scripts/export-trials-csv.mjs --in exports/participants.json --out exports/trials.csv --surveyOut exports/surveys.csv'
  ].join('\n'));
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function writeCsv(filePath, headers, rows) {
  const lines = [];
  lines.push(headers.map(csvEscape).join(','));
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

function numberOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function flattenTrials(documents) {
  const rows = [];
  for (const doc of documents) {
    const participantId = doc.id || doc.participantId || doc?.consent?.participantId || '';

    const trialBuckets = [
      { key: 'trials_mouse_only', condition: 'mouse-only' },
      { key: 'trials_head_mouse', condition: 'head-mouse' }
    ];

    for (const bucket of trialBuckets) {
      const trials = Array.isArray(doc[bucket.key]) ? doc[bucket.key] : [];
      for (const trial of trials) {
        rows.push({
          participantId,
          condition: trial.condition || bucket.condition || '',
          trialIndex: numberOrNull(trial.trialIndex),
          stage: trial.stage || '',
          mode: trial.mode || '',
          reason: trial.reason || '',
          elapsedMs: numberOrNull(trial.elapsedMs),
          elapsedSec: numberOrNull(trial.elapsedMs) === null ? null : (Number(trial.elapsedMs) / 1000).toFixed(3),
          hiddenFoundCount: numberOrNull(trial.hiddenFoundCount),
          hiddenTotalCount: numberOrNull(trial.hiddenTotalCount),
          positionError: numberOrNull(trial.positionError),
          cameraErrorDeg: numberOrNull(trial.cameraErrorDeg),
          totalRepositions: numberOrNull(trial.totalRepositions),
          repositionCounts: Array.isArray(trial.repositionCounts) ? JSON.stringify(trial.repositionCounts) : ''
        });
      }
    }
  }
  return rows;
}

function flattenSurveys(documents) {
  const rows = [];
  for (const doc of documents) {
    const participantId = doc.id || doc.participantId || doc?.consent?.participantId || '';

    const entries = [
      { key: 'survey_mouse_only', label: 'mouse-only' },
      { key: 'survey_head_mouse', label: 'head-mouse' },
      { key: 'survey_final', label: 'final' }
    ];

    for (const entry of entries) {
      const s = doc[entry.key];
      if (!s || typeof s !== 'object') continue;

      const ratings = s?.nasaTlx?.ratings || {};
      const usabilityItems = Array.isArray(s?.usability?.itemResponses) ? s.usability.itemResponses : [];
      const comparisons = s?.comparisons || {};

      rows.push({
        participantId,
        surveyType: entry.label,
        surveyCondition: s.condition || '',
        timestampIso: s.timestampIso || '',
        nasaRawScore: numberOrNull(s?.nasaTlx?.rawScore),
        nasaMental: numberOrNull(ratings.mental),
        nasaPhysical: numberOrNull(ratings.physical),
        nasaTemporal: numberOrNull(ratings.temporal),
        nasaPerformance: numberOrNull(ratings.performance),
        nasaEffort: numberOrNull(ratings.effort),
        nasaFrustration: numberOrNull(ratings.frustration),
        usabilityScore: numberOrNull(s?.usability?.score),
        usabilityComplete: s?.usability?.complete ?? '',
        usabilityItem1: numberOrNull(usabilityItems[0]),
        usabilityItem2: numberOrNull(usabilityItems[1]),
        usabilityItem3: numberOrNull(usabilityItems[2]),
        usabilityItem4: numberOrNull(usabilityItems[3]),
        usabilityItem5: numberOrNull(usabilityItems[4]),
        usabilityItem6: numberOrNull(usabilityItems[5]),
        usabilityItem7: numberOrNull(usabilityItems[6]),
        usabilityItem8: numberOrNull(usabilityItems[7]),
        comparisonsComplete: s?.comparisonsComplete ?? '',
        cmpControl: numberOrNull(comparisons.control),
        cmpPrecision: numberOrNull(comparisons.precision),
        cmpIntuitive: numberOrNull(comparisons.intuitive),
        cmpLearnability: numberOrNull(comparisons.learnability),
        cmpEfficiency: numberOrNull(comparisons.efficiency),
        cmpComfort: numberOrNull(comparisons.comfort),
        cmpFatigue: numberOrNull(comparisons.fatigue),
        cmpConfidence: numberOrNull(comparisons.confidence),
        cmpSpatialClarity: numberOrNull(comparisons.spatialClarity),
        overallPreference: s?.overallPreference || '',
        preferenceReason: s?.preferenceReason || '',
        likedMouseOnly: s?.likedMouseOnly || '',
        likedHeadMouse: s?.likedHeadMouse || '',
        improvements: s?.improvements || '',
        comments: s?.comments || '',
        background3dHoursPerWeek: s?.background3d?.hoursPerWeek || '',
        background3dTools: s?.background3d?.tools || ''
      });
    }
  }
  return rows;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    usage();
    return;
  }

  const inputPath = path.resolve(args.in || 'exports/participants.json');
  const outputPath = path.resolve(args.out || 'exports/trials.csv');
  const surveyOutPath = path.resolve(args.surveyOut || 'exports/surveys.csv');

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const documents = Array.isArray(raw.documents) ? raw.documents : [];

  const trialRows = flattenTrials(documents);
  const trialHeaders = [
    'participantId',
    'condition',
    'trialIndex',
    'stage',
    'mode',
    'reason',
    'elapsedMs',
    'elapsedSec',
    'hiddenFoundCount',
    'hiddenTotalCount',
    'positionError',
    'cameraErrorDeg',
    'totalRepositions',
    'repositionCounts'
  ];
  writeCsv(outputPath, trialHeaders, trialRows);

  const surveyRows = flattenSurveys(documents);
  const surveyHeaders = [
    'participantId',
    'surveyType',
    'surveyCondition',
    'timestampIso',
    'nasaRawScore',
    'nasaMental',
    'nasaPhysical',
    'nasaTemporal',
    'nasaPerformance',
    'nasaEffort',
    'nasaFrustration',
    'usabilityScore',
    'usabilityComplete',
    'usabilityItem1',
    'usabilityItem2',
    'usabilityItem3',
    'usabilityItem4',
    'usabilityItem5',
    'usabilityItem6',
    'usabilityItem7',
    'usabilityItem8',
    'comparisonsComplete',
    'cmpControl',
    'cmpPrecision',
    'cmpIntuitive',
    'cmpLearnability',
    'cmpEfficiency',
    'cmpComfort',
    'cmpFatigue',
    'cmpConfidence',
    'cmpSpatialClarity',
    'overallPreference',
    'preferenceReason',
    'spatialUnderstanding',
    'likedMouseOnly',
    'likedHeadMouse',
    'improvements',
    'comments',
    'background3dHoursPerWeek',
    'background3dTools'
  ];
  writeCsv(surveyOutPath, surveyHeaders, surveyRows);

  console.log(`Trial CSV written: ${outputPath}`);
  console.log(`Trial rows: ${trialRows.length}`);
  console.log(`Survey CSV written: ${surveyOutPath}`);
  console.log(`Survey rows: ${surveyRows.length}`);
}

try {
  main();
} catch (error) {
  console.error('CSV export failed:', error.message);
  process.exitCode = 1;
}
