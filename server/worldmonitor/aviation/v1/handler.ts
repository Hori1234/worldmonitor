import type { AviationServiceHandler } from '../../../../src/generated/server/worldmonitor/aviation/v1/service_server';
import { listAirportDelays } from './list-airport-delays';
import { getOpenSkyRadar } from './get-open-sky-radar';

export const aviationHandler: AviationServiceHandler = {
  listAirportDelays,
  getOpenSkyRadar, // Register the new RPC endpoint here
};

