/**
 * CCC Proxy Server for Origin.e-Xport
 * 
 * Petit serveur Express qui gère la double authentification avec le portail
 * SAIGIC du Conseil Café Cacao et télécharge les rapports de réception.
 * 
 * Le serveur CCC bloque les requêtes CORS depuis les navigateurs,
 * donc ce proxy s'exécute côté serveur (pas de CORS).
 * 
 * Usage: node server/ccc-proxy.js
 * Port: 3001
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import * as XLSX from 'xlsx';

const app = express();
const PORT = 3001;
const CCC_BASE = 'https://www.conseilcafecacao.ci:8088';

// IMPORTANT: Le serveur CCC a souvent des problèmes de chaîne de certificats SSL.
// On désactive la vérification pour permettre la connexion depuis Node.js.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.use(cors());
app.use(express.json());

/**
 * POST /api/ccc-proxy/fetch-receptions
 * 
 * Body: {
 *   browser_user, browser_pass,  // HTTP Basic Auth
 *   login_user, login_pass,       // Application Login
 *   date_debut, date_fin,         // DD/MM/YYYY
 *   produit                       // 'CACAO' | 'CAFE'
 * }
 */
app.post('/api/ccc-proxy/fetch-receptions', async (req, res) => {
    const { browser_user, browser_pass, login_user, login_pass, date_debut, date_fin, produit } = req.body;

    console.log(`\n🔄 [CCC Proxy] Fetch request: ${produit} | ${date_debut} → ${date_fin}`);

    try {
        // ===== STEP 1: HTTP Basic Auth + Get Login Page =====
        console.log('🔐 Step 1: HTTP Basic Auth...');

        const basicAuth = Buffer.from(`${browser_user}:${browser_pass}`).toString('base64');
        const loginPageRes = await fetch(`${CCC_BASE}/SGAccount/LogOn`, {
            headers: {
                'Authorization': `Basic ${basicAuth}`,
            },
            redirect: 'manual',
        });

        console.log(`   → Step 1 Status: ${loginPageRes.status} ${loginPageRes.statusText}`);

        // Extract cookies from response
        const cookies = extractCookies(loginPageRes);
        console.log(`   → Cookies obtained: ${Object.keys(cookies).length}`);

        // Get the login page HTML to find the __RequestVerificationToken
        let loginPageHtml = '';
        if (loginPageRes.ok) {
            loginPageHtml = await loginPageRes.text();
            console.log('   → Got login page HTML (200 OK)');
        } else if (loginPageRes.status === 302) {
            // Follow redirect manually with basic auth
            const redirectUrl = loginPageRes.headers.get('location');
            console.log(`   → Redirecting to: ${redirectUrl}`);
            const redirectRes = await fetch(redirectUrl.startsWith('http') ? redirectUrl : `${CCC_BASE}${redirectUrl}`, {
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'Cookie': formatCookies(cookies),
                },
            });
            loginPageHtml = await redirectRes.text();
            Object.assign(cookies, extractCookies(redirectRes));
            console.log(`   → Redirect status: ${redirectRes.status}`);
        }

        // Extract anti-forgery token if present
        const tokenMatch = loginPageHtml.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
        const verificationToken = tokenMatch ? tokenMatch[1] : '';
        console.log(`   → Anti-forgery token found: ${!!verificationToken}`);

        // Extract actual form field names from login page HTML
        const inputFields = [...loginPageHtml.matchAll(/<input[^>]*name="([^"]+)"[^>]*>/gi)]
            .map(m => m[1])
            .filter(n => !n.startsWith('__'));
        console.log(`   → Form fields detected: ${inputFields.join(', ')}`);

        // Detect the actual username/password field names dynamically
        const userFieldCandidates = ['Login', 'UserName', 'login', 'username', 'Email', 'Identifiant'];
        const passFieldCandidates = ['MotDePasse', 'Password', 'motdepasse', 'password', 'Mdp'];
        
        const userField = inputFields.find(f => userFieldCandidates.includes(f)) || 'Login';
        const passField = inputFields.find(f => passFieldCandidates.includes(f)) || 'MotDePasse';
        console.log(`   → Using field names: user="${userField}", pass="${passField}"`);

        // ===== STEP 2: Application Login (POST form) =====
        console.log('🔑 Step 2: Application Login...');

        const loginBody = new URLSearchParams();
        loginBody.append(userField, login_user);
        loginBody.append(passField, login_pass);
        if (verificationToken) {
            loginBody.append('__RequestVerificationToken', verificationToken);
        }
        console.log(`   → Login POST body keys: ${[...loginBody.keys()].join(', ')}`);

        const loginRes = await fetch(`${CCC_BASE}/SGAccount/LogOn`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Cookie': formatCookies(cookies),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: loginBody.toString(),
            redirect: 'manual',
        });

        console.log(`   → Login POST status: ${loginRes.status} ${loginRes.statusText}`);
        
        // Merge cookies from login response
        Object.assign(cookies, extractCookies(loginRes));

        // Follow redirect after login
        if (loginRes.status === 302) {
            const postLoginUrl = loginRes.headers.get('location');
            console.log(`   → Following login redirect to: ${postLoginUrl}`);
            console.log(`   → Cookies before redirect: ${formatCookies(cookies)}`);
            const postLoginRes = await fetch(
                postLoginUrl.startsWith('http') ? postLoginUrl : `${CCC_BASE}${postLoginUrl}`,
                {
                    headers: {
                        'Authorization': `Basic ${basicAuth}`,
                        'Cookie': formatCookies(cookies),
                    },
                }
            );
            Object.assign(cookies, extractCookies(postLoginRes));
            Object.assign(cookies, extractCookies(postLoginRes));
            const hasAuthCookie = !!cookies['.ASPXAUTH'];
            console.log(`   → Final post-login status: ${postLoginRes.status}`);
            console.log(`   → .ASPXAUTH cookie present: ${hasAuthCookie}`);
            console.log(`   → Total cookies: ${Object.keys(cookies).length} → ${Object.keys(cookies).join(', ')}`);
            if (!hasAuthCookie) {
                console.warn('   ⚠️ Login succeeded (302→/) but no .ASPXAUTH cookie — session may not be valid');
            } else {
                console.log('   ✅ Authentication confirmed via .ASPXAUTH cookie');
            }
        } else if (loginRes.status === 200) {
            // 200 means login form was returned again = login failed
            const body = await loginRes.text();
            console.warn(`   ⚠️ Login returned 200 (stayed on login page)`);
            if (body.includes('incorrect') || body.includes('invalide') || body.includes('erreur')) {
                console.warn('   ⚠️ Login credentials rejected by CCC portal');
            }
        } else {
            const body = await loginRes.text();
            console.warn(`   ⚠️ Unexpected login status: ${loginRes.status}`);
        }

        // ===== STEP 3: Fetch Reception Report =====
        console.log('📊 Step 3: Fetching reception report page...');

        // GET the report page to extract form tokens and understand the form structure
        const reportPageRes = await fetch(`${CCC_BASE}/Rapport/EtatReception`, {
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Cookie': formatCookies(cookies),
            },
        });

        Object.assign(cookies, extractCookies(reportPageRes));
        const reportPageHtml = await reportPageRes.text();
        console.log(`   → Report page: ${reportPageRes.status}, ${reportPageHtml.length} chars`);

        // The SAIGIC page uses jQuery Unobtrusive AJAX:
        //   form action="/Rapport/ShowEtatReception?Length=7" data-ajax="true" data-ajax-method="POST"
        //   On success → opens /Rapport/AfficherEtat in new window
        // So the real 2-step flow is:
        //   1. POST /Rapport/ShowEtatReception → generates the report server-side
        //   2. GET /Rapport/AfficherEtat → downloads the generated report

        // Extract the REAL form action from the HTML (action attribute may appear before or after id)
        const formActionMatch = reportPageHtml.match(/<form[^>]*action="([^"]*)"[^>]*id="FormEtatReception"/i) 
            || reportPageHtml.match(/<form[^>]*id="FormEtatReception"[^>]*action="([^"]*)"[^>]*/i);
        const formAction = formActionMatch ? formActionMatch[1] : '/Rapport/ShowEtatReception';
        console.log(`   → Form action URL: ${formAction}`);

        // This form does NOT have a __RequestVerificationToken (only the LogOff form does)

        // Step 3a: Load ddlListeEtat by fetching the saigic.tools.core.js to find the API URL
        // The page JS calls: App.fpbChargerComboListeDesEtats("ddlListeEtat", { vppPrdt: _prdt, vppGroupe: 'RECEPTION' }, false)
        let ddlListeEtat = '';
        const prdt = produit === 'CAFE' ? '1' : '2';
        
        try {
            // First, try to fetch the SAIGIC core JS to find the real API endpoint
            const jsRes = await fetch(`${CCC_BASE}/Scripts/public/saigic.tools.core.js`, {
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'Cookie': formatCookies(cookies),
                },
            });
            
            if (jsRes.ok) {
                const jsCode = await jsRes.text();
                console.log(`   → saigic.tools.core.js: ${jsCode.length} chars`);
                
                // Save JS for offline analysis
                try {
                    const fsSave = await import('fs');
                    fsSave.writeFileSync('debug_saigic_core.js', jsCode);
                } catch(e) {}
                
                // Find the fpbChargerComboListeDesEtats function and its URL
                const listeEtatMatch = jsCode.match(/fpbChargerComboListeDesEtats[\s\S]*?url\s*:\s*['"]([^'"]+)['"]/i)
                    || jsCode.match(/ListeDesEtats[\s\S]*?['"]([^'"]*ListeEtat[^'"]*)['"]/i)
                    || jsCode.match(/ChargerCombo[\s\S]*?ListeEtat[\s\S]*?url\s*:\s*['"]([^'"]+)['"]/i);
                
                if (listeEtatMatch) {
                    console.log(`   → Found ListeDesEtats API URL: ${listeEtatMatch[1]}`);
                }
                
                // Also search for the generic combo loader pattern
                const comboPattern = jsCode.match(/fpbChargerCombo[^{]*\{[\s\S]*?url\s*:\s*['"]([^'"]+)['"]/i);
                if (comboPattern) {
                    console.log(`   → Generic combo URL pattern: ${comboPattern[1]}`);
                }
                
                // Save JS for manual inspection if needed
                const fs = await import('fs');
                // Extract relevant function
                const funcStart = jsCode.indexOf('fpbChargerComboListeDesEtats');
                if (funcStart !== -1) {
                    const funcSnippet = jsCode.substring(funcStart, funcStart + 500);
                    console.log(`   → fpbChargerComboListeDesEtats: ${funcSnippet.substring(0, 300)}`);
                }
            }
        } catch (e) {
            console.log(`   → Could not fetch saigic.tools.core.js: ${e.message}`);
        }

        // Try various API patterns to get the list of report types
        const comboApiUrls = [
            `${CCC_BASE}/ListeEtat/GetListeEtatJson?vppPrdt=${prdt}&vppGroupe=RECEPTION`,
            `${CCC_BASE}/Rapport/GetListeDesEtats?vppPrdt=${prdt}&vppGroupe=RECEPTION`,
            `${CCC_BASE}/Rapport/ChargerComboListeDesEtats?vppPrdt=${prdt}&vppGroupe=RECEPTION`,
        ];

        for (const url of comboApiUrls) {
            try {
                const comboRes = await fetch(url, {
                    headers: {
                        'Authorization': `Basic ${basicAuth}`,
                        'Cookie': formatCookies(cookies),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });
                const comboText = await comboRes.text();
                if (comboRes.ok && comboText.length > 2) {
                    console.log(`   → Combo API ${url.split(CCC_BASE)[1]}: ${comboRes.status}, ${comboText.substring(0, 300)}`);
                    try {
                        const options = JSON.parse(comboText);
                        if (Array.isArray(options) && options.length > 0) {
                            // SAIGIC uses IDWithCodeEtat as the select value (e.g., "1;IdxRecepjournalier")
                            ddlListeEtat = options[0].IDWithCodeEtat || options[0].Value || options[0].value || options[0].IDEtat || '';
                            console.log(`   → ddlListeEtat resolved: "${ddlListeEtat}"`);
                            break;
                        }
                    } catch (e) {
                        const optMatch = comboText.match(/value['"]\s*:\s*['"]?([^'"}\s,]+)/i);
                        if (optMatch) { ddlListeEtat = optMatch[1]; break; }
                    }
                }
            } catch (e) { /* try next */ }
        }
        
        console.log(`   → Final ddlListeEtat value: "${ddlListeEtat}"`);

        // Extract TypeMvt_Id from the HTML (this one has options in the HTML)
        const typeMvtMatch = reportPageHtml.match(/<select[^>]*name="TypeMvt_Id"[^>]*>[\s\S]*?<option[^>]*value="([^"]*)"[^>]*>/i);
        const typeMvtId = typeMvtMatch ? typeMvtMatch[1] : '1';
        console.log(`   → TypeMvt_Id: "${typeMvtId}"`);

        // Extract ExpCode from page JavaScript: var ExpCode = '004';
        // This is the logged-in user's exporter ID, pre-loaded into the ddlExportateur combo
        const expCodeMatch = reportPageHtml.match(/var\s+ExpCode\s*=\s*'([^']*)'/);
        const expCode = expCodeMatch ? expCodeMatch[1] : '';
        console.log(`   → ExpCode (exporter): "${expCode}"`);

        // Build the POST form with correct field names
        // jQuery Unobtrusive AJAX serializes enabled, named form elements via $(form).serializeArray()
        // Only include fields that the browser would serialize (selects with options loaded via AJAX)
        const formBody = new URLSearchParams();
        // Submit button click info is prepended by jquery.unobtrusive-ajax.js
        formBody.append('btnApercu', 'Aperçu');
        formBody.append('Prdt_Id', produit === 'CAFE' ? '1' : '2');
        formBody.append('ddlListeEtat', ddlListeEtat || '1');
        formBody.append('TypeMvt_Id', typeMvtId);
        formBody.append('DateDebut', date_debut);
        formBody.append('DateFin', date_fin);
        // ddlExportateur is loaded via AJAX with ExpCode - MUST have a value for report generation
        if (expCode) {
            formBody.append('ddlExportateur', expCode);
        }
        formBody.append('ddlExportType', 'XLS');
        // These selects have ligneVide=true, so they serialize with empty value from their empty first option
        formBody.append('ddlPort', '');
        formBody.append('ddlSite', '');
        formBody.append('ddlCCQ', '');
        formBody.append('ddlFournisseur', '');
        formBody.append('ddlDepartement', '');
        formBody.append('Localite', '');
        formBody.append('ddlConformite', '');
        formBody.append('ddlAcceptation', '');
        formBody.append('ddlApprouve', '');
        formBody.append('ddlDeclare', '');

        console.log(`   → POST params: Prdt=${formBody.get('Prdt_Id')}, ListeEtat=${ddlListeEtat}, TypeMvt=${typeMvtId}, Exp=${expCode}, dates=${date_debut}→${date_fin}, export=XLS`);
        console.log(`   → Full POST body: ${formBody.toString()}`);

        // Step 3b: POST to the real form action URL (AJAX-style)
        console.log(`📊 Step 3b: POST → ${formAction}`);

        const postReportRes = await fetch(
            formAction.startsWith('http') ? formAction : `${CCC_BASE}${formAction}`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Cookie': formatCookies(cookies),
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',  // Required for AJAX forms
            },
            body: formBody.toString(),
        });

        Object.assign(cookies, extractCookies(postReportRes));
        const postContentType = postReportRes.headers.get('content-type') || '';
        console.log(`   → ShowEtatReception response: ${postReportRes.status}, Content-Type: ${postContentType}`);
        
        const postBody = await postReportRes.text();
        console.log(`   → Response body (${postBody.length} chars): ${postBody.substring(0, 500)}`);

        // Step 3c: GET /Rapport/AfficherEtat to download the generated report
        console.log('📊 Step 3c: GET /Rapport/AfficherEtat');

        const afficherRes = await fetch(`${CCC_BASE}/Rapport/AfficherEtat`, {
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Cookie': formatCookies(cookies),
            },
        });

        const afficherContentType = afficherRes.headers.get('content-type') || '';
        console.log(`   → AfficherEtat response: ${afficherRes.status}, Content-Type: ${afficherContentType}`);

        // Check if we got a file (PDF, Excel, etc.)
        if (afficherContentType.includes('spreadsheet') || afficherContentType.includes('excel') || 
            afficherContentType.includes('octet-stream') || afficherContentType.includes('ms-excel')) {
            const buffer = await afficherRes.arrayBuffer();
            console.log(`   → Got file: ${buffer.byteLength} bytes`);
            const records = parseExcelBuffer(buffer);
            console.log(`✅ Parsed ${records.length} records from Excel report`);
            return res.json({ success: true, records });
        }

        if (afficherContentType.includes('pdf')) {
            console.log('   → Got PDF — cannot parse. Will try HTML approach.');
        }

        // If AfficherEtat returned HTML, try parsing tables
        const afficherHtml = await afficherRes.text();
        console.log(`   → AfficherEtat HTML (${afficherHtml.length} chars)`);
        
        // Save for diagnostic
        try {
            const fs = await import('fs');
            fs.writeFileSync('debug_afficher_etat.html', afficherHtml);
            console.log(`   → Saved debug_afficher_etat.html`);
        } catch(e) {}
        
        // Log a snippet for diagnosis
        if (afficherHtml.length > 0) {
            console.log(`   → AfficherEtat snippet: ${afficherHtml.substring(0, 500).replace(/\n/g, ' ')}`);
        }

        // Try extracting data from HTML tables
        const records = parseHTMLTable(afficherHtml);
        if (records.length > 0) {
            console.log(`✅ Parsed ${records.length} records from HTML report`);
            return res.json({ success: true, records });
        }

        // If nothing worked, return a descriptive error
        return res.status(400).json({
            success: false,
            error: `Impossible d'extraire les données du rapport. ShowEtat: ${postReportRes.status} (${postBody.length} chars), AfficherEtat: ${afficherRes.status} (${afficherContentType})`,
        });

    } catch (error) {
        console.error('❌ CCC Proxy Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur interne du proxy CCC.',
        });
    }
});

