import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  isPointInSteenwijkerland,
  findClosestKern,
} from './src/data/steenwijkerland';
import {
  TrafficAccident,
  AccidentParty,
  exportAccidentsToCSV,
} from './src/types/ongevallen';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const ONGEVALLEN_DATA_FILE = path.resolve(__dirname, 'src/data/verkeersongevallen.json');
const ARCGIS_BASE_URL =
  'https://services.arcgis.com/nSZVuSZjHpEZZbRo/arcgis/rest/services/Verkeersongevallen/FeatureServer';

// In-memory store keyed by vklNummer
const accidentsStore: Map<string, TrafficAccident> = new Map();
let lastSyncedTimestamp: string = new Date().toISOString();
let isSyncingInBackground = false;

function loadAccidentsFromDisk() {
  try {
    if (fs.existsSync(ONGEVALLEN_DATA_FILE)) {
      const raw = fs.readFileSync(ONGEVALLEN_DATA_FILE, 'utf8');
      const parsed: TrafficAccident[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (
            item &&
            item.vklNummer &&
            typeof item.lat === 'number' &&
            typeof item.lng === 'number' &&
            isPointInSteenwijkerland(item.lat, item.lng)
          ) {
            accidentsStore.set(item.vklNummer, item);
          }
        }
      }
      console.log(
        `[BRON Verkeersongevallen] Loaded ${accidentsStore.size} Steenwijkerland accidents (2003–2025) from disk.`
      );
    }
  } catch (e) {
    console.warn('Could not load verkeersongevallen.json:', e);
  }
}

