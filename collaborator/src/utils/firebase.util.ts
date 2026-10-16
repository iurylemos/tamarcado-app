import type { FirestoreSettings } from 'firebase/firestore';

export class FirebaseUtil {
  public static readonly defaultProjectIdEmulator: string = 'demo-tamarcado';
  public static readonly region: string = 'southamerica-east1';
  public static readonly defaultFirestore: string = '(default)';
  public static readonly defaultIdEmulator: string = '1:123456789:web:emulator';
  public static readonly defaultKeyEmulator: string = 'emulator-only';

  public static readonly firestoreSettings: FirestoreSettings = {
    experimentalAutoDetectLongPolling: true,
  };
}
