// Settings for the public version of The First 40 Days.
// This is the ONLY file you need to edit before going live.

// 1) Firebase: paste the config from your NEW Firebase project here
//    (Firebase console → Project settings → Your apps → Web app → "Config").
//    Keep this separate from the family app's project (thefirst40days-2656f).
//    These values are not secret: Firebase web config is meant to be public.
//    Security comes from firestore.rules. Until apiKey is filled in, the app runs in demo mode.
export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// 2) Who runs the app. Shown in the footer, the Privacy Policy and the Terms.
export const BUSINESS_NAME = "";   // e.g. "Patrick Reardon" or your business name
export const BUSINESS_PLACE = "";  // e.g. "Port Washington, New York"
export const SUPPORT_EMAIL = "";   // where families can reach you

// 3) Sign in with Apple. Leave false until it's set up in Firebase
//    (it needs a paid Apple Developer account). Google and email work without it.
export const APPLE_SIGN_IN = false;
