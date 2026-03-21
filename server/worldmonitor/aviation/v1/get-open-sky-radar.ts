import type { 
  GetOpenSkyRadarRequest, 
  GetOpenSkyRadarResponse,
  RadarFlightState 
} from '../../../../src/generated/server/worldmonitor/aviation/v1/open_sky_radar';

export const getOpenSkyRadar = async (
  request: GetOpenSkyRadarRequest
): Promise<GetOpenSkyRadarResponse> => {
  // 1. Build the OpenSky Request URL (using bounding box if provided)
  const url = new URL('https://opensky-network.org/api/states/all');
  
  if (request.lamin && request.lomin && request.lamax && request.lomax) {
    url.searchParams.append('lamin', request.lamin.toString());
    url.searchParams.append('lomin', request.lomin.toString());
    url.searchParams.append('lamax', request.lamax.toString());
    url.searchParams.append('lomax', request.lomax.toString());
  }

  // 2. Fetch the raw array of arrays from OpenSky
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenSky data: ${response.statusText}`);
  }

  const data = await response.json();

  // 3. Map the raw array to the RadarFlightState Protobuf message
  const states: RadarFlightState[] = (data.states || []).map((state: any[]) => ({
    icao24: String(state[0]),
    callsign: state[1] ? String(state[1]).trim() : "",
    origin_country: String(state[2]),
    time_position: state[3] ? BigInt(state[3]) : undefined,
    last_contact: state[4] ? BigInt(state[4]) : undefined,
    longitude: state[5] !== null ? Number(state[5]) : undefined,
    latitude: state[6] !== null ? Number(state[6]) : undefined,
    baro_altitude: state[7] !== null ? Number(state[7]) : undefined,
    on_ground: Boolean(state[8]),
    velocity: state[9] !== null ? Number(state[9]) : undefined,
    true_track: state[10] !== null ? Number(state[10]) : undefined,
    vertical_rate: state[11] !== null ? Number(state[11]) : undefined,
    sensors: Array.isArray(state[12]) ? state[12].map(Number) : [],
    geo_altitude: state[13] !== null ? Number(state[13]) : undefined,
    squawk: state[14] ? String(state[14]) : undefined,
    spi: Boolean(state[15]),
    position_source: state[16] !== null ? Number(state[16]) : 0,
    category: state[17] !== null ? Number(state[17]) : 0,
  }));

  // 4. Return the response matching the proto response structure
  return {
    time: data.time ? BigInt(data.time) : BigInt(Math.floor(Date.now() / 1000)),
    states,
  };
};