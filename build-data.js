// Parser: extrai os Jōyō kanji (grade 1-8) do KANJIDIC2 com leituras e
// significados em português (fallback para inglês), gerando kanji-data.js
const fs = require('fs');

const xml = fs.readFileSync('kanjidic2.xml', 'utf8');

// Quebra em blocos <character>...</character>
const blocks = xml.split('<character>').slice(1);
const out = [];

function allMatches(str, re) {
  const res = [];
  let m;
  while ((m = re.exec(str)) !== null) res.push(m[1]);
  return res;
}

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

for (const raw of blocks) {
  const block = raw.split('</character>')[0];

  const litM = block.match(/<literal>(.*?)<\/literal>/);
  if (!litM) continue;
  const literal = litM[1];

  const gradeM = block.match(/<grade>(\d+)<\/grade>/);
  if (!gradeM) continue;
  const grade = parseInt(gradeM[1], 10);
  if (grade < 1 || grade > 8) continue; // somente Jōyō

  const strokeM = block.match(/<stroke_count>(\d+)<\/stroke_count>/);
  const strokes = strokeM ? parseInt(strokeM[1], 10) : null;

  const on = allMatches(block, /<reading r_type="ja_on">(.*?)<\/reading>/g);
  const kun = allMatches(block, /<reading r_type="ja_kun">(.*?)<\/reading>/g);

  const pt = allMatches(block, /<meaning m_lang="pt">(.*?)<\/meaning>/g).map(decode);
  // significados sem atributo m_lang = inglês
  const en = allMatches(block, /<meaning>(.*?)<\/meaning>/g).map(decode);

  out.push({
    k: literal,
    g: grade,
    s: strokes,
    on,
    kun,
    pt,
    en,
  });
}

// Ordena por grade depois por traços para uma progressão natural
out.sort((a, b) => a.g - b.g || (a.s || 0) - (b.s || 0));

const ptCount = out.filter((x) => x.pt.length > 0).length;
console.log(`Jōyō kanji extraídos: ${out.length}`);
console.log(`Com significado em PT: ${ptCount}`);
console.log(`Sem PT (usarão EN): ${out.length - ptCount}`);

const js = 'const KANJI_DATA = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync('kanji-data.js', js);
console.log('kanji-data.js gerado (' + (js.length / 1024).toFixed(0) + ' KB)');
