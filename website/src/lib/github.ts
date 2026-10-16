import { useEffect, useState } from "react";

const REPO = "ErfanKhezri/ArioQuest";
export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases/latest`;
/** The web demo, built into the site's `app/` folder. */
export const DEMO_URL = `${import.meta.env.BASE_URL}app/`;

export interface Release {
  version: string;
  exeUrl: string;
  msiUrl?: string;
}

interface ReleaseJson {
  tag_name: string;
  assets: Array<{ name: string; browser_download_url: string }>;
}

const api = async <T>(path: string): Promise<T> => {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`);
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json() as Promise<T>;
};

// One request per page load, shared by every button that needs it.
let release: Promise<Release | null> | undefined;
let stars: Promise<number | null> | undefined;

function fetchRelease() {
  release ??= api<ReleaseJson>("/releases/latest")
    .then((json) => {
      const exe = json.assets.find((a) => a.name.endsWith("_x64-setup.exe"));
      const msi = json.assets.find((a) => a.name.endsWith(".msi"));
      if (!exe) return null;
      return {
        version: json.tag_name.replace(/^v/, ""),
        exeUrl: exe.browser_download_url,
        msiUrl: msi?.browser_download_url,
      };
    })
    .catch(() => null);
  return release;
}

function fetchStars() {
  stars ??= api<{ stargazers_count: number }>("")
    .then((json) => json.stargazers_count)
    .catch(() => null);
  return stars;
}

/** The latest release's installers, or null while loading / when there is none. */
export function useLatestRelease() {
  const [value, setValue] = useState<Release | null>(null);
  useEffect(() => void fetchRelease().then(setValue), []);
  return value;
}

export function useStars() {
  const [value, setValue] = useState<number | null>(null);
  useEffect(() => void fetchStars().then(setValue), []);
  return value;
}
