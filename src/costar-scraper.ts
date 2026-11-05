import { mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

interface Job {
  id: string;
  title: string;
  location: string;
  datePosted: string;
}

interface Position {
  id: number;
  name: string;
  location: string;
  t_create: number;
}

// CoStar's careers site runs on Eightfold, which serves its listings from a JSON API.
// The domain param must be costar.com — costargroup.com returns a "Page Not Found" HTML page.
const BASE_URL = "https://careers.costargroup.com/api/apply/v2/jobs";
const DOMAIN = "costar.com";
const PAGE_SIZE = 10; // Eightfold caps num at 10 regardless of what's requested
const DELAY_MS = 1500;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

const US_STATES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC",
  Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL",
  Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// "Irvine, California, United States of America" → "Irvine, CA", matching the Capital One format.
// "Home-based - Florida (US), Florida, ..." → "Remote, FL". Non-US locations keep their full form.
function normalizeLocation(location: string): string {
  const parts = location.split(",").map((p) => p.trim());
  if (parts.length === 3 && parts[2] === "United States of America" && US_STATES[parts[1]]) {
    const city = parts[0].startsWith("Home-based") ? "Remote" : parts[0];
    return `${city}, ${US_STATES[parts[1]]}`;
  }
  return location;
}

// Unix seconds → MM/DD/YYYY, the format the UI's date sort expects
function formatDate(seconds: number): string {
  const d = new Date(seconds * 1000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getUTCFullYear()}`;
}

async function fetchPage(start: number): Promise<{ jobs: Job[]; total: number }> {
  const params = new URLSearchParams({ domain: DOMAIN, start: String(start), num: String(PAGE_SIZE) });
  const res = await fetch(`${BASE_URL}?${params}`, { headers: HEADERS });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} at start=${start}`);
  }

  const data = (await res.json()) as { count: number; positions: Position[] };
  const jobs = data.positions.map((p) => ({
    id: String(p.id),
    title: p.name.trim(),
    location: normalizeLocation(p.location),
    datePosted: formatDate(p.t_create),
  }));

  return { jobs, total: data.count };
}

async function scrape() {
  const allJobs: Job[] = [];
  let start = 0;

  console.log("Starting CoStar job scrape...");

  const first = await fetchPage(start);
  allJobs.push(...first.jobs);
  const total = first.total;
  console.log(`start=${start} — got ${first.jobs.length} jobs (${allJobs.length}/${total})`);

  while (allJobs.length < total) {
    start += PAGE_SIZE;
    await sleep(DELAY_MS);

    const { jobs } = await fetchPage(start);
    if (jobs.length === 0) break;

    allJobs.push(...jobs);
    console.log(`start=${start} — got ${jobs.length} jobs (${allJobs.length}/${total})`);
  }

  // Pages can shift if a job is posted or removed mid-scrape
  const unique = [...new Map(allJobs.map((j) => [j.id, j])).values()];

  // Write output
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(__dirname, "..", "data");
  mkdirSync(outDir, { recursive: true });

  const outPath = resolve(outDir, "costar-jobs.json");
  const output = { scrapedAt: new Date().toISOString(), jobs: unique };
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nDone! Scraped ${unique.length} jobs → ${outPath}`);
}

scrape().catch((err) => {
  console.error("Scrape failed:", err);
  process.exit(1);
});
