const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CHARS_DIR = path.join(__dirname, '..', 'characters');
const OUTPUT = path.join(__dirname, 'seed-character-bible.sql');

// Character ID mapping
const ID_MAP = {
  luffy: '6961b4d9-1b3e-4cde-97a9-0e3492a37657',
  zoro: '2f61ce5a-fb78-42fa-9f28-0f6775f7551c',
  nami: '3ea62e57-d0be-42d0-ba0e-dca028c06d36',
  sanji: '42c33d2f-d73c-40eb-bfde-966c11720fd5',
  chopper: '98f03655-a9e1-420b-aec0-5882e03b4330',
  robin: 'c88a3d62-2031-4399-ae00-bf30ecf4e778',
  usopp: '163bcf21-a782-4265-a1d7-baec849db408',
  franky: 'b49cea1c-ae63-4de1-98d2-994282d5929f',
  brook: 'b1002f58-1844-4660-bf87-6aaa2cfc159a',
  jinbe: '677d9b1f-ce47-4aba-870d-cfd50448cf37',
  ace: 'ef8bc43b-1626-4d23-b7e0-4f5e953c14a2',
  hancock: 'fb4630b1-3580-46f7-8ef3-493e1a4d77f7',
  shanks: '98bae076-b740-455b-b70f-d07bf3a31d02',
  yamato: 'b617f554-7946-4856-85b1-5246283c79d3',
  vivi: 'ac833987-e23b-4dfb-bec2-89829986d0c0',
  perona: 'ee7f5f99-33a2-4b02-903b-ee251f37e2a8',
  crocodile: 'cc7872d7-1690-4d26-bc9d-d9e2dbcbc523',
  kaido: '66b4cd51-a49a-4529-991a-cee15daaa2d1',
  law: 'law-character-2026030103300001',
  mihawk: 'mihawk-character-2026030114300001',
  whitebeard: 'whitebeard-character-2026030111300001',
  blackbeard: 'b6dc9544-d371-4639-b798-fd8f565aa911',
  tanjiro: '63045c9d-8961-40be-9327-92ca9a1ee6b7',
  nezuko: '2c0f08fd-0bf5-4c20-b4e9-832fd9d12a86',
  zenitsu: '61c39e8d-5454-4a6a-9907-cffbf79485d7',
  inosuke: '702d3d05-9fcc-45f0-9bdc-f89f3e4aed60',
  giyu: '2b6e4155-b262-42de-99c5-ee2adb1ff5ad',
  itadori: '988d87ef-4e2d-4412-97da-22e5098333d2',
  fushiguro: '2b9258d5-2748-4862-a7bb-056dd23c5aa5',
  gojo: 'e0e08991-2d42-4de9-a59a-56f840377f87',
  nobara: 'c92932f5-7ded-40e6-ade6-923f4c87546d',
  maki: '504922f4-d747-429b-9f8c-230f9a2831db',
  sena: '87594eea-5f99-45ec-ae5b-1d52f28422fb',
  hiruma: '14f13a70-917d-4ea9-86ca-56ece651d1ca',
  mamori: '841da6a7-1c53-45e5-83c9-963c0cbd98d9',
  kurita: '8a2218bc-49bd-4fc9-a8ec-b2f68a204876',
  monta: '3972eb47-860c-4b9a-974d-145100150650',
  shin: 'ab5fa459-b4e7-46ef-a25d-397961f174a4',
  suzuna: 'b11500a1-d897-4c1b-b910-bf7d50a5aafd',
  agon: 'beeafa27-c252-4903-9cd1-d31c270d9102',
};

function uid() {
  return crypto.randomUUID();
}

