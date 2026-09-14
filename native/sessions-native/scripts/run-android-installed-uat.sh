#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npx expo prebuild --clean --platform android
npx expo run:android --variant release --no-bundler
adb shell pm path com.sessionstech.sessions.uat | grep '^package:'

UAT_STATUS=0
maestro test .maestro/phase1-5-smoke.yml || UAT_STATUS=$?
if [ "$UAT_STATUS" -eq 0 ]; then maestro test .maestro/native-diagnostics.yml || UAT_STATUS=$?; fi
if [ "$UAT_STATUS" -eq 0 ]; then maestro test .maestro/phase5-operations.yml || UAT_STATUS=$?; fi

mkdir -p uat-evidence/android-maestro
cp -R "$HOME/.maestro/tests/." uat-evidence/android-maestro/ 2>/dev/null || true
adb logcat -d -v threadtime > uat-evidence/android-logcat.txt 2>&1 || true
adb exec-out screencap -p > uat-evidence/android-installed-uat.png 2>/dev/null || true

exit "$UAT_STATUS"