/**
 * POST /api/ccc-proxy/test-connection
 * Test if the CCC credentials work
 */
app.post('/api/ccc-proxy/test-connection', async (req, res) => {
    const { browser_user, browser_pass, login_user, login_pass } = req.body;

    try {
        const basicAuth = Buffer.from(`${browser_user}:${browser_pass}`).toString('base64');

        // Step 1: Test HTTP Basic Auth
        const step1 = await fetch(`${CCC_BASE}/SGAccount/LogOn`, {
            headers: { 'Authorization': `Basic ${basicAuth}` },
            redirect: 'manual',
        });

        if (step1.status === 401) {
            return res.json({ success: false, step: 'browser', error: 'Identifiants fenêtre navigateur incorrects.' });
        }

        const cookies = extractCookies(step1);
        let loginPageHtml = '';
        if (step1.ok) {
            loginPageHtml = await step1.text();
        } else if (step1.status === 302) {
            const redirectUrl = step1.headers.get('location');
            const rRes = await fetch(redirectUrl.startsWith('http') ? redirectUrl : `${CCC_BASE}${redirectUrl}`, {
                headers: { 'Authorization': `Basic ${basicAuth}`, 'Cookie': formatCookies(cookies) },
            });
            loginPageHtml = await rRes.text();
            Object.assign(cookies, extractCookies(rRes));
        }

        const tokenMatch = loginPageHtml.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);

        // Detect actual form field names
        const inputFields = [...loginPageHtml.matchAll(/<input[^>]*name="([^"]+)"[^>]*>/gi)]
            .map(m => m[1])
            .filter(n => !n.startsWith('__'));
        console.log(`   [test] Form fields: ${inputFields.join(', ')}`);

        const userFieldCandidates = ['Login', 'UserName', 'login', 'username', 'Email', 'Identifiant'];
        const passFieldCandidates = ['MotDePasse', 'Password', 'motdepasse', 'password', 'Mdp'];
        const userField = inputFields.find(f => userFieldCandidates.includes(f)) || 'Login';
        const passField = inputFields.find(f => passFieldCandidates.includes(f)) || 'MotDePasse';
        console.log(`   [test] Using: user="${userField}", pass="${passField}"`);

        // Step 2: Test App Login
        const loginBody = new URLSearchParams();
        loginBody.append(userField, login_user);
        loginBody.append(passField, login_pass);
        if (tokenMatch) loginBody.append('__RequestVerificationToken', tokenMatch[1]);

        const step2 = await fetch(`${CCC_BASE}/SGAccount/LogOn`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Cookie': formatCookies(cookies),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: loginBody.toString(),
            redirect: 'manual',
        });

        // A successful login redirects (302) to "/" or dashboard, NOT back to LogOn
        if (step2.status === 302) {
            const redirectTo = step2.headers.get('location') || '';
            console.log(`   [test] Login redirect to: ${redirectTo}`);
            if (redirectTo.includes('LogOn')) {
                return res.json({ success: false, step: 'login', error: 'Identifiants application rejetés (redirection vers page de login).' });
            }
            return res.json({ success: true, message: 'Connexion réussie !' });
        }

        return res.json({ success: false, step: 'login', error: 'Identifiants login incorrects.' });

    } catch (error) {
        return res.json({ success: false, error: error.message });
    }
});

