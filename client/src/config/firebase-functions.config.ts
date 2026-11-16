import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { FirebaseUtil } from '../utils/firebase.util';
import { firebaseApp, useEmulators } from './firebase.config';

export const functions = getFunctions(firebaseApp, FirebaseUtil.region);

if (useEmulators) {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
