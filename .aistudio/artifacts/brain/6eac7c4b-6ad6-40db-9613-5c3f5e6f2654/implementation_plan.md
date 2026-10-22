# Verkeersongevallen & Verkeersveiligheid Steenwijkerland (BRON 2003–2025)

Fundamentele transformatie van de kaartapplicatie: alle openbaar-vervoer- en deelfietsonderdelen (bussen, treinen, deelfietsen, OV-fiets en DRGL-vertrektijden) worden volledig verwijderd en vervangen door een forensisch dataproduct voor **Verkeersongevallen in Gemeente Steenwijkerland**, rechtstreeks gevoed vanuit de voorgeschreven ArcGIS BRON-registratie (`webmap=c6846c5e16064267ba3702f08b261ba2`). De kaart behoudt strikt de gemeentegrenzen van Steenwijkerland waarbij al het gebied daarbuiten pikzwart (`#060e0a`) gemaskeerd blijft.

## User Review & Critical Decisions

> [!IMPORTANT]
> Hieronder staan de bevestigde keuzes uit jouw antwoorden en de kernbeslissingen voor de nieuwe architectuur:

- **Bevestigde Keuze 1 — Volledige Historie & Jaarfilter (2003 t/m 2025)**: Alle geregistreerde verkeersongevallen binnen Gemeente Steenwijkerland (`GME_NAAM = 'Steenwijkerland'` én strikt binnen de gemeentepolygoon) over de jaren 2003 t/m 2025 worden opgehaald, gecachet en direct filterbaar gemaakt via een jaartal-bereikslider, histogram en snelkeuzeknoppen.
- **Bevestigde Keuze 2 — Schakelbare Kaartweergave (Ernst-markers & Blackspot-Heatmap)**: Op de kaart kan direct worden geschakeld tussen (of gecombineerd):
  1. **Individuele Ongevallen-markers** met kleur- en groottecodering op basis van afloop (`AP3_CODE`: *Dodelijk*, *Letsel*, *Uitsluitend materiële schade*).
  2. **Blackspot-Heatmap / Risicozones** die concentraties van ongevallen op kruispunten en wegvakken in één oogopslag zichtbaar maakt.
- **Bevestigde Keuze 3 — Interactief Filterpaneel, Gekoppelde Partijen & Statistieken Dashboard**:
  - **Filterpaneel**: Filteren op jaartalbereik (2003–2025), afloop/ernst, aard ongeval (`AOL_ID`), betrokken vervoerswijze/partij (`OTE_ID` zoals Fiets, E-bike, Personenauto, Voetganger, Vrachtauto, Landbouwvoertuig), maximumsnelheid, licht-/weersgesteldheid en plaats/kern binnen Steenwijkerland.
  - **Gekoppelde Partijen (`FeatureServer/2`)**: Klikken op een ongeval opent de detailkaart (conform de Arcade-popup uit de ArcGIS-bron) inclusief alle betrokken partijen (`OTE_ID`, vervoersmiddel-icoon, leeftijdscategorie, rijrichting/toedracht en eventuele doorrijder-status).
  - **Statistieken Dashboard & CSV-export**: Uitgebreid analyseoverzicht met trendgrafiek per jaar (2003–2025), verdeling naar ernst, top-risicofactoren, betrokken verkeersdeelnemers en directe `.CSV`-export van de gefilterde dataset.

---

## 1. Overview & Core Concept

