#!/usr/bin/env bash
set -euo pipefail

creator_app_dir="${CREATOR_APP_DIR:-$(pwd)}"
creator_static_root="${CREATOR_STATIC_ROOT:-/var/www/creators.primestyleai.com}"
creator_release_label="${CREATOR_RELEASE_LABEL:-$(date -u +%Y%m%d-%H%M%S)}"
creator_dist_dir="${PRIME_PRODUCTS_DIST_DIR:-.next-creator}"

if [[ ! "$creator_release_label" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Invalid creator release label: $creator_release_label" >&2
  exit 1
fi

if [[ "$creator_dist_dir" == /* || "$creator_dist_dir" == *".."* ]]; then
  echo "Creator build directory must stay inside the application directory." >&2
  exit 1
fi

if [[ "$creator_static_root" == "/" || -z "$creator_static_root" ]]; then
  echo "Refusing to use an unsafe creator static root." >&2
  exit 1
fi

cd "$creator_app_dir"

if [[ ! -f package.json || ! -f app/influencers/page.tsx ]]; then
  echo "Creator application source was not found in $creator_app_dir." >&2
  exit 1
fi

if [[ "${CREATOR_SKIP_BUILD:-false}" == "true" ]]; then
  echo "Using the existing creator-specific build in $creator_dist_dir..."
else
  echo "Building the creator-specific static pages..."
  PRIME_PRODUCTS_DIST_DIR="$creator_dist_dir" \
  PRIME_CREATOR_STATIC_EXPORT="true" \
  npm run build
fi

creator_build_root="$creator_app_dir/$creator_dist_dir"
creator_releases_root="$creator_static_root/releases"
creator_release_dir="$creator_releases_root/$creator_release_label"
creator_temporary_release="$creator_releases_root/.${creator_release_label}.tmp"
creator_temporary_link="$creator_static_root/.current-${creator_release_label}"

required_creator_build_files=(
  "$creator_build_root/server/app/influencers.html"
  "$creator_build_root/server/app/influencers.rsc"
  "$creator_build_root/server/app/privacy-policy.html"
  "$creator_build_root/server/app/privacy-policy.rsc"
  "$creator_build_root/server/app/terms.html"
  "$creator_build_root/server/app/terms.rsc"
)

for creator_build_file in "${required_creator_build_files[@]}"; do
  if [[ ! -s "$creator_build_file" ]]; then
    echo "Missing creator build artifact: $creator_build_file" >&2
    exit 1
  fi
done

mkdir -p "$creator_releases_root"

if [[ -e "$creator_release_dir" || -e "$creator_temporary_release" ]]; then
  echo "Creator release already exists: $creator_release_label" >&2
  exit 1
fi

cleanup_creator_temporary_files() {
  if [[ -n "${creator_temporary_release:-}" && -d "$creator_temporary_release" ]]; then
    rm -rf -- "$creator_temporary_release"
  fi
  if [[ -n "${creator_temporary_link:-}" && -L "$creator_temporary_link" ]]; then
    rm -- "$creator_temporary_link"
  fi
}
trap cleanup_creator_temporary_files EXIT

mkdir -p \
  "$creator_temporary_release/_next" \
  "$creator_temporary_release/influencers" \
  "$creator_temporary_release/privacy-policy" \
  "$creator_temporary_release/terms"

cp -a "$creator_build_root/static" "$creator_temporary_release/_next/static"

mkdir -p "$creator_temporary_release/media"
cp -a public/media/partner-landing "$creator_temporary_release/media/partner-landing"
cp -a public/media/influencer-dashboard "$creator_temporary_release/media/influencer-dashboard"

mkdir -p "$creator_temporary_release/images/landing/ps"
install -m 0644 \
  public/images/landing/logo-footer-6fe3f1.png \
  "$creator_temporary_release/images/landing/logo-footer-6fe3f1.png"
for creator_flag in public/images/landing/ps/ps-flag-*.png; do
  install -m 0644 "$creator_flag" "$creator_temporary_release/images/landing/ps/$(basename "$creator_flag")"
done

install -m 0644 "$creator_build_root/server/app/influencers.html" "$creator_temporary_release/index.html"
install -m 0644 "$creator_build_root/server/app/influencers.rsc" "$creator_temporary_release/index.rsc"
install -m 0644 "$creator_build_root/server/app/privacy-policy.html" "$creator_temporary_release/privacy-policy/index.html"
install -m 0644 "$creator_build_root/server/app/privacy-policy.rsc" "$creator_temporary_release/privacy-policy.rsc"
install -m 0644 "$creator_build_root/server/app/terms.html" "$creator_temporary_release/terms/index.html"
install -m 0644 "$creator_build_root/server/app/terms.rsc" "$creator_temporary_release/terms.rsc"
install -m 0644 app/icon.svg "$creator_temporary_release/icon.svg"
install -m 0644 app/influencers/icon.png "$creator_temporary_release/influencers/icon.png"

node - "$creator_temporary_release" <<'NODE'
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

  for (const match of html.matchAll(/(?:href|src)="(\/_next\/static\/[^"?#]+)["?#]/g)) {
    const assetPath = decodeURIComponent(match[1]).replace(/^\//, "");
    if (!fs.existsSync(path.join(releaseRoot, assetPath))) {
      throw new Error(`${htmlFile} references a missing static asset: ${match[1]}`);
    }
  }
}

const creatorHome = fs.readFileSync(path.join(releaseRoot, "index.html"), "utf8");
const creatorHomeLinks = creatorHome.match(/href="\/influencers"/g) || [];
if (creatorHomeLinks.length < 2) {
  throw new Error("Creator header and footer logos must both point to /influencers.");
}
NODE

mv -- "$creator_temporary_release" "$creator_release_dir"
creator_temporary_release=""

ln -s "$creator_release_dir" "$creator_temporary_link"
node - "$creator_temporary_link" "$creator_static_root/current" <<'NODE'
const fs = require("node:fs");

fs.renameSync(process.argv[2], process.argv[3]);
NODE
creator_temporary_link=""

echo "Creator static release is active: $creator_release_dir"
