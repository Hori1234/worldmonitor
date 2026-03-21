import {
  AviationServiceClient,
  RadarFlightState as ProtoRadarFlightState,
  type AirportDelayAlert as ProtoAlert,
} from '@/generated/client/worldmonitor/aviation/v1/service_client';
import { createCircuitBreaker } from '@/utils';

// --- Consumer-friendly types (matching legacy shape exactly) ---

export type FlightDelaySource = 'faa' | 'eurocontrol' | 'computed';
export type FlightDelaySeverity = 'normal' | 'minor' | 'moderate' | 'major' | 'severe';
export type FlightDelayType = 'ground_stop' | 'ground_delay' | 'departure_delay' | 'arrival_delay' | 'general' | 'closure';
export type AirportRegion = 'americas' | 'europe' | 'apac' | 'mena' | 'africa';

export interface AirportDelayAlert {
  id: string;
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  region: AirportRegion;
  delayType: FlightDelayType;
  severity: FlightDelaySeverity;
  avgDelayMinutes: number;
  delayedFlightsPct?: number;
  cancelledFlights?: number;
  totalFlights?: number;
  reason?: string;
  source: FlightDelaySource;
  updatedAt: Date;
}

// Consumer-friendly map view of the radar state
export interface FlightState {
  icao24: string;
  callsign: string;
  originCountry: string;
  timePosition?: Date;
  lastContact?: Date;
  longitude?: number;
  latitude?: number;
  baroAltitude?: number;
  onGround: boolean;
  velocity?: number;
  trueTrack?: number;
  verticalRate?: number;
  sensors: number[];
  geoAltitude?: number;
  squawk?: string;
  spi: boolean;
  positionSource: number;
  category: number;
}

// --- Internal: proto -> legacy mapping ---

const SEVERITY_MAP: Record<string, FlightDelaySeverity> = {
  FLIGHT_DELAY_SEVERITY_NORMAL: 'normal',
  FLIGHT_DELAY_SEVERITY_MINOR: 'minor',
  FLIGHT_DELAY_SEVERITY_MODERATE: 'moderate',
  FLIGHT_DELAY_SEVERITY_MAJOR: 'major',
  FLIGHT_DELAY_SEVERITY_SEVERE: 'severe',
};

const DELAY_TYPE_MAP: Record<string, FlightDelayType> = {
  FLIGHT_DELAY_TYPE_GROUND_STOP: 'ground_stop',
  FLIGHT_DELAY_TYPE_GROUND_DELAY: 'ground_delay',
  FLIGHT_DELAY_TYPE_DEPARTURE_DELAY: 'departure_delay',
  FLIGHT_DELAY_TYPE_ARRIVAL_DELAY: 'arrival_delay',
  FLIGHT_DELAY_TYPE_GENERAL: 'general',
  FLIGHT_DELAY_TYPE_CLOSURE: 'closure',
};

const REGION_MAP: Record<string, AirportRegion> = {
  AIRPORT_REGION_AMERICAS: 'americas',
  AIRPORT_REGION_EUROPE: 'europe',
  AIRPORT_REGION_APAC: 'apac',
  AIRPORT_REGION_MENA: 'mena',
  AIRPORT_REGION_AFRICA: 'africa',
};

const SOURCE_MAP: Record<string, FlightDelaySource> = {
  FLIGHT_DELAY_SOURCE_FAA: 'faa',
  FLIGHT_DELAY_SOURCE_EUROCONTROL: 'eurocontrol',
  FLIGHT_DELAY_SOURCE_COMPUTED: 'computed',
};

function toDisplayAlert(proto: ProtoAlert): AirportDelayAlert {
  return {
    id: proto.id,
    iata: proto.iata,
    icao: proto.icao,
    name: proto.name,
    city: proto.city,
    country: proto.country,
    lat: proto.location?.latitude ?? 0,
    lon: proto.location?.longitude ?? 0,
    region: REGION_MAP[proto.region] ?? 'americas',
    delayType: DELAY_TYPE_MAP[proto.delayType] ?? 'general',
    severity: SEVERITY_MAP[proto.severity] ?? 'normal',
    avgDelayMinutes: proto.avgDelayMinutes,
    delayedFlightsPct: proto.delayedFlightsPct || undefined,
    cancelledFlights: proto.cancelledFlights || undefined,
    totalFlights: proto.totalFlights || undefined,
    reason: proto.reason || undefined,
    source: SOURCE_MAP[proto.source] ?? 'computed',
    updatedAt: new Date(proto.updatedAt),
  };
}


function toDisplayFlightState(proto: ProtoRadarFlightState) {
  return {
    icao24: proto.icao24,
    callsign: proto.callsign,
    originCountry: proto.originCountry,
    timePosition: proto.timePosition ? new Date(proto.timePosition * 1000) : undefined,
    lastContact: proto.lastContact ? new Date(proto.lastContact * 1000) : undefined,
    longitude: proto.longitude,
    latitude: proto.latitude,
    baroAltitude: proto.baroAltitude,
    onGround: proto.onGround,
    velocity: proto.velocity,
    trueTrack: proto.trueTrack,
    verticalRate: proto.verticalRate,
    sensors: proto.sensors,
    geoAltitude: proto.geoAltitude,
    squawk: proto.squawk,
    spi: proto.spi,
    positionSource: proto.positionSource,
    category: proto.category,
  };
}



// --- Client + circuit breaker ---

const client = new AviationServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const breaker = createCircuitBreaker<AirportDelayAlert[]>({ name: 'Flight Delays v2', cacheTtlMs: 2 * 60 * 60 * 1000, persistCache: true });

// Note: Circuit breaker typing must match the eventual output mapping to `FlightState`
const radarBreaker = createCircuitBreaker<FlightState[]>({ 
  name: 'OpenSky Radar', 
  cacheTtlMs: 30 * 1000,   // Cache for 30s instead of 2 hours, as radar objects move fast
  persistCache: false 
});
// --- Main fetch (public API) ---

export async function fetchFlightDelays(): Promise<AirportDelayAlert[]> {
  return breaker.execute(async () => {
    const response = await client.listAirportDelays({
      region: 'AIRPORT_REGION_UNSPECIFIED',
      minSeverity: 'FLIGHT_DELAY_SEVERITY_UNSPECIFIED',
      pageSize: 0,
      cursor: '',
    });
    return response.alerts.map(toDisplayAlert);
  }, []);
}



export async function fetchRadar(): Promise<FlightState[]> {
  return radarBreaker.execute(async () => {
    const response = await client.getOpenSkyRadar({});
    
    if (!response.states) return [];
    return response.states.map(toDisplayFlightState);
  }, []);
}