- **Wat het doet**: Een interactieve georuimtelijke analyse-applicatie die alle geregistreerde verkeersongevallen (BRON / Rijkswaterstaat / Esri Nederland ArcGIS FeatureServer) binnen de grenzen van Gemeente Steenwijkerland ontsluit, inclusief de 1-op-veel gekoppelde tabel met betrokken partijen.
- **Doelgroep**: Gemeenteraad, beleidsadviseurs verkeer & mobiliteit, journalisten en inwoners van Steenwijkerland die verkeersveiligheid, blackspots en meerjarige trends (2003–2025) willen onderzoeken.
- **Kernwaarde**: Volledige transparantie in lokale verkeersveiligheid met directe koppeling tussen kaartlocatie, weg- en weersomstandigheden, en betrokken verkeersdeelnemers (zoals kwetsbare verkeersdeelnemers: fietsers, e-bikes en voetgangers), streng afgebakend binnen de gemeentegrenzen.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Directe Kaartverkenning (Binnen Gemeentegrens)**: Bij het openen toont de kaart Gemeente Steenwijkerland omgeven door het pikzwarte buitenmasker. Gebruikers zien direct de ongevallen-markers (gekleurd op ernst) en kunnen met één klik op de kaartknoppen wisselen tussen *Punten op ernst*, *Blackspot-Heatmap*, of *Gecombineerd*, evenals snel inzoomen op specifieke kernen (Steenwijk, Vollenhove, Giethoorn, Oldemarkt, Blokzijl, Sint Jansklooster, enz.).
2. **Filteren & Temporele Analyse (Linker Zijpaneel)**: Aan de linkerzijde bevindt zich het interactieve filter- en verkenningspaneel met een jaartal-histogram + bereikslider (2003–2025, geïnspireerd op de ArcGIS Histogram Range Slider uit het HTML-bestand), filters voor ernst (`Dodelijk`, `Letsel`, `Uitsluitend materiële schade`), vervoersmiddel/partij, aard ongeval, binnen/buiten bebouwde kom, maximumsnelheid en licht-/weersgesteldheid, plus een doorzoekbare lijst van de gefilterde ongevallen.
3. **Ongeval & Partijen Detailweergave (Popup & Detailpaneel)**: Klikken op een ongeval op de kaart of in de lijst toont het volledige ongevalsrapport volgens de ArcGIS BRON-structuur:
   - **Header**: Verkeersongevalnummer (`VKL_NUMMER`), registratienummer (`REGNUMMER`), jaartal en kleurgecodeerde ernst-indicator.
   - **Snelstatistieken**: Aantal betrokken partijen (`ANTL_PTJ`), Jaar (`JAAR_VKL`), Bebouwde kom / Maximumsnelheid (`MAXSNELHD`).
   - **Betrokken Partijen**: Overzicht van alle gekoppelde records uit de `Partijen`-tabel (`OTE_ID` zoals *Personenauto*, *Fiets*, *e-bike*, *Voetganger*, *Vrachtauto*, *Trekker/Landbouwvoertuig*, *Boom/Lichtmast*, inclusief visuele iconen en partij-attributen).
   - **Weg- & Weersomstandigheden**: Aard ongeval (`AOL_ID`), Wegsituatie (`WSE_ID`), Wegverlichting (`WVL_ID`), Wegverharding (`WVG_ID`), Wegdek (`WDK_ID`), Lichtgesteldheid (`LGD_ID`) en Weergesteldheid (`WGD_CODE_1`).
4. **Statistieken & CSV-Export Modal**: Via de topbalk opent de gebruiker het analyse-dashboard met jaarlijkse ongevallentrends (2003–2025), uitsplitsing naar ernst, aard van het ongeval, aandeel fiets/e-bike-ongevallen en een directe downloadknop voor `.CSV`-export.

### Visual Identity & Theme
- **Aesthetic Direction**: Forensisch & Gemeentelijk Dataproduct (*Forensic Dark*), met scherp contrast tussen de pikzwarte buitenruimte rond Steenwijkerland en heldere semantische kleurcodering voor verkeersveiligheid.
- **Color Palette & Mood**:
  - `--bg-main: #060e0a` (Pikzwart/diep donkergroen canvas en buitenmasker buiten de gemeentegrens)
  - `--bg-card: #0b1a13` / `--bg-elevated: #162f23` (Structuurvlakken met `1px solid #1b3829` randen)
  - **Ernst-kleurcodering (conform ArcGIS BRON-renderer & popup)**:
    - *Dodelijk*: `#ef4444` / `#b03a2e` (Hoog-contrast karmijnrood, grotere marker met subtiele contour)
    - *Letsel*: `#f59e0b` / `#d68910` (Amber/oranje)
    - *Uitsluitend materiële schade*: `#fef08a` / `#94a3b8` (Lichtgeel op de kaart conform ArcGIS-renderer `[255, 255, 190]`, gedempt staalblauw/grijs in tekstoverzichten)
