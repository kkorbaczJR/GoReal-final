/**
 * The Firebase project that holds GoReal accounts. A Firebase web config is public by design: what keeps
 * accounts safe is the list of allowed domains in the Firebase console and the rules in `firestore.rules`.
 * Empty values mean accounts are off and the app works on this phone only, as before.
 *
 * `NEXT_PUBLIC_FIREBASE_EMULATOR=127.0.0.1` points the app at the local Firebase emulators instead
 * (`npm run accounts:emulators`), with a made-up `demo-` project that never reaches Google.
 */
const PROJECT = {
  apiKey: "AIzaSyAsp7ux6V6eV0t7T9Pa3KugqcAts69lZMQ",
  authDomain: "goreal-40ba2.firebaseapp.com",
  projectId: "goreal-40ba2",
  appId: "1:408689011746:web:b64aab4797ed1ead81ee7b",
};

export const EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR ?? "";

const DEMO = {
  apiKey: "demo-key",
  authDomain: "demo-goreal.firebaseapp.com",
  projectId: "demo-goreal",
  appId: "demo-app",
};

export const FIREBASE_CONFIG = EMULATOR_HOST ? DEMO : PROJECT;

export const accountsEnabled = FIREBASE_CONFIG.apiKey !== "" && FIREBASE_CONFIG.projectId !== "";