// ===== HELPERS =====

function extractCookies(response) {
    const cookies = {};
    const setCookieHeaders = response.headers.raw?.()?.['set-cookie'] || [];
    for (const header of setCookieHeaders) {
        const [nameValue] = header.split(';');
        const [name, value] = nameValue.split('=');
        if (name && value) {
            cookies[name.trim()] = value.trim();
        }
    }
    return cookies;
}

function formatCookies(cookies) {
    return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

function parseExcelBuffer(buffer) {
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    // Use same smart header detection as cccFileParser.js
    const keywords = ['date', 'reçu', 'recu', 'ref', 'ticket', 'fournisseur', 'coop', 'poids', 'net', 'sacs', 'produit'];
    let headerRowIndex = -1;
    let bestScore = 0;

    for (let i = 0; i < Math.min(rawData.length, 30); i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row)) continue;
        let score = 0;
        const rowStr = row.map(c => c ? c.toString().toLowerCase() : '').join(' ');
        keywords.forEach(k => { if (rowStr.includes(k)) score++; });
        if (score > bestScore && score >= 3) { bestScore = score; headerRowIndex = i; }
    }

    if (headerRowIndex === -1) return [];

    const headers = rawData[headerRowIndex];
    const normalizeStr = (str) => str ? str.toString().toLowerCase().replace(/\s+/g, ' ').trim() : '';
    const findCol = (terms) => headers.findIndex(h => terms.some(t => normalizeStr(h).includes(t)));

    // New exhaustive mapping based on exact CCC Headers:
    // "Date Pesée", "Code Pesée", "N° Cnsment", "Code Fournisseur", "Nom Fournisseur", 
    // "Nom Exportateur", "Provenance Departement", "Nbre Sacs", "Poids Accepté", "Grad NAT", "Grad FCC"
    
    const idxDate = findCol(['date pesée', 'date pesee']);
    const idxRefCode = findCol(['code pesée', 'code pesee', 'code de pesée']); 
    const idxConnaissement = findCol(['n° cnsment', 'cnsment', 'connaissement']);
    const idxSupplierCode = findCol(['code fournisseur']);
    const idxSupplier = findCol(['nom fournisseur', 'fournisseur', 'coop']);
    const idxDepartement = findCol(['provenance departement', 'provenance']);
    const idxSacks = findCol(['nbre sacs', 'sacs acceptés', 'sacs']);
    const idxWeight = findCol(['poids accepté', 'poids accepte', 'poids net', 'poids']);
    const idxGrade = findCol(['grad nat', 'grade nat', 'grad', 'grade']);

    if (idxWeight === -1) {
        console.warn("⚠️ Column 'Poids Accepté' not found among headers:", headers);
        return [];
    }

    console.log(`   [parseExcelBuffer] Headers Found:`);
    console.log(`   - Date: ${headers[idxDate]} (idx: ${idxDate})`);
    console.log(`   - Code Pesée: ${headers[idxRefCode]} (idx: ${idxRefCode})`);
    console.log(`   - Connaissement: ${headers[idxConnaissement]} (idx: ${idxConnaissement})`);
    console.log(`   - Supplier Code: ${headers[idxSupplierCode]} (idx: ${idxSupplierCode})`);
    console.log(`   - Grade: ${headers[idxGrade]} (idx: ${idxGrade})`);



    const records = [];
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        const weight = parseFloat(row[idxWeight]);
        if (!weight) continue;

        const rowStr = row.map(c => c ? c.toString().toLowerCase() : '').join(' ');
        if (rowStr.includes('total') || rowStr.includes('totaux')) continue;

        // Reference: Use Code Pesée as primary, fallback to Connaissement, then generate one
        const connaissement = idxConnaissement !== -1 ? (row[idxConnaissement]?.toString() || null) : null;
        const codePesee = idxRefCode !== -1 ? (row[idxRefCode]?.toString() || null) : null;
        const externalRef = codePesee || connaissement || `CCC-AUTO-${Date.now()}-${i}`;

        records.push({
            external_ref: externalRef, // Mapped to reference
            date_reception: idxDate !== -1 ? parseDate(row[idxDate]) : new Date().toISOString().split('T')[0],
            supplier_name: idxSupplier !== -1 ? row[idxSupplier] : 'Inconnu',
            supplier_code: idxSupplierCode !== -1 ? row[idxSupplierCode] : null,
            poids_net_kg: weight, // Mapped to initial AND actual weight
            nb_sacs: idxSacks !== -1 ? parseInt(row[idxSacks]) || 0 : 0, // Mapped to bag_count
            departure_location: idxDepartement !== -1 ? row[idxDepartement] : null,
            quality_grade: idxGrade !== -1 ? row[idxGrade] : null,
            bill_of_lading: connaissement, // Explicitly pass the BL number
            ccc_code_pesee: codePesee, // Pass internal code just in case
            status: 'SYNCED',
            source: 'CCC_AUTO',
        });
        
        if (records.length === 1) {
            console.log(`   [parseExcelBuffer] Sample first record:`, records[0]);
        }
    }

    return records;
}

