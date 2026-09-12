// Compares the live Supabase schema against supabase/schema.snapshot.json.
//
// WHY THIS EXISTS
// The repo and the database drifted apart and nothing noticed. guests.party_size
// was created by hand as `not null default 1` while supabase/schema.sql declared
// it nullable; every guest saved with a blank party size failed, and the only
// reason it surfaced was someone reading the column definition by chance. Four
// other columns had drifted the same way — a check constraint the repo did not
// know about, two defaults applied by hand, one of them (`invite_or_not default
// 'NULL'`) a value its own constraint rejects.
//
// WHAT IT CATCHES
// Any change to the live schema that has not been recorded in the repo: a column
// added or dropped, a type, default or nullability changed, a check constraint
// added, removed or edited. The snapshot is committed, so a legitimate schema
// change shows up as a reviewable diff in the pull request that makes it, and an
// illegitimate one shows up as a red check.
//
// WHAT IT DOES NOT CATCH
// It does not verify that supabase/schema.sql would REPRODUCE the live database
// — it compares live against the last blessed snapshot, not against the SQL. So
// re-blessing a bad state with `--update` still hides it; read the snapshot diff
// in review, it is the point of the whole thing. Proving the SQL reproduces the
// database means applying schema.sql to a throwaway Postgres and diffing that,
// which is a bigger job and worth doing if this ever stops being enough.
//
// Usage:
//   npm run db:check              compare, exit 1 on drift
//   npm run db:check -- --update  re-bless the snapshot from the live database
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SNAPSHOT = "supabase/schema.snapshot.json";
const update = process.argv.includes("--update");

// Next loads .env.local automatically; a bare node script does not. Parsed here
// rather than pulling in dotenv — it is a handful of KEY=value lines, and the
// script has to work in CI where the values come from secrets and no file
// exists at all.
function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

// Flatten the snapshot into two maps of stable key -> description. Comparing
// maps rather than the raw JSON means a drift is reported as the one line that
// changed, instead of a wall of reordered array elements.
function flatten(snapshot) {
  const columns = new Map();
  for (const c of snapshot.columns ?? []) {
    columns.set(
      `${c.table}.${c.column}`,
      `${c.type}, ${c.nullable === "YES" ? "nullable" : "not null"}, default ${c.default ?? "none"}`
    );
  }
  const checks = new Map();
  for (const c of snapshot.checks ?? []) {
    checks.set(`${c.table}.${c.name}`, c.definition);
  }
  return { columns, checks };
}

function diff(expected, actual, label, out) {
  for (const [key, want] of expected) {
    if (!actual.has(key)) out.push(`  - ${label} ${key}\n      in repo, MISSING from database: ${want}`);
    else if (actual.get(key) !== want) {
      out.push(`  ~ ${label} ${key}\n      repo:     ${want}\n      database: ${actual.get(key)}`);
    }
  }
  for (const [key, got] of actual) {
    if (!expected.has(key)) out.push(`  + ${label} ${key}\n      in database, NOT in repo: ${got}`);
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Deliberately a hard failure, not a skip. A check that quietly passes when it
// could not run is worse than no check: it reads green forever while the thing
// it guards rots. CI decides whether to run this job at all; if it runs, it runs
// for real.
if (!url || !key) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n" +
      "  Locally they come from .env.local (see supabase/SETUP.md).\n" +
      "  In CI they come from repository secrets."
  );
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase.rpc("schema_snapshot");

if (error) {
  const missing = /schema_snapshot|PGRST202|does not exist/i.test(error.message ?? "");
  fail(
    `could not read the schema: ${error.message}` +
      (missing
        ? "\n\n  The schema_snapshot() function is missing. Run supabase/schema.sql\n" +
          "  in the Supabase SQL editor — it creates the function and grants it\n" +
          "  to service_role."
        : "")
  );
}

if (update) {
  writeFileSync(SNAPSHOT, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  const { columns, checks } = flatten(data);
  console.log(`✓ ${SNAPSHOT} updated — ${columns.size} columns, ${checks.size} check constraints.`);
  console.log("  Review the diff before committing: it is the record of what changed.");
  process.exit(0);
}

if (!existsSync(SNAPSHOT)) {
  fail(`${SNAPSHOT} does not exist. Create it with:  npm run db:check -- --update`);
}

const expected = flatten(JSON.parse(readFileSync(SNAPSHOT, "utf8")));
const actual = flatten(data);
const out = [];
diff(expected.columns, actual.columns, "column", out);
diff(expected.checks, actual.checks, "check ", out);

if (out.length === 0) {
  console.log(
    `✓ database matches ${SNAPSHOT} — ${expected.columns.size} columns, ${expected.checks.size} check constraints.`
  );
  process.exit(0);
}

console.error(`\n✗ the live database and ${SNAPSHOT} disagree:\n`);
console.error(out.join("\n\n"));
console.error(
  "\n\nIf the database is right, re-bless it and commit the diff:\n" +
    "    npm run db:check -- --update\n\n" +
    "If the repo is right, apply supabase/schema.sql in the Supabase SQL editor.\n" +
    "Its RECONCILE section corrects constraints and defaults in place.\n"
);
process.exit(1);
