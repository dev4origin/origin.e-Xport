import fetch from 'node-fetch';
import fs from 'fs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASE = 'https://www.conseilcafecacao.ci:8088';
const basicAuth = Buffer.from('saigic:saigic').toString('base64');

const r = await fetch(`${BASE}/Scripts/public/saigic.tools.core.js`, {
    headers: { 'Authorization': `Basic ${basicAuth}` }
});
const js = await r.text();
fs.writeFileSync('debug_saigic_core.js', js);
console.log('Saved', js.length, 'chars');

// Extract all URL patterns
const urls = [...js.matchAll(/url\s*:\s*['"]([^'"]+)['"]/gi)].map(m => m[1]);
console.log('\n=== ALL API URLs ===');
urls.forEach(u => console.log(' ', u));

// Find ShowEtatReception or AfficherEtat references
console.log('\n=== ShowEtatReception context ===');
const showIdx = js.indexOf('ShowEtatReception');
if (showIdx >= 0) {
    console.log(js.substring(Math.max(0, showIdx - 300), showIdx + 500));
}

console.log('\n=== AfficherEtat context ===');
const affIdx = js.indexOf('AfficherEtat');
if (affIdx >= 0) {
    console.log(js.substring(Math.max(0, affIdx - 300), affIdx + 500));
}

// Find fpbChargerComboListeDesEtats
console.log('\n=== fpbChargerComboListeDesEtats ===');
const funcIdx = js.indexOf('fpbChargerComboListeDesEtats');
if (funcIdx >= 0) {
    console.log(js.substring(funcIdx, funcIdx + 800));
}
