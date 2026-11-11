/**
 * Runs in <head> before the app loads. The browser offers the install only once and early, so this keeps
 * the offer for later (and stops Chrome's own install bar, since GoReal shows its own card).
 */
export const installScript = `(function(){
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__gorealInstall=e;window.dispatchEvent(new Event("goreal:install"));});
window.addEventListener("appinstalled",function(){window.__gorealInstall=null;window.__gorealInstalled=true;window.dispatchEvent(new Event("goreal:install"));});
})();`;
