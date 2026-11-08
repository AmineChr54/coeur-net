// Cœur Net — assemblage
// Usage : node build.mjs
//  src/*.html (hors _*) -> dist/*.html, inclusions <!-- @include x --> résolues,
//  en-tête commun (manifest, icône, couleur) injecté avant </head> ; static/* copié tel quel.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src'), stat = join(root, 'static'), dist = join(root, 'dist');
const read = (p) => readFileSync(p, 'utf8');

function resolveIncludes(html) {
  return html.replace(/<!--\s*@include\s+([\w.-]+)\s*-->/g, (_, name) => {
    const body = read(join(src, name));
    if (name.endsWith('.css')) return `<style>\n${body}\n</style>`;
    if (name.endsWith('.js')) return `<script>\n${body.replace(/<\/script/gi, '<\\/script')}\n</script>`;
    return body;
  });
}
const HEAD = `<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
<meta name="theme-color" content="#b8233a">
<meta name="mobile-web-app-capable" content="yes">
<meta name="description" content="Cœur Net — outils de cardiologie gratuits pour les cardiologues tunisiens : fonction diastolique, écho, consentement, décision partagée, éducation, scores, quiz.">
`;

mkdirSync(dist, { recursive: true });
// vider sans supprimer le dossier (un serveur local peut le tenir ouvert)
for (const f of readdirSync(dist)) rmSync(join(dist, f), { recursive: true, force: true });
const pages = readdirSync(src).filter((f) => f.endsWith('.html') && !f.startsWith('_')).sort();
const hash = createHash('sha1');
for (const f of pages) {
  let out = resolveIncludes(read(join(src, f)));
  if (!out.includes('rel="manifest"')) out = out.replace('</head>', HEAD + '</head>');
  writeFileSync(join(dist, f), out);
  hash.update(out);
  console.log('  ✓', f.padEnd(22), (Buffer.byteLength(out) / 1024).toFixed(0).padStart(5), 'Ko');
}
if (existsSync(stat)) for (const f of readdirSync(stat)) {
  if (f === 'sw.js') continue;
  copyFileSync(join(stat, f), join(dist, f));
  hash.update(readFileSync(join(stat, f)));
}
// Service worker : la liste des fichiers et la version du cache sont générées ici
const files = readdirSync(dist).filter((f) => !f.startsWith('.'));
const sw = read(join(stat, 'sw.js'))
  .replace('__VERSION__', hash.digest('hex').slice(0, 10))
  .replace('__FILES__', JSON.stringify(['./', ...files]));
writeFileSync(join(dist, 'sw.js'), sw);
writeFileSync(join(dist, '.nojekyll'), '');
console.log('  ✓ static + sw.js →', 'dist/');
