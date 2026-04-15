# 📋 Log Technique — Synchronisation SAIGIC / Conseil Café Cacao

> **Projet** : Origin.e-Xport v2  
> **Date** : 13 Mars 2026  
> **Objectif** : Récupérer automatiquement les volumes de réceptions (achats tout-venant) depuis la plateforme SAIGIC du Conseil Café Cacao (CCC) et les insérer dans la base Supabase `trace_batches`.

---

## 🏗️ Architecture mise en place

```
[Frontend React]  →  [Vite Proxy :5173]  →  [Express Proxy :3001]  →  [SAIGIC :8088]
                                                     ↓
                                              [Supabase DB]
```

- **Frontend** : `src/pages/Imports/CCCImportsView.jsx` — onglet "Volumes Acceptés (CCC)"
- **Service** : `src/services/cccAutoFetchService.js` — orchestration fetch + insertion
- **Proxy** : `server/ccc-proxy.js` — proxy Express qui contourne CORS et gère la double authentification SAIGIC
- **Vite Config** : `vite.config.js` — proxy `/api/ccc-proxy` → `http://localhost:3001`

---

## 🔐 Problème 1 — Erreur 500 (proxy non démarré)

**Symptôme** : Test connexion → erreur 500  
**Cause** : Le serveur proxy Express (`server/ccc-proxy.js`) n'était pas lancé.  
**Fix** : Lancer `node server/ccc-proxy.js` depuis le dossier `v2/`.

---

## 🔐 Problème 2 — Erreur 400 (champs de login incorrects)

**Symptôme** : Sync → erreur 400, le proxy retournait "Login failed".  
**Cause** : Le proxy envoyait `Login` / `MotDePasse` comme noms de champs, mais le formulaire ASP.NET utilise `UserName` / `Password`.  

**Découverte** : Analyse du HTML de la page de login (`/SGAccount/LogOn`) :
```html
<input type="text" name="UserName" />
<input type="password" name="Password" />
```

**Fix** : Détection dynamique des champs de formulaire depuis le HTML :
```js
const formFields = loginHtml.match(/<input[^>]*name="([^"]*)"[^>]*type="(text|password)"/gi);
```

---

## 🔐 Problème 3 — Fausse détection d'authentification

**Symptôme** : Le proxy croyait être authentifié mais ne l'était pas.  
**Cause** : La vérification se basait sur le contenu HTML de la page post-login, qui était ambigu.  

