/**
 * Where the app is served from. Empty everywhere except the GitHub Pages site, which lives under
 * `/<repository name>`. Links and `router` calls add it by themselves; plain strings (the service worker,
 * notification icons, the manifest) need it added by hand.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