- **Typography & Hierarchy**:
  - Display & Navigatie: `Plus Jakarta Sans` (strakke geometrische koppen)
  - Body & Tabellen: `DM Sans` voor optimale leesbaarheid op 12px–14px
  - Numerieke data, jaartallen, coördinaten en `VKL_NUMMER`: `JetBrains Mono` met `font-variant-numeric: tabular-nums`
- **Top Bar Contract**: Strakke 1-rijige header met 3 zones (`gap-8`):
  1. **Brand**: `Verkeersongevallen Steenwijkerland`
  2. **Navigatie / Weergavelinks**: `Filterpaneel`, `Punten / Heatmap`, `Statistieken & Trends`, `Insluiten`
  3. **Primaire Actie**: `Exporteer CSV` (en vernieuwen/synchroniseren met ArcGIS BRON)

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Server-Side ArcGIS Scraper & Sync Engine met Lokale Persistentie**:
  - *Chosen Approach*: De Express-backend (`server.ts`) bevraagt rechtstreeks de twee officiële ArcGIS REST FeatureServer-lagen die in het aangeleverde HTML-bestand zijn gedefinieerd:
    - Laag 0 (`Verkeersongevallen`): `https://services.arcgis.com/nSZVuSZjHpEZZbRo/arcgis/rest/services/Verkeersongevallen/FeatureServer/0/query` met `where=GME_NAAM='Steenwijkerland'` en `outSR=4326`.
    - Laag 2 (`Partijen`): `https://services.arcgis.com/nSZVuSZjHpEZZbRo/arcgis/rest/services/Verkeersongevallen/FeatureServer/2/query` gekoppeld op `VKL_NUMMER`.
    De backend pagina-scrape't alle beschikbare jaargangen (2003–2025) voor Steenwijkerland, filtert elk punt aanvullend met `isPointInSteenwijkerland(lat, lng)`, koppelt de betrokken partijen en slaat de verrijkte dataset lokaal op in `src/data/verkeersongevallen.json` zodat de kaart razendsnel laadt en ook bij tijdelijke ArcGIS-rate-limits direct beschikbaar is.
  - *Why*: ArcGIS FeatureServers hanteren een `maxRecordCount` per request (paginering via `resultOffset` / `resultRecordCount`). Door dit op de server te aggregeren en te cachen, kan de gebruiker in de browser zonder enige vertraging door alle jaren (2003–2025) en duizenden ongevallen + partijen schuiven.
- **Decision 2 — Volledige Verwijdering van OV & Deelfiets Legacy**:
  - *Chosen Approach*: Alle oude bus-, trein-, DRGL-, OV-fiets- en deelfiets-componenten, -types, -services en -routes worden opgeruimd zodat de codebase 100% gericht is op verkeersongevallen en verkeersveiligheid.
  - *Why*: Voorkomt dode code, onnodige achtergrond-polling naar OVzoeker/DRGL en houdt de interface scherp gefocust op het gevraagde onderwerp.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    ArcGIS BRON FeatureServer (Rijkswaterstaat)             │