function saveAccidentsToDisk() {
  try {
    const arr = Array.from(accidentsStore.values()).sort(
      (a, b) => b.jaar - a.jaar || b.vklNummer.localeCompare(a.vklNummer)
    );
    const tmp = `${ONGEVALLEN_DATA_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(arr), 'utf8');
    fs.renameSync(tmp, ONGEVALLEN_DATA_FILE);
  } catch (e) {
    console.warn('Could not save verkeersongevallen.json:', e);
  }
}

/**
 * Fetches related Partijen records for a list of OBJECTIDs from ArcGIS FeatureServer/0/queryRelatedRecords
 */
async function fetchRelatedPartiesForObjectIds(
  objectIds: number[]
): Promise<Map<number, AccidentParty[]>> {
  const result = new Map<number, AccidentParty[]>();
  if (objectIds.length === 0) return result;

  const batchSize = 100;
  const batches: number[][] = [];
  for (let i = 0; i < objectIds.length; i += batchSize) {
    batches.push(objectIds.slice(i, i + batchSize));
  }

  const concurrency = 4;
  for (let i = 0; i < batches.length; i += concurrency) {
    const slice = batches.slice(i, i + concurrency);
    await Promise.allSettled(
      slice.map(async (batch) => {
        const body = new URLSearchParams({
          objectIds: batch.join(','),
          relationshipId: '0',
          outFields:
            'VKL_NUMMER,NUMMER,OTE_ID,OTE_AN,LKE_ID,GESLACHT,DOORRIJDER,UITGPOS1,VOORGBEW,BWG_ID_1',
          f: 'json',
        });

        const resp = await fetch(`${ARCGIS_BASE_URL}/0/queryRelatedRecords`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
          signal: AbortSignal.timeout(12000),
        });

        if (!resp.ok) return;
        const data: any = await resp.json();
        if (Array.isArray(data.relatedRecordGroups)) {
          for (const group of data.relatedRecordGroups) {
            const rawRecords = Array.isArray(group.relatedRecords)
              ? group.relatedRecords
              : [];
            const parties: AccidentParty[] = rawRecords
              .map((rec: any) => {
                const p = rec.attributes || {};
                return {
                  nummer: Number(p.NUMMER || 1),
                  oteId: String(p.OTE_ID || p.OTE_AN || 'Onbekend').trim(),
                  leeftijd: String(p.LKE_ID || '').trim(),
                  geslacht: String(p.GESLACHT || '').trim(),
                  doorrijder: String(p.DOORRIJDER || '').trim(),
                  uitgangspositie: String(p.UITGPOS1 || '').trim(),
                  voorgenomenBeweging: String(p.VOORGBEW || '').trim(),
                  beweging: String(p.BWG_ID_1 || '').trim(),
                };
              })
              .sort((a: AccidentParty, b: AccidentParty) => a.nummer - b.nummer);
            result.set(Number(group.objectId), parties);
          }
        }
      })
    );
  }

  return result;
}

/**
 * Live scrapes ArcGIS FeatureServer/0 (Verkeersongevallen) and FeatureServer/2 (Partijen)
 * for Gemeente Steenwijkerland as prescribed in Verkeersongevallen_a1cb8a3c.html
 */
async function syncArcGISVerkeersongevallen(onlyRecentYears = false): Promise<{
  syncedCount: number;
  totalCount: number;
}> {
  if (isSyncingInBackground) {
    return { syncedCount: 0, totalCount: accidentsStore.size };
  }
  isSyncingInBackground = true;
  let syncedCount = 0;

  try {
    const whereClause = onlyRecentYears
      ? "GME_NAAM='Steenwijkerland' AND JAAR_VKL >= 2023"
      : "GME_NAAM='Steenwijkerland'";

    const allFeatures: any[] = [];
    for (let offset = 0; offset < 10000; offset += 2000) {
      const queryUrl = `${ARCGIS_BASE_URL}/0/query?where=${encodeURIComponent(
        whereClause
      )}&outFields=*&outSR=4326&resultOffset=${offset}&resultRecordCount=2000&orderByFields=OBJECTID+ASC&f=json`;

      const resp = await fetch(queryUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) break;
      const data: any = await resp.json();
      if (!Array.isArray(data.features) || data.features.length === 0) break;
      allFeatures.push(...data.features);
      if (data.features.length < 2000) break;
    }

    // Filter strictly inside Gemeente Steenwijkerland polygon
    const insideFeatures = allFeatures.filter(
      (f) =>
        f &&
        f.geometry &&
        typeof f.geometry.x === 'number' &&
        typeof f.geometry.y === 'number' &&
        isPointInSteenwijkerland(f.geometry.y, f.geometry.x)
    );

    // Determine which objectIds need party lookups (new records or records missing parties)
    const objectIdsNeedingParties: number[] = [];
    for (const f of insideFeatures) {
      const a = f.attributes || {};
      const vkl = String(a.VKL_NUMMER || '').trim();
      const existing = accidentsStore.get(vkl);
      if (
        !existing ||
        (existing.partijen.length === 0 && Number(a.ANTL_PTJ || 0) > 0)
      ) {
        objectIdsNeedingParties.push(Number(a.OBJECTID));
      }
    }

    const partyMap = await fetchRelatedPartiesForObjectIds(objectIdsNeedingParties);

    for (const f of insideFeatures) {
      const a = f.attributes || {};
      const vklNummer = String(a.VKL_NUMMER || '').trim();
      if (!vklNummer) continue;

      const lat = Number(f.geometry.y.toFixed(6));
      const lng = Number(f.geometry.x.toFixed(6));
      const existing = accidentsStore.get(vklNummer);
      const fetchedParties = partyMap.get(Number(a.OBJECTID));
      const partijen =
        fetchedParties && fetchedParties.length > 0
          ? fetchedParties
          : existing?.partijen || [];

      const record: TrafficAccident = {
        objectId: Number(a.OBJECTID),
        vklNummer,
        regNummer: String(a.REGNUMMER || '').trim(),
        jaar: Number(a.JAAR_VKL || 2025),
        dagtype: String(a.DAGTYPE || '').trim(),
        ernst: String(a.AP3_CODE || 'Uitsluitend materiele schade').trim(),
        aantalPartijen: Number(a.ANTL_PTJ ?? partijen.length),
        aardOngeval: String(a.AOL_ID || 'Onbekend').trim(),
        niveauKop: String(a.NIVEAUKOP || '').trim(),
        wegsituatie: String(a.WSE_ID || a.WSE_AN || '').trim(),
        bebouwdeKom: String(a.BEBKOM || '').trim(),
        maxSnelheid: a.MAXSNELHD ? Number(a.MAXSNELHD) : null,
        wegverlichting: String(a.WVL_ID || '').trim(),
        wegverharding: String(a.WVG_ID || a.WVG_AN || '').trim(),
        wegdek: String(a.WDK_ID || a.WDK_AN || '').trim(),
        lichtgesteldheid: String(a.LGD_ID || '').trim(),
        weergesteldheid: String(a.WGD_CODE_1 || a.WGD_CODE_2 || '').trim(),
        bijzonderheidInfra: String(a.BZD_ID_IF1 || a.BZD_IF_AN || '').trim(),
        bijzonderheidMaatregel: String(a.BZD_ID_VM1 || a.BZD_VM_AN || '').trim(),
        bijzonderheidTijdelijk: String(a.BZD_ID_TA1 || a.BZD_TA_AN || '').trim(),
        wvkId: a.WVK_ID ? String(a.WVK_ID) : '',
        jteId: a.JTE_ID ? String(a.JTE_ID) : '',
        hectometer: a.HECTOMETER ? String(a.HECTOMETER).trim() : '',
        huisnummer: a.HUISNUMMER ? String(a.HUISNUMMER).trim() : '',
        gmeNaam: String(a.GME_NAAM || 'Steenwijkerland').trim(),
        kern: existing?.kern || findClosestKern(lat, lng),
        lat,
        lng,
        partijen,
      };

      accidentsStore.set(vklNummer, record);
      syncedCount++;
    }

    lastSyncedTimestamp = new Date().toISOString();
    if (syncedCount > 0) {
      saveAccidentsToDisk();
    }
  } catch (e) {
    console.warn('ArcGIS BRON sync error:', e);
  } finally {
    isSyncingInBackground = false;
  }

  return { syncedCount, totalCount: accidentsStore.size };
}

loadAccidentsFromDisk();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // 1. Get all Steenwijkerland traffic accidents (2003–2025) strictly inside municipal polygon
  app.get('/api/ongevallen', (_req, res) => {
    const all = Array.from(accidentsStore.values());
    res.json({
      source: 'ArcGIS BRON Verkeersongevallen (c6846c5e16064267ba3702f08b261ba2)',
      lastSynced: lastSyncedTimestamp,
      totalCount: all.length,
      accidents: all,
    });
  });

  // 2. Get single accident detail & lazy-load related Partijen from ArcGIS if not yet cached
  app.get('/api/ongevallen/:vklNummer', async (req, res) => {
    const vklNummer = String(req.params.vklNummer || '').trim();
    const acc = accidentsStore.get(vklNummer);
    if (!acc) {
      res.status(404).json({ error: 'Verkeersongeval niet gevonden' });
      return;
    }

    if (acc.partijen.length === 0 && acc.objectId) {
      try {
        const fetched = await fetchRelatedPartiesForObjectIds([acc.objectId]);
        const parties = fetched.get(acc.objectId);
        if (parties && parties.length > 0) {
          acc.partijen = parties;
          accidentsStore.set(vklNummer, acc);
          saveAccidentsToDisk();
        }
      } catch {
        // ignore network error
      }
    }

    res.json({ accident: acc });
  });

  // 3. Trigger live ArcGIS FeatureServer scrape & sync
  app.post('/api/ongevallen/sync', async (req, res) => {
    const full = req.body?.full === true;
    const result = await syncArcGISVerkeersongevallen(!full);
    const all = Array.from(accidentsStore.values());
    res.json({
      ok: true,
      syncedCount: result.syncedCount,
      totalCount: result.totalCount,
      lastSynced: lastSyncedTimestamp,
      accidents: all,
    });
  });

  // 4. Direct CSV Export endpoint
  app.get('/api/ongevallen/export.csv', (req, res) => {
    const minYear = Number(req.query.minYear) || 2003;
    const maxYear = Number(req.query.maxYear) || 2025;
    const kern = String(req.query.kern || '').trim();
    const ernst = String(req.query.ernst || '').trim();

    const filtered = Array.from(accidentsStore.values()).filter((a) => {
      if (a.jaar < minYear || a.jaar > maxYear) return false;
      if (kern && a.kern !== kern) return false;
      if (ernst && a.ernst !== ernst) return false;
      return true;
    });

    const csv = exportAccidentsToCSV(filtered);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="verkeersongevallen_steenwijkerland_${minYear}_${maxYear}.csv"`
    );
    res.send(csv);
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Verkeersongevallen Steenwijkerland server running on http://localhost:${PORT}`
    );
    // Run a non-blocking check for any missing parties in the background on startup
    if (accidentsStore.size === 0) {
      syncArcGISVerkeersongevallen(false).catch(() => {});
    } else {
      syncArcGISVerkeersongevallen(true).catch(() => {});
    }
  });
}

startServer();
