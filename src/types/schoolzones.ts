export interface SchoolZone {
  id: string;
  wvkId: string;
  schoolName: string;
  address: string;
  street: string;
  houseNumber: string;
  brin6: string;
  aanduidingZone: string; // e.g. "markering", "bebording", "markering en bebording", "geen schoolzone (BAG locatie)"
  isActieveSchoolzone: boolean;
  tekstWeg: string;
  tekstBord: string;
  zoneNummer: string;
  gevalideerdDoorGemeente: boolean;
  beginDatum: string;
  datumBord: string;
  jaarLuchtfoto: string;
  lat: number;
  lng: number;
  coordinates: [number, number][]; // [lat, lng] polyline points
}

export type SchoolZoneFilter = 'all' | 'active_only';
