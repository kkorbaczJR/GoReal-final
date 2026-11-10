// Creates test accounts that start with lots of coins, through the same Firebase REST APIs the app's SDK uses.
// Running it again resets their coins (the rest of their progress stays).
//
//   TESTERS='a@example.com:password1:Tester A,b@example.com:password2:Tester B' \
//   FIREBASE_API_KEY=... FIREBASE_PROJECT_ID=... node scripts/accounts/create-testers.mjs
//
// With FIREBASE_EMULATOR=127.0.0.1 it talks to the local emulators (`npm run accounts:emulators`) instead.
// Passwords come from the environment so they never end up in the repository.

const emulator = process.env.FIREBASE_EMULATOR ?? "";
const apiKey = emulator ? "demo-key" : process.env.FIREBASE_API_KEY;
const projectId = emulator ? "demo-goreal" : process.env.FIREBASE_PROJECT_ID;
const coins = Number(process.env.COINS ?? 10000);
const testers = (process.env.TESTERS ?? "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean)
  .map((t) => {
    const [email, password, ...name] = t.split(":");
    return { email, password, name: name.join(":") || "Tester" };
  });

if (!apiKey || !projectId || testers.length === 0 || testers.some((t) => !t.email || !t.password)) {
  console.error("Set TESTERS (email:password:name, comma separated) and FIREBASE_API_KEY + FIREBASE_PROJECT_ID (or FIREBASE_EMULATOR).");
  process.exit(1);
}

const authBase = emulator ? `http://${emulator}:9099/identitytoolkit.googleapis.com/v1` : "https://identitytoolkit.googleapis.com/v1";
const storeBase = emulator ? `http://${emulator}:8080/v1` : "https://firestore.googleapis.com/v1";

async function call(url, init) {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function signIn({ email, password }) {
  const payload = JSON.stringify({ email, password, returnSecureToken: true });
  const up = await call(`${authBase}/accounts:signUp?key=${apiKey}`, { method: "POST", body: payload });
  if (up.ok) return { ...up.body, created: true };
  if (up.body?.error?.message !== "EMAIL_EXISTS") throw new Error(`${email}: ${up.body?.error?.message ?? up.status}`);
  const inn = await call(`${authBase}/accounts:signInWithPassword?key=${apiKey}`, { method: "POST", body: payload });
  if (!inn.ok) throw new Error(`${email} exists but the password is different: ${inn.body?.error?.message ?? inn.status}`);
  return { ...inn.body, created: false };
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

for (const tester of testers) {
  const { idToken, localId, created } = await signIn(tester);
  const docUrl = `${storeBase}/projects/${projectId}/databases/(default)/documents/users/${localId}`;
  const auth = { authorization: `Bearer ${idToken}` };

  const existing = await call(docUrl, { headers: auth });
  let saved = null;
  if (existing.ok && existing.body.fields?.data?.stringValue) saved = JSON.parse(existing.body.fields.data.stringValue);

  // Anything left out is filled in with the app's defaults when it loads.
  const state = saved?.onboarded
    ? { ...saved, coins }
    : {
        version: 1,
        onboarded: true,
        name: tester.name,
        phoneLimit: 60,
        breakGoal: 30,
        blockedApps: ["TikTok", "Instagram"],
        startedOn: today(),
        coins,
      };

  const rev = Date.now();
  const write = await call(docUrl, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({
      fields: {
        data: { stringValue: JSON.stringify(state) },
        rev: { integerValue: String(rev) },
        updatedAt: { timestampValue: new Date(rev).toISOString() },
      },
    }),
  });
  if (!write.ok) throw new Error(`${tester.email}: saving progress failed: ${JSON.stringify(write.body?.error ?? write.status)}`);
  console.log(`${created ? "created" : "updated"} ${tester.email}: ${coins} coins`);
}
