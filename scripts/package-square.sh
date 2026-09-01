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

img_dir="${out}/.next/standalone/node_modules/@img"
if [ -d "${img_dir}" ]; then
  tmp="$(mktemp -d)"
  for target in ${SQUARE_SHARP_TARGETS:-sharp-linux-x64 sharp-libvips-linux-x64}; do
    version="$(node -p "const p=require('./node_modules/sharp/package.json'); p.optionalDependencies['@img/${target}'] || p.version")"
    rm -f "${tmp}"/*.tgz
    if ! (cd "${tmp}" && npm pack "@img/${target}@${version}" >/dev/null 2>&1); then
      echo "package-square: could not fetch @img/${target}@${version}" >&2
      exit 1
    fi
    tarball="$(ls "${tmp}"/*.tgz | head -1)"
    rm -rf "${img_dir:?}/${target}"
    mkdir -p "${img_dir}/${target}"
    tar -xzf "${tarball}" -C "${img_dir}/${target}" --strip-components=1
  done
  rm -rf "${tmp}"
  for stale in "${img_dir}"/*; do
    name="$(basename "${stale}")"
    case " colour ${SQUARE_SHARP_TARGETS:-sharp-linux-x64 sharp-libvips-linux-x64} " in
      *" ${name} "*) ;;
      *) rm -rf "${stale}" ;;
    esac
  done
  echo "package-square: linux sharp binaries installed"
fi

echo "package-square: deploy tree ready at ${out}"