function parseHTMLTable(html) {
    const records = [];
    
    // Find ALL tables in the HTML
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = [];
    let match;
    while ((match = tableRegex.exec(html)) !== null) {
        tables.push(match[0]);
    }
    
    if (tables.length === 0) {
        console.log('   [parseHTMLTable] No tables found in HTML');
        return records;
    }
    
    console.log(`   [parseHTMLTable] Found ${tables.length} table(s)`);

    // Use the largest table (most likely the data table)
    const sortedTables = tables.sort((a, b) => b.length - a.length);
    
    for (const table of sortedTables) {
        const rows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
        if (!rows || rows.length < 2) continue;
        
        console.log(`   [parseHTMLTable] Processing table with ${rows.length} rows`);

        // Extract header row (th or first td row)
        const headerRow = rows[0];
        const headerCells = headerRow.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi) || [];
        const headers = headerCells.map(c => c.replace(/<[^>]+>/g, '').trim().toLowerCase());
        console.log(`   [parseHTMLTable] Headers: ${headers.join(' | ')}`);

        // Map column indices using keyword matching
        const keywords = {
            date: ['date', 'jour', 'dt'],
            ref: ['code pesée', 'code pesee', 'reçu', 'recu', 'ref', 'ticket', 'n°', 'numero', 'numéro', 'bordereau', 'cnsment', 'connaissement'],
            supplier: ['fournisseur', 'coop', 'nom', 'cooperative', 'coopérative', 'raison'],
            weight: ['poids', 'net', 'kg', 'tonnage', 'quantité', 'quantite', 'qty'],
            sacks: ['sacs', 'nb', 'nombre'],
            grade: ['grad', 'grade', 'nat'], // Added Grade NAT mapping
        };

        const findIdx = (terms) => headers.findIndex(h => terms.some(t => h.includes(t)));
        const idxDate = findIdx(keywords.date);
        const idxRef = findIdx(keywords.ref);
        const idxSupplier = findIdx(keywords.supplier);
        const idxWeight = findIdx(keywords.weight);
        const idxSacks = findIdx(keywords.sacks);
        const idxGrade = findIdx(keywords.grade); // Extract Grade

        console.log(`   [parseHTMLTable] Column mapping: date=${idxDate}, ref=${idxRef}, supplier=${idxSupplier}, weight=${idxWeight}, sacks=${idxSacks}, grade=${idxGrade}`);

        // Parse data rows
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
            if (!cells || cells.length < 3) continue;

            const cellValues = cells.map(c => c.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim());
            
            // Try mapped weight column first, then scan all cells for a weight-like value
            let weight = 0;
            if (idxWeight !== -1 && cellValues[idxWeight]) {
                weight = parseFloat(cellValues[idxWeight].replace(/[^\d.,]/g, '').replace(',', '.'));
            }
            if (!weight) {
                // Scan for any numeric value > 10 (likely a weight in kg)
                for (const val of cellValues) {
                    const num = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.'));
                    if (num > 10) { weight = num; break; }
                }
            }
            if (!weight) continue;

            // Skip total/summary rows
            const rowStr = cellValues.join(' ').toLowerCase();
            if (rowStr.includes('total') || rowStr.includes('totaux') || rowStr.includes('sous-total')) continue;

            records.push({
                external_ref: idxRef !== -1 ? (cellValues[idxRef] || `HTML-${i}`) : `HTML-${i}`,
                date_reception: idxDate !== -1 ? parseDate(cellValues[idxDate]) : new Date().toISOString().split('T')[0],
                supplier_name: idxSupplier !== -1 ? (cellValues[idxSupplier] || 'Inconnu') : 'Inconnu',
                poids_net_kg: weight,
                nb_sacs: idxSacks !== -1 ? (parseInt(cellValues[idxSacks]) || 0) : 0,
                quality_grade: idxGrade !== -1 ? (cellValues[idxGrade] || null) : null, // Mapped Grade NAT
                status: 'SYNCED',
                source: 'CCC_AUTO',
            });
        }

        if (records.length > 0) {
            console.log(`   [parseHTMLTable] ✅ Extracted ${records.length} records from table`);
            return records;
        }
    }
    
    console.log('   [parseHTMLTable] No records extracted from any table');
    return records;
}

function parseDate(value) {
    if (!value) return new Date().toISOString().split('T')[0];
    if (typeof value === 'number') {
        const date = new Date(Math.round((value - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    if (typeof value === 'string' && value.includes('/')) {
        const parts = value.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return new Date().toISOString().split('T')[0];
}

app.listen(PORT, () => {
    console.log(`\n🚀 CCC Proxy Server running on http://localhost:${PORT}`);
    console.log(`   POST /api/ccc-proxy/fetch-receptions`);
    console.log(`   POST /api/ccc-proxy/test-connection\n`);
});
