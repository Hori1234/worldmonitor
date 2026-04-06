import { db } from './index';
import { openskyPlanes, openskyPlanePositions } from './schema';
import { sql } from 'drizzle-orm';

const DEFINED_NUMBER_OF_HITS = 10; // Number of times a plane is seen before saving a new map position

// Define the shape of the raw array returned by the OpenSky API
export type OpenSkyStateVector = [
  string,    // 0: icao24
  string,    // 1: callsign
  string,    // 2: origin_country
  number,    // 3: time_position
  number,    // 4: last_contact
  number,    // 5: longitude
  number,    // 6: latitude
  number,    // 7: baro_altitude
  boolean,   // 8: on_ground
  number,    // 9: velocity
  number,    // 10: true_track
  number,    // 11: vertical_rate
  number[],  // 12: sensors
  number,    // 13: geo_altitude
  string,    // 14: squawk
  boolean,   // 15: spi
  number,    // 16: position_source
  number     // 17: category
];

/**
 * Process a batch of planes from the OpenSky API.
 * This cycles through each plane, increments its hit counter, 
 * and only saves the detailed spatial/telemetry data if the hit counter hits the threshold.
 * 
 * @param states Array of raw state vectors from `https://opensky-network.org/api/states/all`
 */
export const processOpenSkyData = async (states: OpenSkyStateVector[]) => {
  if (!states || states.length === 0) return;

  try {
    // 1. Process planes sequentially (or chunk them in prod if states array is huge)
    for (const state of states) {
      // Deconstruct the array per the OpenSky spec
      const [
        icao24, callsign, originCountry, timePosition, lastContact,
        longitude, latitude, baroAltitude, onGround, velocity,
        trueTrack, verticalRate, sensors, geoAltitude, squawk,
        spi, positionSource, category
      ] = state;

      if (!icao24) continue;

      // 1. Upsert the plane into the parent table and increment its hit counter
      // This will insert it with counter_hits = 1 if it's new, otherwise +1 to existing
      const updatedPlane = await db.insert(openskyPlanes)
        .values({
          icao24: icao24,
          callsign: callsign?.trim() || null,
          originCountry: originCountry,
          counterHits: 1, // Starting value
        })
        .onConflictDoUpdate({
          target: openskyPlanes.icao24, // If icao24 already exists...
          set: {
            // Increment the counter natively in SQL
            counterHits: sql`${openskyPlanes.counterHits} + 1`,
            // Update callsign if they finally got one
            callsign: callsign?.trim() || sql`${openskyPlanes.callsign}`,
          }
        })
        .returning({ counterHits: openskyPlanes.counterHits }); 
        // We return the updated counter value so we know if it hit the threshold!

      const currentHits = updatedPlane[0]?.counterHits || 1;

      // 2. CYCLIC DB CHECK: 
      // If the number of times we've seen this plane is a multiple of your defined hits...
      if (currentHits % DEFINED_NUMBER_OF_HITS === 0) {
        
        // Save the heavy telemetry data payload
        await db.insert(openskyPlanePositions).values({
          icao24: icao24,
          timePosition: timePosition,
          lastContact: lastContact,
          longitude: longitude,
          latitude: latitude,
          baroAltitude: baroAltitude,
          onGround: onGround,
          velocity: velocity,
          trueTrack: trueTrack,
          verticalRate: verticalRate,
          sensors: sensors || null, // Stored safely as JSON string natively by Drizzle
          geoAltitude: geoAltitude,
          squawk: squawk,
          spi: spi,
          positionSource: positionSource,
          category: category,
        });

        // Debug logging (optional)
        // console.log(`[OpenSky] Saved position for ${icao24} (Hit #${currentHits})`);
      }
    }
  } catch (error) {
    console.error("Failed to process OpenSky batch:", error);
  }
};

/**
 * Fetch all positions for a specific plane, sorted by newest first.
 * @param icao24 Unique aircraft identifier
 */
export const getPlaneHistory = async (icao24: string) => {
  return await db.query.openskyPlanePositions.findMany({
    where: (positions, { eq }) => eq(positions.icao24, icao24),
    orderBy: (positions, { desc }) => [desc(positions.lastContact)],
  });
};