function esc(s) {
  if (s == null) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function escJson(obj) {
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
}

function getSection(text, heading) {
  // Find section by heading (## heading)
  const regex = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*\\n`, 'mi');
  const match = text.match(regex);
  if (!match) return '';
  const start = match.index + match[0].length;
  // Find next ## heading
  const nextH2 = text.indexOf('\n## ', start);
  return nextH2 === -1 ? text.slice(start).trim() : text.slice(start, nextH2).trim();
}

function extractField(text, fieldName) {
  const regex = new RegExp(`\\*\\*${fieldName}\\*\\*:\\s*(.+)`, 'i');
  const m = text.match(regex);
  return m ? m[1].trim() : null;
}

function extractPersonalityDNA(section) {
  const axes = {};
  const rows = section.match(/\|[^|]+\|[^|]+\|[^|]+\|/g) || [];
  for (const row of rows) {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 3 && cells[0] !== 'パラメータ' && cells[0] !== '---') {
      const name = cells[0];
      const val = cells[1];
      const numMatch = val.match(/(\d+)/);
      if (numMatch) {
        axes[name] = parseInt(numMatch[1]);
      }
    }
  }
  return axes;
}

function extractEmotionalTriggers(text) {
  const section = getSection(text, 'Emotional Triggers') || getSection(text, 'Emotional Signatures');
  if (!section) return {};
  const triggers = {};
  const subsections = section.split(/^###\s+/m).filter(Boolean);
  for (const sub of subsections) {
    const lines = sub.split('\n');
    const title = lines[0].trim().replace(/[（(].*[）)]/, '').trim();
    const items = lines.slice(1).filter(l => l.trim().startsWith('-') || l.trim().startsWith('1.')).map(l => l.replace(/^[\s\-\d.]+/, '').trim());
    if (title && items.length > 0) {
      triggers[title] = items;
    }
  }
  return triggers;
}

function extractVoiceEmotionTable(section) {
  const rows = section.match(/\|[^|]+\|[^|]+\|[^|]+\|/g) || [];
  const examples = [];
  for (const row of rows) {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 3 && cells[0] !== '感情' && cells[0] !== '---' && !cells[0].includes('---')) {
      const emotion = cells[0];
      const pattern = cells[1];
      const example = cells[2];
      if (emotion && example) {
        examples.push(`【${emotion}】${example}`);
      }
    }
  }
  return examples;
}

function extractBoundaries(text) {
  const section = getSection(text, 'Boundaries') || getSection(text, 'Bounds') || getSection(text, 'NG Rules');
  if (!section) return [];
  const boundaries = [];
  const lines = section.split('\n').filter(l => l.trim().startsWith('-') || l.match(/^\d+\.\s/));
  for (const line of lines) {
    const rule = line.replace(/^[\s\-\d.]+/, '').trim();
    if (!rule) continue;
    let category = 'behavior';
    let severity = 'hard';
    if (rule.includes('敬語') || rule.includes('語') || rule.includes('表現') || rule.includes('言葉') || rule.includes('一人称') || rule.includes('弱音') || rule.includes('泣き言')) {
      category = 'speech';
    } else if (rule.includes('AI') || rule.includes('メタ') || rule.includes('キャラクター') || rule.includes('プログラム')) {
      category = 'meta';
    } else if (rule.includes('政治') || rule.includes('宗教') || rule.includes('知識') || rule.includes('センシティブ')) {
      category = 'knowledge';
    }
    boundaries.push({ rule, category, severity });
  }
  return boundaries;
}

function extractCatchphrases(text) {
  const section = getSection(text, 'Catchphrases by Context') || getSection(text, 'Catchphrases');
  if (!section) return [];
  const quotes = [];
  const subsections = section.split(/^###\s+/m).filter(Boolean);
  for (const sub of subsections) {
    const lines = sub.split('\n');
    const contextTitle = lines[0].trim();
    let category = 'general';
    if (contextTitle.includes('挨拶')) category = 'catchphrase';
    else if (contextTitle.includes('怒り')) category = 'emotional';
    else if (contextTitle.includes('悲し') || contextTitle.includes('寄り添い')) category = 'emotional';
    else if (contextTitle.includes('励まし')) category = 'general';
    else if (contextTitle.includes('別れ')) category = 'catchphrase';
    else if (contextTitle.includes('照れ')) category = 'emotional';
    else category = 'catchphrase';

    const numbered = lines.slice(1).filter(l => l.match(/^\d+\.\s/));
    for (const line of numbered) {
      const quoteMatch = line.match(/「([^」]+)」/);
      if (quoteMatch) {
        quotes.push({ quote: quoteMatch[1], context: contextTitle, category });
      }
    }
  }
  // If section has no subsections (like hiruma), extract directly
  if (quotes.length === 0) {
    const lines = section.split('\n').filter(l => l.trim().startsWith('-') || l.match(/^\d+\.\s/));
    for (const line of lines) {
      const quoteMatch = line.match(/「([^」]+)」/);
      if (quoteMatch) {
        quotes.push({ quote: quoteMatch[1], context: 'catchphrase', category: 'catchphrase' });
      }
    }
  }
  return quotes.slice(0, 5); // max 5
}

function extractRelationships(text) {
  const section = getSection(text, 'Relationship Dynamics');
  if (!section) return {};
  const map = {};
  const rows = section.match(/\|[^|]+\|[^|]+\|[^|]+\|/g) || [];
  for (const row of rows) {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 3 && cells[0] !== 'レベル' && !cells[0].includes('---')) {
      map[cells[0]] = { attitude: cells[1], behavior: cells[2] };
    }
  }
  return map;
}

function extractSentenceEndings(voiceSection) {
  const endings = [];
  const endingMatch = voiceSection.match(/語尾[^:：]*[:：]\s*(.+)/);
  if (endingMatch) {
    const parts = endingMatch[1].match(/「([^」]+)」/g) || [];
    for (const p of parts) {
      endings.push(p.replace(/[「」]/g, ''));
    }
  }
  return endings;
}

function extractExclamations(voiceSection) {
  const excl = [];
  const exclMatch = voiceSection.match(/口癖[^:：]*[:：]\s*(.+)/);
  if (exclMatch) {
    const parts = exclMatch[1].match(/「([^」]+)」/g) || [];
    for (const p of parts) {
      excl.push(p.replace(/[「」]/g, ''));
    }
  }
  return excl;
}

function parseCharacter(slug) {
  const soulPath = path.join(CHARS_DIR, slug, 'SOUL.md');
  if (!fs.existsSync(soulPath)) return null;
  const text = fs.readFileSync(soulPath, 'utf-8');
  const charId = ID_MAP[slug];
  if (!charId) return null;

  // Core Identity section
  const coreSection = getSection(text, 'Core Identity');
  const firstPerson = extractField(coreSection, '一人称') || '俺';
  const secondPerson = extractField(coreSection, '二人称') || 'お前';
  const name = extractField(coreSection, '名前') || slug;
  const position = extractField(coreSection, '立場') || '';
  const age = extractField(coreSection, '年齢感') || '';

  // Voice Rules section
  const voiceSection = getSection(text, 'Voice Rules') || getSection(text, '【特別ルール】');
  const sentenceEndings = extractSentenceEndings(voiceSection || coreSection);
  const exclamations = extractExclamations(voiceSection || coreSection);

  // Laugh/anger/sad patterns from emotion matrix
  let laughStyle = null, angryStyle = null, sadStyle = null;
  const laughMatch = (voiceSection || '').match(/笑い方[^:：]*[:：]\s*(.+)/);
  if (laughMatch) laughStyle = laughMatch[1].trim();
  
  // From emotion table
  const emotionTable = extractVoiceEmotionTable(voiceSection || '');
  for (const e of emotionTable) {
    if (e.startsWith('【怒り】') || e.startsWith('【怒り')) angryStyle = angryStyle || e.replace(/【[^】]+】/, '');
    if (e.startsWith('【悲し')) sadStyle = sadStyle || e.replace(/【[^】]+】/, '');
  }

  // Personality DNA
  const pdnSection = getSection(text, 'Personality DNA');
  const personalityAxes = extractPersonalityDNA(pdnSection);

  // Emotional Triggers
  const emotionalPatterns = extractEmotionalTriggers(text);

  // Values
  const valuesSection = getSection(text, 'Values & Beliefs') || getSection(text, 'Values');
  const motivation = valuesSection ? valuesSection.split('\n').filter(l => l.trim().match(/^\d/) || l.trim().startsWith('-')).slice(0, 2).join('; ') : position;

  // Worldview - derive from values + core identity
  const worldview = position || name;

  // Timeline
  const timelinePosition = age || null;

  // Backstory - from Secret/Vulnerability or Memory Anchors
  const secretSection = getSection(text, 'Secret / Vulnerability') || getSection(text, 'Memory Anchors');
  const backstory = secretSection ? secretSection.split('\n').filter(l => l.trim()).slice(0, 3).join(' ') : null;

  // Relationships
  const relationshipMap = extractRelationships(text);

  // Boundaries
  const boundaries = extractBoundaries(text);

  // Catchphrases
  const catchphrases = extractCatchphrases(text);

  // ToneNotes
  const forbiddenMatch = (voiceSection || '').match(/禁止表現[^:：]*[:：]\s*(.+)/);
  const toneNotes = forbiddenMatch ? `禁止: ${forbiddenMatch[1].trim()}` : null;

  // Speech examples from emotion table
  const speechExamples = emotionTable.slice(0, 5);

  // Core identity one-liner
  const coreIdentity = `${name} - ${position}`;

  // Values extraction
  let motivationText = '';
  if (valuesSection) {
    const valLines = valuesSection.split('\n').filter(l => l.trim().match(/^\d+\.|^-/));
    motivationText = valLines.slice(0, 2).map(l => l.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').replace(/\*\*/g, '').trim()).join('; ');
  }
  if (!motivationText) motivationText = position;

  return {
    slug, charId, name, firstPerson, secondPerson,
    sentenceEndings, exclamations, laughStyle, angryStyle, sadStyle,
    toneNotes, speechExamples,
    coreIdentity, motivation: motivationText, worldview: position,
    timelinePosition, backstory,
    relationshipMap, personalityAxes, emotionalPatterns,
    boundaries, catchphrases
  };
}

// Main
const slugs = fs.readdirSync(CHARS_DIR).filter(d => {
  return d !== '_template' && fs.statSync(path.join(CHARS_DIR, d)).isDirectory() && ID_MAP[d];
});

console.log(`Processing ${slugs.length} characters...`);

const sql = [];
sql.push('-- CharacterBible Seed Script');
sql.push('-- Generated: ' + new Date().toISOString());
sql.push('-- Characters: ' + slugs.length);
sql.push('');
sql.push('BEGIN;');
sql.push('');

// Clean existing data
sql.push('-- Clean existing data');
sql.push('DELETE FROM "CharacterQuote";');
sql.push('DELETE FROM "CharacterBoundary";');
sql.push('DELETE FROM "CharacterVoice";');
sql.push('DELETE FROM "CharacterSoul";');
sql.push('');

let voiceCount = 0, soulCount = 0, boundaryCount = 0, quoteCount = 0;

for (const slug of slugs) {
  const data = parseCharacter(slug);
  if (!data) {
    console.log(`  SKIP: ${slug} (no SOUL.md or no ID mapping)`);
    continue;
  }
  console.log(`  OK: ${slug} (${data.name})`);

  const cid = esc(data.charId);

  // CharacterVoice
  sql.push(`-- ${data.name} Voice`);
  sql.push(`INSERT INTO "CharacterVoice" (id, "characterId", "firstPerson", "secondPerson", "sentenceEndings", exclamations, "laughStyle", "angryStyle", "sadStyle", "toneNotes", "speechExamples", locale, "updatedAt") VALUES (`);
  sql.push(`  ${esc(uid())}, ${cid},`);
  sql.push(`  ${esc(data.firstPerson.replace(/[（(].*[)）]/g, '').split('/')[0].trim())},`);
  sql.push(`  ${esc(data.secondPerson.replace(/[（(].*[)）]/g, '').split('/')[0].trim())},`);
  sql.push(`  ${escJson(data.sentenceEndings)},`);
  sql.push(`  ${escJson(data.exclamations)},`);
  sql.push(`  ${esc(data.laughStyle)},`);
  sql.push(`  ${esc(data.angryStyle)},`);
  sql.push(`  ${esc(data.sadStyle)},`);
  sql.push(`  ${esc(data.toneNotes)},`);
  sql.push(`  ${escJson(data.speechExamples)},`);
  sql.push(`  'ja', NOW()`);
  sql.push(`);`);
  sql.push('');
  voiceCount++;

  // CharacterSoul
  sql.push(`-- ${data.name} Soul`);
  sql.push(`INSERT INTO "CharacterSoul" (id, "characterId", "coreIdentity", motivation, worldview, "timelinePosition", backstory, "relationshipMap", "personalityAxes", "emotionalPatterns", "updatedAt") VALUES (`);
  sql.push(`  ${esc(uid())}, ${cid},`);
  sql.push(`  ${esc(data.coreIdentity)},`);
  sql.push(`  ${esc(data.motivation)},`);
  sql.push(`  ${esc(data.worldview)},`);
  sql.push(`  ${esc(data.timelinePosition)},`);
  sql.push(`  ${esc(data.backstory)},`);
  sql.push(`  ${escJson(data.relationshipMap)},`);
  sql.push(`  ${escJson(data.personalityAxes)},`);
  sql.push(`  ${escJson(data.emotionalPatterns)},`);
  sql.push(`  NOW()`);
  sql.push(`);`);
  sql.push('');
  soulCount++;

  // CharacterBoundary
  for (const b of data.boundaries) {
    sql.push(`INSERT INTO "CharacterBoundary" (id, "characterId", rule, category, severity) VALUES (${esc(uid())}, ${cid}, ${esc(b.rule)}, ${esc(b.category)}, ${esc(b.severity)});`);
    boundaryCount++;
  }
  sql.push('');

  // CharacterQuote
  for (let i = 0; i < data.catchphrases.length; i++) {
    const q = data.catchphrases[i];
    sql.push(`INSERT INTO "CharacterQuote" (id, "characterId", quote, context, category, importance, locale) VALUES (${esc(uid())}, ${cid}, ${esc(q.quote)}, ${esc(q.context)}, ${esc(q.category)}, ${10 - i}, 'ja');`);
    quoteCount++;
  }
  sql.push('');
}

sql.push('COMMIT;');
sql.push('');
sql.push(`-- Expected counts: voices=${voiceCount}, souls=${soulCount}, boundaries=${boundaryCount}, quotes=${quoteCount}`);

fs.writeFileSync(OUTPUT, sql.join('\n'), 'utf-8');
console.log(`\nSQL written to ${OUTPUT}`);
console.log(`Voices: ${voiceCount}, Souls: ${soulCount}, Boundaries: ${boundaryCount}, Quotes: ${quoteCount}`);