**Fix** : Vérifier la présence du cookie `.ASPXAUTH` (cookie d'authentification ASP.NET) :
```js
const isAuthenticated = '.ASPXAUTH' in cookies;
```

---

## 📊 Problème 4 — Mauvaise URL d'action du formulaire de rapport

**Symptôme** : POST vers `/Rapport/EtatReception` retournait 404.  
**Cause** : L'URL réelle du formulaire est `/Rapport/ShowEtatReception?Length=7` (découvert dans le HTML).

**Découverte** : Extraction et analyse du HTML de la page rapport (`/Rapport/EtatReception` en GET) :
```html
<form action="/Rapport/ShowEtatReception?Length=7" 
      data-ajax="true" data-ajax-method="POST"
      data-ajax-success="successPaging()" 
      id="FormEtatReception">
```

**Architecture SAIGIC** : La page utilise **jQuery Unobtrusive AJAX** :
1. `POST /Rapport/ShowEtatReception?Length=7` — génère le rapport côté serveur (retourne 200, 0 chars)
2. `successPaging()` appelle `window.open("/Rapport/AfficherEtat")` — télécharge le fichier généré

**Fix** : Parser le `action` du formulaire depuis le HTML et implémenter le flux en 2 étapes.

---

## 📊 Problème 5 — `ddlListeEtat` vide (dropdown chargé en AJAX)

**Symptôme** : Le POST fonctionnait mais `AfficherEtat` retournait une erreur de génération.  
**Cause** : Le champ `ddlListeEtat` (type de rapport) est rempli dynamiquement via un appel AJAX JavaScript au chargement de la page. Côté proxy, il était envoyé vide.

**Découverte** : Analyse du fichier `saigic.tools.core.js` (39 138 chars) :
```js
fpbChargerComboListeDesEtats: function (Id, params, ligneVide) {
    $.ajax({
        url: _baseURL + "/ListeEtat/GetListeEtatJson",
        data: { vppPrdt: params.vppPrdt, vppGroupe: params.vppGroupe },
        success: function (data) {
            $.each(data, function (index, result) {
                $("#" + Id).append("<option value='" + result.IDWithCodeEtat + "'>");
            });
        }
    });
}
```

**API découverte** : `GET /ListeEtat/GetListeEtatJson?vppPrdt=2&vppGroupe=RECEPTION`  
**Réponse** :
```json
[
  {"IDEtat":1, "LibelleEtat":"Etat des réceptions journalières", "CodeRapport":"IdxRecepjournalier", "IDWithCodeEtat":"1;IdxRecepjournalier"},
  {"IDEtat":2, "LibelleEtat":"Etat des réceptions (Statistiques par exportateur)", "CodeRapport":"IdxRecepexp", "IDWithCodeEtat":"2;IdxRecepexp"}
]
```

**Fix** : Le proxy appelle cette API pour résoudre la valeur dynamiquement :
```js
ddlListeEtat = options[0].IDWithCodeEtat; // "1;IdxRecepjournalier"
```

---

## 📊 Problème 6 — Mauvaise valeur `ddlExportType`

**Symptôme** : Rapport ne se générait pas.  
**Cause** : Le proxy envoyait `ddlExportType=EXCEL`, mais la vraie valeur dans le HTML est `XLS`.

**Découverte** : Analyse du `<select>` dans le HTML :
```html
<select name="ddlExportType">
    <option value="XLS">XLS</option>
    <option value="PDF">PDF</option>
</select>
```

**Fix** : `formBody.append('ddlExportType', 'XLS');`

---

## 📊 Problème 7 — Header AJAX manquant

**Symptôme** : Le POST retournait une page HTML au lieu de déclencher la génération.  
**Cause** : jQuery Unobtrusive AJAX ajoute automatiquement `X-Requested-With: XMLHttpRequest`. Sans ce header, le serveur ASP.NET MVC ne reconnaît pas la requête comme AJAX.

**Fix** :
```js
headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/x-www-form-urlencoded',
}
```

---

## 📊 Problème 8 (CRITIQUE) — `ddlExportateur` vide → erreur de génération

**Symptôme** : `ShowEtatReception` retourne 200 (0 chars = succès), mais `AfficherEtat` retourne `"Une erreur est survenue lors de la génération de l'état"` (71 chars).

**Cause** : Le JavaScript de la page SAIGIC initialise un code exportateur lié au compte connecté :
```js
var ExpCode = '004';
App.fpbChargerComboExportateurs("ddlExportateur", { Exp_Id: ExpCode }, ligneVide);
```
Le dropdown `ddlExportateur` est pré-rempli avec `004` (l'ID de l'exportateur connecté). Le proxy envoyait `ddlExportateur=` (vide), ce qui faisait échouer la génération du rapport côté serveur.

**Fix** : Extraire `ExpCode` du JavaScript inline de la page et l'inclure dans le POST :
```js
const expCodeMatch = reportPageHtml.match(/var\s+ExpCode\s*=\s*'([^']*)'/);
const expCode = expCodeMatch ? expCodeMatch[1] : '';
formBody.append('ddlExportateur', expCode);
```

**Résultat** : `AfficherEtat` retourne maintenant `Content-Type: application/vnd.ms-excel` — **89 600 bytes** — **181 enregistrements parsés** ✅

---

## 💾 Problème 9 — RLS Supabase sur `trace_batches`

**Symptôme** : Sync CCC réussie (181 records parsés du proxy) mais insertion Supabase échoue : `"new row violates row-level security policy for table trace_batches"`.

**Cause** : 
1. La table `trace_batches` avait RLS activé mais **aucune policy INSERT**
2. Colonnes manquantes : `reference`, `owner_id`, `produit_type`, `etat_physique`, `poids_initial_kg`, `quality_grade`, `campagne` (la table originale n'avait que `id`, `status`, `poids_actuel_kg`, `created_at`)

**Fix** : Migration SQL `20260314000000_fix_trace_batches_rls.sql` :
```sql
ALTER TABLE public.trace_batches
ADD COLUMN IF NOT EXISTS reference text,
ADD COLUMN IF NOT EXISTS owner_id uuid,
ADD COLUMN IF NOT EXISTS produit_type text DEFAULT 'CACAO',
ADD COLUMN IF NOT EXISTS etat_physique text DEFAULT 'BRUT',
ADD COLUMN IF NOT EXISTS poids_initial_kg numeric,
ADD COLUMN IF NOT EXISTS quality_grade text,
ADD COLUMN IF NOT EXISTS campagne text;

CREATE INDEX IF NOT EXISTS idx_trace_batches_owner_ref 
ON public.trace_batches(owner_id, reference);

ALTER TABLE public.trace_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.trace_batches
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## 🔄 Automatisation finale

**Fichiers modifiés/créés** :
- `server/ccc-proxy.js` — Proxy complet avec double auth + rapport 2 étapes
- `src/services/cccAutoFetchService.js` — Ajout `getActiveCampaign()`, `getStoredBatches()`
- `src/pages/Imports/CCCImportsView.jsx` — Refonte complète de l'onglet "Volumes Acceptés"
- `supabase/migrations/20260314000000_fix_trace_batches_rls.sql` — Fix colonnes + RLS

**Comportement automatique** :
1. Au chargement de l'onglet → détecte la campagne active
2. Utilise `date_debut campagne → aujourd'hui` comme période
3. Vérifie si déjà synchronisé aujourd'hui → skip si oui
4. Sinon, lance la sync automatique (fetch CCC + déduplication + insert)
5. Affiche le tableau des volumes avec "Dernière sync : ..." en haut

---

## 📌 Flux d'authentification SAIGIC (résumé)

```
1. GET  https://www.conseilcafecacao.ci:8088/
   → Headers: Authorization: Basic <base64(browser_user:browser_pass)>
   → Retourne: Page login HTML + cookies (cookiesession1, ASP.NET_SessionId)
   → Extraire: __RequestVerificationToken + noms de champs (UserName, Password)

2. POST https://www.conseilcafecacao.ci:8088/SGAccount/LogOn
   → Body: UserName=xxx&Password=xxx&__RequestVerificationToken=xxx
   → Retourne: 302 redirect → cookie .ASPXAUTH (= authentifié)

3. GET  https://www.conseilcafecacao.ci:8088/Rapport/EtatReception
   → Retourne: HTML du formulaire de rapport
   → Extraire: action URL, ExpCode, anti-forgery token

4. GET  /ListeEtat/GetListeEtatJson?vppPrdt=2&vppGroupe=RECEPTION
   → Retourne: JSON des types de rapports
   → Utiliser: IDWithCodeEtat du premier résultat

5. POST /Rapport/ShowEtatReception?Length=7
   → Body: Prdt_Id=2&ddlListeEtat=1;IdxRecepjournalier&TypeMvt_Id=1
           &DateDebut=01/10/2025&DateFin=13/03/2026&ddlExportateur=004
           &ddlExportType=XLS&btnApercu=Aperçu...
   → Headers: X-Requested-With: XMLHttpRequest
   → Retourne: 200, 0 chars (= rapport généré en session serveur)

6. GET  /Rapport/AfficherEtat
   → Retourne: application/vnd.ms-excel (fichier XLS)
   → Parser avec xlsx.js → array de records JSON
```

---

## ✅ Résultat final

| Métrique | Valeur |
|----------|--------|
| Records parsés par sync | **181** |
| Taille fichier Excel | **89 600 bytes** |
| Temps total sync | ~8-12 secondes |
| Déduplication | Par `reference` (external_ref) |
| Auto-sync | 1x par jour au chargement de la page |
