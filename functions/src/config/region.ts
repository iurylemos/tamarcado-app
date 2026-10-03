import { setGlobalOptions } from 'firebase-functions/v2';

export const functionRegion = 'southamerica-east1';

setGlobalOptions({ region: functionRegion, maxInstances: 10 });
