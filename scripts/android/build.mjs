// Builds the web app as static files and copies them into the Android project.
// With --apk it also builds a debug APK (needs the Android SDK, see README).
import { execSync } from "node:child_process";
import { join } from "node:path";

const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });

run("next build", { env: { ...process.env, GOREAL_TARGET: "android" } });
run("cap sync android");

if (process.argv.includes("--apk")) {
  const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  run(`${gradlew} assembleDebug`, { cwd: join(process.cwd(), "android") });
  console.log("\nAPK: android/app/build/outputs/apk/debug/app-debug.apk");
}
