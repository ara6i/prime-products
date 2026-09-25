#!/usr/bin/env bash
set -euo pipefail

merchant_app_dir="${MERCHANT_APP_DIR:-$(pwd)}"
merchant_static_root="${MERCHANT_STATIC_ROOT:-/var/www/merchants.primestyleai.com}"
merchant_release_label="${MERCHANT_RELEASE_LABEL:-$(date -u +%Y%m%d-%H%M%S)}"
merchant_dist_dir="${PRIME_PRODUCTS_DIST_DIR:-.next-merchant}"

if [[ ! "$merchant_release_label" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Invalid merchant release label: $merchant_release_label" >&2
  exit 1
fi

if [[ "$merchant_dist_dir" == /* || "$merchant_dist_dir" == *".."* ]]; then
  echo "Merchant build directory must stay inside the application directory." >&2
  exit 1
fi

if [[ "$merchant_static_root" == "/" || -z "$merchant_static_root" ]]; then
  echo "Refusing to use an unsafe merchant static root." >&2
  exit 1
fi

cd "$merchant_app_dir"

if [[ ! -f package.json || ! -f app/merchants/page.tsx ]]; then
  echo "Merchant application source was not found in $merchant_app_dir." >&2
  exit 1
fi

if [[ "${MERCHANT_SKIP_BUILD:-false}" == "true" ]]; then
  echo "Using the existing merchant-specific build in $merchant_dist_dir..."
else
  echo "Building the merchant-specific static pages..."
  NEXT_PUBLIC_API_URL="" \
  NEXT_PUBLIC_API_BASE_URL="" \
  PRIME_PRODUCTS_DIST_DIR="$merchant_dist_dir" \
  PRIME_PRODUCTS_USE_PACKAGED_SDK="true" \
  PRIME_MERCHANT_STATIC_EXPORT="true" \
  npm run build
fi

merchant_build_root="$merchant_app_dir/$merchant_dist_dir"
merchant_releases_root="$merchant_static_root/releases"
merchant_release_dir="$merchant_releases_root/$merchant_release_label"
merchant_temporary_release="$merchant_releases_root/.${merchant_release_label}.tmp"
merchant_temporary_link="$merchant_static_root/.current-${merchant_release_label}"

required_merchant_build_files=(
  "$merchant_build_root/server/app/merchants.html"
  "$merchant_build_root/server/app/merchants.rsc"
  "$merchant_build_root/server/app/privacy-policy.html"
  "$merchant_build_root/server/app/privacy-policy.rsc"
  "$merchant_build_root/server/app/terms.html"
  "$merchant_build_root/server/app/terms.rsc"
)

for merchant_build_file in "${required_merchant_build_files[@]}"; do
  if [[ ! -s "$merchant_build_file" ]]; then
    echo "Missing merchant build artifact: $merchant_build_file" >&2
    exit 1
  fi
done

mkdir -p "$merchant_releases_root"

if [[ -e "$merchant_release_dir" || -e "$merchant_temporary_release" ]]; then
  echo "Merchant release already exists: $merchant_release_label" >&2
  exit 1
fi

cleanup_merchant_temporary_files() {
  if [[ -n "${merchant_temporary_release:-}" && -d "$merchant_temporary_release" ]]; then
    rm -rf -- "$merchant_temporary_release"
  fi
  if [[ -n "${merchant_temporary_link:-}" && -L "$merchant_temporary_link" ]]; then
    rm -- "$merchant_temporary_link"
  fi
}
trap cleanup_merchant_temporary_files EXIT

mkdir -p \
  "$merchant_temporary_release/_next" \
  "$merchant_temporary_release/merchants" \
  "$merchant_temporary_release/privacy-policy" \
  "$merchant_temporary_release/terms"

cp -a "$merchant_build_root/static" "$merchant_temporary_release/_next/static"

mkdir -p "$merchant_temporary_release/media" "$merchant_temporary_release/images"
cp -a public/media/partner-landing "$merchant_temporary_release/media/partner-landing"
cp -a public/media/merchant-dashboard "$merchant_temporary_release/media/merchant-dashboard"
cp -a public/images/landing "$merchant_temporary_release/images/landing"

install -m 0644 "$merchant_build_root/server/app/merchants.html" "$merchant_temporary_release/index.html"
install -m 0644 "$merchant_build_root/server/app/merchants.rsc" "$merchant_temporary_release/index.rsc"
install -m 0644 "$merchant_build_root/server/app/privacy-policy.html" "$merchant_temporary_release/privacy-policy/index.html"
install -m 0644 "$merchant_build_root/server/app/privacy-policy.rsc" "$merchant_temporary_release/privacy-policy.rsc"
install -m 0644 "$merchant_build_root/server/app/terms.html" "$merchant_temporary_release/terms/index.html"
install -m 0644 "$merchant_build_root/server/app/terms.rsc" "$merchant_temporary_release/terms.rsc"
install -m 0644 app/icon.svg "$merchant_temporary_release/icon.svg"
install -m 0644 app/merchants/icon.png "$merchant_temporary_release/merchants/icon.png"

node - "$merchant_temporary_release" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const releaseRoot = process.argv[2];
const htmlFiles = [
  "index.html",
  "privacy-policy/index.html",
  "terms/index.html",
];

for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(path.join(releaseRoot, htmlFile), "utf8");

  if (html.includes("/_next/image?")) {
    throw new Error(`${htmlFile} still depends on the dynamic Next image endpoint.`);
  }

  for (const match of html.matchAll(/(?:href|src)="(\/(?:_next\/static|media|images)\/[^"?#]+|\/merchants\/icon\.png|\/icon\.svg)["?#]/g)) {
    const assetPath = decodeURIComponent(match[1]).replace(/^\//, "");
    if (!fs.existsSync(path.join(releaseRoot, assetPath))) {
      throw new Error(`${htmlFile} references a missing static asset: ${match[1]}`);
    }
  }
}

const merchantHome = fs.readFileSync(path.join(releaseRoot, "index.html"), "utf8");
if (merchantHome.includes('id="ai-fitting"')) {
  throw new Error("The hidden interactive SDK section is present in the merchant release.");
}

const merchantHomeLinks = merchantHome.match(/href="\/merchants"/g) || [];
if (merchantHomeLinks.length < 2) {
  throw new Error("Merchant header and footer logos must both point to /merchants.");
}
NODE

mv -- "$merchant_temporary_release" "$merchant_release_dir"
merchant_temporary_release=""

ln -s "$merchant_release_dir" "$merchant_temporary_link"
node - "$merchant_temporary_link" "$merchant_static_root/current" <<'NODE'
const fs = require("node:fs");

fs.renameSync(process.argv[2], process.argv[3]);
NODE
merchant_temporary_link=""

echo "Merchant static release is active: $merchant_release_dir"
