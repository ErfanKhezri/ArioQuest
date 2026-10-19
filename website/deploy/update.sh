#!/usr/bin/env bash
# Installs the latest website build from GitHub, if there is a new one.
#
# Works like backend/deploy/update.sh: CI publishes each build to the
# "website-latest" release, and ario-website-update.timer runs this script
# every minute to pull it. Caddy serves /var/www/arioquest/current.
#
# Install: copy to /var/www/arioquest/update.sh and make it executable.
set -euo pipefail

release_url="https://github.com/ErfanKhezri/ArioQuest/releases/download/website-latest"
site_root="/var/www/arioquest"
download_dir="$site_root/.download"

# version.txt holds the commit the build was made from.
latest_version="$(curl --fail --silent --show-error --location --max-time 30 "$release_url/version.txt")"
installed_version="$(cat "$site_root/version.txt" 2>/dev/null || echo "none")"

if [ "$latest_version" = "$installed_version" ]; then
  exit 0
fi

echo "Updating from $installed_version to $latest_version"

rm -rf "$download_dir"
mkdir -p "$download_dir/site"
trap 'rm -rf "$download_dir"' EXIT

curl --fail --silent --show-error --location --max-time 300 \
  --output "$download_dir/website.tar.gz" "$release_url/website.tar.gz"
curl --fail --silent --show-error --location --max-time 30 \
  --output "$download_dir/website.tar.gz.sha256" "$release_url/website.tar.gz.sha256"

# Stop if the file is damaged or only half downloaded.
(cd "$download_dir" && sha256sum --check --quiet website.tar.gz.sha256)
tar --extract --gzip --file "$download_dir/website.tar.gz" --directory "$download_dir/site"

# Swap the folders: the running site becomes "previous", the new one "current".
# Each mv is instant, so visitors almost never see a half-updated site.
rm -rf "$site_root/previous"
if [ -d "$site_root/current" ]; then
  mv "$site_root/current" "$site_root/previous"
fi
mv "$download_dir/site" "$site_root/current"

echo "$latest_version" > "$site_root/version.txt"
echo "Updated to $latest_version"
