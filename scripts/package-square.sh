#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${root}/square-deploy"

cd "${root}"

# --webpack, not the default bundler. Turbopack externalises a package like
# `pg` as `import("pg-<hash>")`, a synthetic specifier that only resolves
# through a hook Next installs in-process; on Square Cloud that hook did not
# take, and every request that opened the pool died with
# ERR_MODULE_NOT_FOUND for a package by that name. Webpack emits
# `import("pg")`, which is a real specifier Node resolves against the
# node_modules the standalone output already ships. The end-to-end suite
# builds this way too, so the deploy is now the artefact the tests ran on.
npm run build -- --webpack

if [ ! -d "${root}/.next/standalone" ]; then
  echo "package-square: .next/standalone is missing; is output: \"standalone\" set in next.config.ts?" >&2
  exit 1
fi

# A specifier like `pg-587764f78a6c7a9c` is not a package: it is a name the
# bundler invented, expecting to resolve it itself at runtime. One of those in
# the output means the deploy will die on whichever request first needs it, and
# it will say the package is missing when the package is right there. Refusing
# here costs a build; not refusing cost a production outage.
synthetic="$(grep -rhoE '"[a-z0-9@/._-]+-[0-9a-f]{16}"' "${root}/.next/standalone/.next/server" 2>/dev/null | sort -u || true)"
if [ -n "${synthetic}" ]; then
  echo "package-square: the build carries synthetic module specifiers, which do not resolve outside the builder:" >&2
  echo "${synthetic}" | head -5 >&2
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
