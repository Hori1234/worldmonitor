import type { 
  AviationServiceHandler,
  ServerContext,
  GetOpenSkyRadarRequest,
  GetOpenSkyRadarResponse
} from '../../../../src/generated/server/worldmonitor/aviation/v1/service_server';

export const getOpenSkyRadar: AviationServiceHandler['getOpenSkyRadar'] = async (
  _ctx: ServerContext,
  req: GetOpenSkyRadarRequest
): Promise<GetOpenSkyRadarResponse> => {
  // Build OpenSky Network API URL
  const url = new URL('https://opensky-network.org/api/states/all');
  
  if (req.lamin && req.lomin && req.lamax && req.lomax) {
    url.searchParams.append('lamin', req.lamin.toString());
    url.searchParams.append('lomin', req.lomin.toString());
    url.searchParams.append('lamax', req.lamax.toString());
    url.searchParams.append('lomax', req.lomax.toString());
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`OpenSky API error: ${response.status}`);
  }

  const data: any = await response.json();

  // Map the raw state vectors array to the proto definition
  const states = (data.states || []).map((state: any[]) => ({
    icao24: String(state[0]),
    callsign: state[1] ? String(state[1]).trim() : "",
    originCountry: String(state[2]),
    timePosition: state[3] ? Number(state[3]) : undefined,
    lastContact: state[4] ? Number(state[4]) : undefined,
    longitude: state[5] ?? undefined,
    latitude: state[6] ?? undefined,
    baroAltitude: state[7] ?? undefined,
    onGround: Boolean(state[8]),
    velocity: state[9] ?? undefined,
    trueTrack: state[10] ?? undefined,
    verticalRate: state[11] ?? undefined,
    sensors: Array.isArray(state[12]) ? state[12] : [],
    geoAltitude: state[13] ?? undefined,
    squawk: state[14] ? String(state[14]) : undefined,
    spi: Boolean(state[15]),
    positionSource: state[16] ?? 0,
    category: state[17] ?? 0,
  }));

  return {
    time: data.time ? Number(data.time) : Math.floor(Date.now() / 1000),
    states,
  };
};
