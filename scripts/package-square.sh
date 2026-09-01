#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${root}/square-deploy"

cd "${root}"

npm run build

if [ ! -d "${root}/.next/standalone" ]; then
  echo "package-square: .next/standalone is missing; is output: \"standalone\" set in next.config.ts?" >&2
  exit 1
fi

rm -rf "${out}"
mkdir -p "${out}/.next"

cp -R "${root}/.next/standalone" "${out}/.next/standalone"
cp -R "${root}/.next/static" "${out}/.next/standalone/.next/static"

if [ -d "${root}/public" ]; then
  cp -R "${root}/public" "${out}/.next/standalone/public"
fi

cp "${root}/server.js" "${out}/server.js"
cp "${root}/squarecloud.app" "${out}/squarecloud.app"

if command -v zip >/dev/null 2>&1; then
  rm -f "${root}/square-deploy.zip"
  (cd "${out}" && zip -qry "${root}/square-deploy.zip" .)
  echo "package-square: wrote ${root}/square-deploy.zip"
fi

echo "package-square: deploy tree ready at ${out}"
