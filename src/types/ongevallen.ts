export type ErnstCode = 'Dodelijk' | 'Letsel' | 'Uitsluitend materiele schade';

export interface AccidentParty {
  nummer: number;
  oteId: string; // bijv. Personenauto, Fiets, e-bike, Voetganger, Bestelauto, Vrachtauto, Boom, enz.
  leeftijd?: string;
  geslacht?: string;
  doorrijder?: string;
  uitgangspositie?: string;
  voorgenomenBeweging?: string;
  beweging?: string;
}

export interface TrafficAccident {
  objectId: number;
  vklNummer: string;
  regNummer: string;
  jaar: number;
  dagtype: string;
  ernst: string; // 'Dodelijk' | 'Letsel' | 'Uitsluitend materiele schade'
  aantalPartijen: number;
  aardOngeval: string;
  niveauKop: string;
  wegsituatie: string;
  bebouwdeKom: string;
  maxSnelheid: number | null;
  wegverlichting: string;
  wegverharding: string;
  wegdek: string;
  lichtgesteldheid: string;
  weergesteldheid: string;
  bijzonderheidInfra: string;
  bijzonderheidMaatregel: string;
  bijzonderheidTijdelijk: string;
  wvkId: string;
  jteId: string;
  hectometer: string;
  huisnummer: string;
  gmeNaam: string;
  kern: string;
  lat: number;
  lng: number;
  partijen: AccidentParty[];
}

export type MapRenderMode = 'points' | 'heatmap' | 'both';

export interface AccidentFilterState {
  minYear: number;
  maxYear: number;
  severities: string[]; // empty = all
  partyType: string; // '' = all
  aardOngeval: string; // '' = all
  wegsituatie: string; // '' = all
  bebouwdeKom: string; // '' = all
  maxSnelheid: string; // '' = all
  lichtgesteldheid: string; // '' = all
  weergesteldheid: string; // '' = all
  kern: string; // '' = all
  searchQuery: string; // VKL_NUMMER, REGNUMMER, WVK_ID, kern
  onlyVulnerableParticipants: boolean; // Fiets, e-bike, Voetganger, Bromfiets, Snorfiets, Scootmobiel
}

export const INITIAL_FILTER_STATE: AccidentFilterState = {
  minYear: 2003,
  maxYear: 2025,
  severities: [],
  partyType: '',
  aardOngeval: '',
  wegsituatie: '',
  bebouwdeKom: '',
  maxSnelheid: '',
  lichtgesteldheid: '',
  weergesteldheid: '',
  kern: '',
  searchQuery: '',
  onlyVulnerableParticipants: false,
};

export const VULNERABLE_PARTIES = new Set([
  'Fiets',
  'e-bike',
  'Voetganger',
  'Bromfiets',
  'Snorfiets',
  'Scootmobiel',
]);

// Exact party icon mapping prescribed in the ArcGIS WebMap Arcade expression
export const PARTY_ICON_URLS: Record<string, string> = {
  Personenauto: 'https://i.imgur.com/owN9jZv.png',
  Bestelauto: 'https://i.imgur.com/pSyrmWF.png',
  Fiets: 'https://i.imgur.com/2ZXgoNU.png',
  Bromfiets: 'https://i.imgur.com/g2iSmsN.png',
  'Overig vast object': 'https://i.imgur.com/vhEQSlB.png',
  'Overig wegmeubilair': 'https://i.imgur.com/QWMNOEX.png',
  Vrachtauto: 'https://i.imgur.com/ZjFrgnc.png',
  Lichtmast: 'https://i.imgur.com/TADDP6o.png',
  Snorfiets: 'https://i.imgur.com/MphmK71.png',
  Motor: 'https://i.imgur.com/UuLIsLM.png',
  Trekker: 'https://i.imgur.com/KEYNdKd.png',
  'Onbekend voertuig i.g.v. doorrijder': 'https://i.imgur.com/9P6myTM.png',
  Boom: 'https://i.imgur.com/FLC4TR6.png',
  Voetganger: 'https://i.imgur.com/X23qBQT.png',
  Dier: 'https://i.imgur.com/SUVbpOQ.png',
  'Los voorwerp': 'https://i.imgur.com/ORpLoEP.png',
  Bus: 'https://i.imgur.com/FBN25KY.png',
  'e-bike': 'https://i.imgur.com/AQxA3w3.png',
  Landbouwvoertuig: 'https://i.imgur.com/sfNANP8.png',
  'Trekker met oplegger': 'https://i.imgur.com/uN1Nk2i.png',
  Brommobiel: 'https://i.imgur.com/qir2b54.png',
  Scootmobiel: 'https://i.imgur.com/l2aeoy6.png',
  'Trein/tram': 'https://i.imgur.com/RBTNsKc.png',
};

