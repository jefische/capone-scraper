import * as cheerio from "cheerio";
import { mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

interface Job {
  id: string;
  title: string;
  location: string;
  datePosted: string;
}

const BASE_URL = "https://www.capitalonecareers.com/search-jobs/results";
const RECORDS_PER_PAGE = 100;
const DELAY_MS = 1500;

const PARAMS = new URLSearchParams({
  ActiveFacetID: "0",
  RecordsPerPage: String(RECORDS_PER_PAGE),
  Distance: "50",
  RadiusUnitType: "0",
  Keywords: "",
  Location: "",
  ShowRadius: "False",
  IsPagination: "False",
  CustomFacetName: "",
  FacetTerm: "",
  FacetType: "0",
  SearchResultsModuleName: "Search Results",
  SearchFiltersModuleName: "Search Filters",
  SortCriteria: "0",
  SortDirection: "0",
  SearchType: "5",
  PostalCode: "",
  ResultsType: "0",
  fc: "",
  fl: "",
  fcf: "",
  afc: "",
  afl: "",
  afcf: "",
});

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*; q=0.01",
  "X-Requested-With": "XMLHttpRequest",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseJobs(html: string): Job[] {
  const $ = cheerio.load(html);
  const jobs: Job[] = [];

  $("#search-results-list ul li").each((_, el) => {
    const $li = $(el);
    const id = $li.find("a").attr("data-job-id") ?? "";
    const title = $li.find("h2").text().trim();
    const location = $li.find(".job-location").text().trim();
    const datePosted = $li.find(".job-date-posted").text().trim();

    if (id && title) {
      jobs.push({ id, title, location, datePosted });
    }
  });

  return jobs;
}

async function fetchPage(page: number): Promise<{ jobs: Job[]; totalPages: number }> {
  const params = new URLSearchParams(PARAMS);
  params.set("CurrentPage", String(page));

  const url = `${BASE_URL}?${params}`;
  const res = await fetch(url, { headers: HEADERS });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on page ${page}`);
  }

  const data = (await res.json()) as { results: string; hasJobs: boolean };
  const jobs = parseJobs(data.results);

  const $ = cheerio.load(data.results);
  const totalPages = Number($("#search-results").attr("data-total-pages") ?? "0");

  return { jobs, totalPages };
}

async function scrape() {
  const allJobs: Job[] = [];
  let page = 1;
  let totalPages = 1;

  console.log("Starting Capital One job scrape...");

  const first = await fetchPage(page);
  allJobs.push(...first.jobs);
  totalPages = first.totalPages;
  console.log(`Page ${page}/${totalPages} — got ${first.jobs.length} jobs (${allJobs.length} total)`);

  while (page < totalPages) {
    page++;
    await sleep(DELAY_MS);

    const { jobs } = await fetchPage(page);
    if (jobs.length === 0) break;

    allJobs.push(...jobs);
    console.log(`Page ${page}/${totalPages} — got ${jobs.length} jobs (${allJobs.length} total)`);
  }

  // Write output
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(__dirname, "..", "data");
  mkdirSync(outDir, { recursive: true });

  const outPath = resolve(outDir, "jobs.json");
  const output = { scrapedAt: new Date().toISOString(), jobs: allJobs };
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nDone! Scraped ${allJobs.length} jobs → ${outPath}`);
}

scrape().catch((err) => {
  console.error("Scrape failed:", err);
  process.exit(1);
});