│  • Layer 0: /Verkeersongevallen/FeatureServer/0 (GME_NAAM='Steenwijkerland')│
│  • Table 2: /Verkeersongevallen/FeatureServer/2 (Partijen via VKL_NUMMER)  │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ Gepagineerde JSON-scraping (outSR=4326)
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                     Express Backend Proxy & Cache (server.ts)              │
│  • Geografische validatie: isPointInSteenwijkerland(lat, lng)              │
│  • Koppeling: VKL_NUMMER ──► Partijen[] (OTE_ID, leeftijd, manoeuvre)      │
│  • Persistente JSON cache: src/data/verkeersongevallen.json                │
│  • API Routes:                                                             │
│    - GET  /api/ongevallen          (Volledige dataset + jaartal-samenvatting)│
│    - GET  /api/ongevallen/:nummer  (Specifiek ongeval + gekoppelde partijen)│
│    - POST /api/ongevallen/sync     (Live her-scrape vanuit ArcGIS BRON)    │
│    - GET  /api/ongevallen/export.csv (Directe CSV-download)                │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      React Frontend State (src/App.tsx)                    │
│  • Filter State: yearRange [2003, 2025], severities, partyTypes,           │
│    accidentTypes, speedLimits, lightConditions, weather, searchQuery, town │
│  • Map Display Mode: 'points' | 'heatmap' | 'both'                         │
└───────────┬─────────────────────────┼──────────────────────────┬───────────┘
            │                         │                          │
            ▼                         ▼                          ▼
