#!/usr/bin/env bash
# Installs the latest backend build from GitHub, if there is a new one.
#
# The server cannot be reached from outside Iran, so GitHub cannot push builds
# to it. Instead, CI publishes each build to the "backend-latest" release, and
# ario-api-update.timer runs this script every minute to pull it.
#
# Install: copy to /opt/ario-api/update.sh and make it executable.
set -euo pipefail

release_url="https://github.com/ErfanKhezri/ArioQuest/releases/download/backend-latest"
install_dir="/opt/ario-api"
download_dir="$install_dir/.download"

# version.txt holds the commit the build was made from.
latest_version="$(curl --fail --silent --show-error --location --max-time 30 "$release_url/version.txt")"
installed_version="$(cat "$install_dir/version.txt" 2>/dev/null || echo "none")"

if [ "$latest_version" = "$installed_version" ]; then
  exit 0
fi

echo "Updating from $installed_version to $latest_version"

# Download next to the install folder (same disk), so the final mv is instant.
rm -rf "$download_dir"
mkdir -p "$download_dir"
trap 'rm -rf "$download_dir"' EXIT

curl --fail --silent --show-error --location --max-time 300 \
  --output "$download_dir/ario-api" "$release_url/ario-api"
curl --fail --silent --show-error --location --max-time 30 \
  --output "$download_dir/ario-api.sha256" "$release_url/ario-api.sha256"

# Stop if the file is damaged or only half downloaded.
(cd "$download_dir" && sha256sum --check --quiet ario-api.sha256)
chmod +x "$download_dir/ario-api"

# Keep the running version so we can go back to it.
if [ -f "$install_dir/ario-api" ]; then
  cp -f "$install_dir/ario-api" "$install_dir/ario-api.previous"
fi

mv -f "$download_dir/ario-api" "$install_dir/ario-api"
# Record the version now, so a broken build is not retried every minute.
echo "$latest_version" > "$install_dir/version.txt"
sudo -n systemctl restart ario-api

if curl --fail --silent --retry 5 --retry-connrefused --retry-delay 1 \
  http://127.0.0.1:8080/health > /dev/null; then
  echo "Updated to $latest_version"
  exit 0
fi

echo "The new version does not answer on /health" >&2
if [ -f "$install_dir/ario-api.previous" ]; then
  echo "Going back to the previous version" >&2
  mv -f "$install_dir/ario-api.previous" "$install_dir/ario-api"
  sudo -n systemctl restart ario-api
fi
exit 1
