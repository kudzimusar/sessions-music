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
latest_migration="${SITES_PROJECT_ROOT}/dist/.openai/drizzle/0017_corporate_control_plane_indexes.sql"

if [[ ! -s "${hosting_artifact}" ]]; then
  echo "Sites build is invalid: dist/.openai/hosting.json was not packaged." >&2
  exit 70
fi
if [[ ! -s "${latest_migration}" ]]; then
  echo "Sites build is invalid: Phase 4 D1 migrations were not packaged." >&2
  exit 70
fi

node --input-type=module -e '
  import {readFileSync} from "node:fs";
  const config=JSON.parse(readFileSync(process.argv[1],"utf8"));
  if(config.project_id!=="appgprj_6a9530e0c2548191b905ccc3a663dc4d") throw new Error("Unexpected Sites project_id in packaged hosting config");
  if(config.d1!=="DB"||config.r2!=="BUCKET") throw new Error("Expected DB/R2 Sites bindings are missing from packaged hosting config");
' "${hosting_artifact}"

echo "Sites deployment artifact verified: hosting linkage and Phase 4 migrations are packaged."