┌───────────────────────┐ ┌────────────────────────┐ ┌───────────────────────┐
│  OngevallenFilterPanel│ │      MapComponent      │ │  OngevallenDashboard  │
│  • Jaar Histogram &   │ │  • Zwarte buitenmasker │ │  • Trendgrafiek       │
│    2003–2025 Slider   │ │    buiten gemeentegrens│ │    2003–2025          │
│  • Ernst & Partij     │ │  • Ernst-markers       │ │  • Verdeling Ernst,   │
│    filters            │ │  • Canvas Heatmap laag │ │    Partijen & Wegvak  │
│  • Ongevallenlijst    │ │  • BRON Detail Popup   │ │  • CSV Export         │
└───────────────────────┘ └────────────────────────┘ └───────────────────────┘
```

### Data Model & State
- **`TrafficAccident` (`Verkeersongeval`)**:
  - Identificatie & Tijd: `vklNummer` (`VKL_NUMMER`), `regNummer` (`REGNUMMER`), `jaar` (`JAAR_VKL`), `datumTimestamp` (`JAAR_DATUM`), `dagtype` (`DAGTYPE`)
  - Locatie (strikt binnen Steenwijkerland): `lat`, `lng`, `xCoord`, `yCoord`, `gmeNaam`, `kern` (afgeleide kern/plaats in Steenwijkerland op basis van dichtstbijzijnde kern-coördinaten), `wvkId` (`WVK_ID`), `jteId` (`JTE_ID`), `hectometer` (`HECTOMETER`), `huisnummer` (`HUISNUMMER`), `niveauKop` (`NIVEAUKOP`)
  - Ernst & Aard: `ernst` (`AP3_CODE`: `'Dodelijk' | 'Letsel' | 'Uitsluitend materiele schade'`), `aantalPartijen` (`ANTL_PTJ`), `aardOngeval` (`AOL_ID`)
  - Weg & Omgeving: `wegsituatie` (`WSE_ID`), `bebouwdeKom` (`BEBKOM`), `maxSnelheid` (`MAXSNELHD`), `wegverlichting` (`WVL_ID`), `wegverharding` (`WVG_ID`), `wegdek` (`WDK_ID`), `lichtgesteldheid` (`LGD_ID`), `weergesteldheid` (`WGD_CODE_1`), `bijzonderhedenInfra` (`BZD_ID_IF1`), `bijzonderhedenMaatregel` (`BZD_ID_VM1`), `bijzonderhedenTijdelijk` (`BZD_ID_TA1`)
  - Gekoppelde Partijen: `partijen: AccidentParty[]`
- **`AccidentParty` (`Partij` uit `FeatureServer/2`)**:
  - `vklNummer` (`VKL_NUMMER`), `volgnummer` (`NUMMER`), `objectType` (`OTE_ID`, bijv. *Personenauto*, *Fiets*, *e-bike*, *Voetganger*, *Bestelauto*, *Vrachtauto*, *Bromfiets*, *Motor*, *Trekker*), `leeftijdCategorie` (`LFT_ID` / `LEEFTIJD`), `geslacht` (`GESLACHT`), `doorrijder` (`DOORRIJDER`), `beweging` / `toedracht` (indien aanwezig in tabel 2).

### Interactive Component & State Mapping
- **Jaar Histogram & Range Slider (2003–2025)**: Repliceert de functionaliteit uit het ArcGIS-filterpaneel met een interactief staafdiagram van het aantal ongevallen per jaar inclusief gemiddelde-lijn (`x̄`) en directe min/max jaartal-selectie.
- **Kaartweergave & Blackspot Canvas Overlay**:
  - In `points`-modus worden cirkelmarkers getekend volgens de officiële ArcGIS-renderer (`Dodelijk`: rood `r=8`, `Letsel`: oranje `r=6`, `Uitsluitend materiele schade`: lichtgeel `r=4.5`).
  - In `heatmap`- of `both`-modus berekent een high-performance HTML5 Canvas-laag (binnen de gemeentegrenzen, onder het zwarte buitenmasker `exteriorBlackMaskPane`) de gewogen ongevalsdichtheid (waarbij dodelijke en letselongevallen zwaarder wegen) om blackspots direct uit te lichten.
- **Ongeval Detailkaart (ArcGIS BRON Popup stijl)**: Toont bij selectie van een marker exact de secties uit de ArcGIS Arcade-expressie (*Header met VKL_NUMMER & Ernst*, *Partijen / Jaar / Gemeente strip*, *Betrokken partijen chips met voertuigiconen*, *Details*, *Wegomstandigheden* en *Weersomstandigheden*).

---

## 5. Schoolzones & Map Layer Interactivity Fix

### Root Cause Analysis
- **Probleem**: Wanneer een schoolzone was aangeklikt, konden verkeersongevallen daarna niet meer worden aangeklikt op de kaart.
- **Oorzaak**: Leaflet initialiseerde met `preferCanvas: true`. Omdat `schoolzonesPane` (z-index 420) geen eigen SVG-renderer had meegekregen en geen `pointerEvents = 'none'` op het pane-element had, creëerde Leaflet automatisch een tweede HTML5 `<canvas>`-element op z-index 420 die over de volledige kaart lag boven `accidentsPane` (z-index 410). Een canvas-element vangt in de browser alle pointer-events af en laat geen clicks door naar onderliggende canvas-elementen.
- **Oplossing**:
  1. **Pane Z-index Hiërarchie hersteld**:
     - `heatmapPane`: zIndex 380 (`pointerEvents: 'none'`)
     - `schoolzonesRoadPane`: zIndex 395 (`pointerEvents: 'none'`, dedicated `L.svg` renderer voor wegvak-polylines en 250m buffer)
     - `accidentsPane`: zIndex 415 (dedicated `L.canvas` renderer voor alle ongevalspunten)
     - `schoolzonesMarkersPane`: zIndex 425 (`pointerEvents: 'none'` op pane, `.schoolzone-point-marker { pointer-events: auto !important; }` op de 28x28 iconen)
     - `selectedAccidentPane`: zIndex 435 (`pointerEvents: 'none'`)
     - `exteriorBlackMaskPane`: zIndex 450 (`pointerEvents: 'none'`)
  2. **Dedicated SVG Renderer voor Schoolzones**:
     - `schoolzonesRoadPane` gebruikt nu expliciet `L.svg({ pane: 'schoolzonesRoadPane' })` voor polylines en de 250m bufferzone. Hierdoor wordt er nóóit een overlappend `<canvas>`-element aangemaakt.
     - De 250m straalcirkel rond de geselecteerde schoolzone heeft `interactive: false` zodat alle ongevallen binnen 250m direct hoverbaar en aanklikbaar blijven.
  3. **Naadloze Wisseling**:
     - Klikken op een ongeval op de kaart (of in de 250m-lijst van de school) sluit direct het schoolzone-paneel, opent het ongeval-detailpaneel en centreert desgewenst op het ongeval.