export function getSeverityMeta(ernst: string): {
  label: string;
  shortLabel: string;
  color: string;
  fillHex: string;
  headerGradient: string;
  radius: number;
  weightScore: number;
} {
  const upper = (ernst || '').toUpperCase().trim();
  if (upper === 'DODELIJK') {
    return {
      label: 'Dodelijk',
      shortLabel: 'Dodelijk',
      color: '#ef4444',
      fillHex: '#e60000', // Exact Esri renderer [230, 0, 0]
      headerGradient: 'linear-gradient(135deg, #b03a2e 0%, #7b2820 100%)',
      radius: 8,
      weightScore: 6,
    };
  }
  if (upper === 'LETSEL') {
    return {
      label: 'Letsel',
      shortLabel: 'Letsel',
      color: '#f59e0b',
      fillHex: '#ffaa00', // Exact Esri renderer [255, 170, 0]
      headerGradient: 'linear-gradient(135deg, #d68910 0%, #9c6508 100%)',
      radius: 6,
      weightScore: 3,
    };
  }
  return {
    label: 'Uitsluitend materiële schade',
    shortLabel: 'Materieel (UMS)',
    color: '#fef08a',
    fillHex: '#ffffbe', // Exact Esri renderer [255, 255, 190]
    headerGradient: 'linear-gradient(135deg, #4b5563 0%, #1f2937 100%)',
    radius: 4.2,
    weightScore: 1,
  };
}

export function filterAccidents(
  accidents: TrafficAccident[],
  filters: AccidentFilterState
): TrafficAccident[] {
  const q = filters.searchQuery.trim().toLowerCase();

  return accidents.filter((acc) => {
    if (acc.jaar < filters.minYear || acc.jaar > filters.maxYear) return false;

    if (filters.severities.length > 0 && !filters.severities.includes(acc.ernst)) {
      return false;
    }

    if (filters.kern && acc.kern !== filters.kern) {
      return false;
    }

    if (filters.aardOngeval && acc.aardOngeval !== filters.aardOngeval) {
      return false;
    }

    if (filters.wegsituatie && acc.wegsituatie !== filters.wegsituatie) {
      return false;
    }

    if (filters.bebouwdeKom && acc.bebouwdeKom !== filters.bebouwdeKom) {
      return false;
    }

    if (filters.maxSnelheid && String(acc.maxSnelheid ?? '') !== filters.maxSnelheid) {
      return false;
    }

    if (filters.lichtgesteldheid && acc.lichtgesteldheid !== filters.lichtgesteldheid) {
      return false;
    }

    if (filters.weergesteldheid && acc.weergesteldheid !== filters.weergesteldheid) {
      return false;
    }

    if (filters.partyType) {
      const hasParty = acc.partijen.some((p) => p.oteId === filters.partyType);
      if (!hasParty) return false;
    }

    if (filters.onlyVulnerableParticipants) {
      const hasVulnerable = acc.partijen.some((p) => VULNERABLE_PARTIES.has(p.oteId));
      if (!hasVulnerable) return false;
    }

    if (q) {
      const matchVkl = acc.vklNummer.toLowerCase().includes(q);
      const matchReg = acc.regNummer.toLowerCase().includes(q);
      const matchKern = acc.kern.toLowerCase().includes(q);
      const matchAard = acc.aardOngeval.toLowerCase().includes(q);
      const matchWvk = acc.wvkId.toLowerCase().includes(q);
      const matchParty = acc.partijen.some((p) => p.oteId.toLowerCase().includes(q));
      if (!matchVkl && !matchReg && !matchKern && !matchAard && !matchWvk && !matchParty) {
        return false;
      }
    }

    return true;
  });
}

export function exportAccidentsToCSV(accidents: TrafficAccident[]): string {
  const headers = [
    'VKL_NUMMER',
    'REGNUMMER',
    'JAAR_VKL',
    'KERN_STEENWIJKERLAND',
    'AP3_CODE_ERNST',
    'AANTAL_PARTIJEN',
    'BETROKKEN_PARTIJEN',
    'AARD_ONGEVAL',
    'WEGSITUATIE',
    'BEBOUWDE_KOM',
    'MAX_SNELHEID_KMU',
    'LICHTGESTELDHEID',
    'WEERGESTELDHEID',
    'WEGVERLICHTING',
    'WEGVERHARDING',
    'WEGDEK',
    'WEGVAK_ID',
    'JUNCTIE_ID',
    'LATITUDE',
    'LONGITUDE',
  ];

  const escapeCsv = (val: unknown): string => {
    const str = String(val ?? '').replace(/\r?\n/g, ' ').trim();
    if (str.includes(';') || str.includes('"') || str.includes(',')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = accidents.map((a) => {
    const partijenText = a.partijen
      .map((p) => `${p.oteId}${p.voorgenomenBeweging ? ` (${p.voorgenomenBeweging})` : ''}`)
      .join(' | ');
    return [
      a.vklNummer,
      a.regNummer,
      a.jaar,
      a.kern,
      a.ernst,
      a.aantalPartijen,
      partijenText,
      a.aardOngeval,
      a.wegsituatie,
      a.bebouwdeKom,
      a.maxSnelheid ?? '',
      a.lichtgesteldheid,
      a.weergesteldheid,
      a.wegverlichting,
      a.wegverharding,
      a.wegdek,
      a.wvkId,
      a.jteId,
      a.lat,
      a.lng,
    ]
      .map(escapeCsv)
      .join(';');
  });

  return '\uFEFF' + [headers.join(';'), ...rows].join('\n');
}
