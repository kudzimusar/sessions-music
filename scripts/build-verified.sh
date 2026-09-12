#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

command -v timeout || {
  echo "build-verified.sh requires GNU timeout." >&2
  exit 69
}

vinext="${SITES_PROJECT_ROOT}/node_modules/.bin/vinext"
if [[ ! -x "${vinext}" ]]; then
  echo "vinext is unavailable. Run npm run install:ci and wait for it to finish before building." >&2
  exit 69
fi

echo "Running bounded vinext build..."
timeout \
  --signal=TERM \
  --kill-after="${SITES_BUILD_KILL_AFTER:-10s}" \
  "${SITES_BUILD_TIMEOUT:-3m}" \
  "${vinext}" build

hosting_artifact="${SITES_PROJECT_ROOT}/dist/.openai/hosting.json"
required_migrations=(
  "0017_corporate_control_plane_indexes.sql"
  "0018_phase45_identity_onboarding.sql"
  "0019_phase5_booking_ops_cases.sql"
)

if [[ ! -s "${hosting_artifact}" ]]; then
  echo "Sites build is invalid: dist/.openai/hosting.json was not packaged." >&2
  exit 70
fi
for migration in "${required_migrations[@]}"; do
  if [[ ! -s "${SITES_PROJECT_ROOT}/dist/.openai/drizzle/${migration}" ]]; then
    echo "Sites build is invalid: required migration ${migration} was not packaged." >&2
    exit 70
  fi
done

node --input-type=module -e '
  import {readFileSync} from "node:fs";
  const config=JSON.parse(readFileSync(process.argv[1],"utf8"));
  if(config.project_id!=="appgprj_6a9530e0c2548191b905ccc3a663dc4d") throw new Error("Unexpected Sites project_id in packaged hosting config");
  if(config.d1!=="DB"||config.r2!=="BUCKET") throw new Error("Expected DB/R2 Sites bindings are missing from packaged hosting config");
' "${hosting_artifact}"

node --input-type=module -e '
  import {readdirSync,readFileSync,statSync} from "node:fs";
  import {join} from "node:path";
  const root=process.argv[1];
  const cssFiles=[];
  const walk=dir=>{for(const name of readdirSync(dir)){const path=join(dir,name);const stat=statSync(path);if(stat.isDirectory())walk(path);else if(name.endsWith(".css"))cssFiles.push(path)}};
  walk(root);
  if(!cssFiles.length)throw new Error("Sites build is invalid: no compiled CSS assets were produced");
  const css=cssFiles.map(path=>readFileSync(path,"utf8")).join("\n");
  if(!/\.registry-app\s*\{[^}]*--r-blue\s*:\s*#4169e1/i.test(css)) throw new Error("Sites build is invalid: compiled CSS lost the Royal Blue registry root");
  if(!/\.registry-app\s+\.brand-symbol\s*\{[^}]*background\s*:\s*#4169e1\s*!important/i.test(css)) throw new Error("Sites build is invalid: compiled CSS lost the Royal Blue brand symbol override");
' "${SITES_PROJECT_ROOT}/dist"

echo "Sites deployment artifact verified: hosting linkage, Phase 4/4.5/5 migrations, and runtime Royal Blue CSS are packaged."
