import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { FirebaseUtil } from '../utils/firebase.util';
import { app, useEmulators } from './firebase.config';

let instance: Functions | undefined;

// Lazy so the Functions SDK stays off SSR and catalog pages until a callable is needed.
export function getFunctionsInstance(): Functions {
  if (!instance) {
    instance = getFunctions(app, FirebaseUtil.region);
    if (useEmulators) connectFunctionsEmulator(instance, '127.0.0.1', 5001);
  }
  return instance;
}
