# Capital One Jobs Scraper

A self-updating job board for [Capital One careers](https://www.capitalonecareers.com/). A scheduled scraper pulls the full job listing every day, commits the data, and redeploys a React site that lets you search, filter, and sort it.

**Live site:** https://jefische.github.io/capone-scraper/

---

## ⚡ The experiment: I didn't write any of this code — and it took 30 minutes

**This project is an experiment in prompting, not programming.** Every line here — the scraper, the React app, the styling, the GitHub Actions pipeline — was written by [Claude](https://claude.com/claude-code). My entire contribution was prompting: describing what I wanted, reviewing what came back, and asking for changes.

I never typed the implementation myself. No filling in the tricky part, no "let me just fix this one function." When something was wrong, I described the problem and Claude fixed it.

**The whole thing — from empty directory to a deployed, self-updating site — took 30 minutes.** The git history backs it up: the first commit lands at 10:14, the GitHub Actions automation is done at 10:43, and every commit after that is the bot updating its own data on schedule.

The point was to find out how far that can actually go, and how fast. The answer, so far: half an hour to a working end-to-end product — data collection, a deployed UI, and automated daily infrastructure — none of which I hand-wrote.

### What that looked like in practice

- **Reverse-engineering the data source.** I didn't know what endpoint the careers site used. I described the goal, Claude found the results endpoint and worked out the query parameters and pagination.
- **The UI.** Search, multi-select location filtering, keyword exclusion, sortable columns — all specified in plain English, all built without me touching the component.
- **The automation.** The daily cron, the commit-back-to-repo step, and GitHub Pages deployment came out of a conversation, not a config I wrote.
- **Bug fixes.** When sorting or filtering misbehaved, I described the wrong behavior. Claude diagnosed and patched it.

Read the repo as an artifact of that process. Anything you'd critique in it is a critique of the prompting, not of code I wrote — because I wrote none.

---

## What it does

**Scraper** ([src/scraper.ts](src/scraper.ts)) — Hits the Capital One careers results endpoint 100 records at a time, parses each page of HTML with Cheerio, and walks the pagination until it runs out. Rate-limited to one request every 1.5s. Writes `{ scrapedAt, jobs[] }` to [data/jobs.json](data/jobs.json) (~1,600 listings at last run).

**Web app** ([src/App.tsx](src/App.tsx)) — Reads the scraped JSON at build time, so the site is fully static. Features:

- Free-text search across title, location, and job ID
- Multi-select location filter, sorted by state then city
- Keyword exclusion toggles (`senior`, `lead`, `director`, `manager`) for filtering out roles you're not eligible for
- Sortable columns, with proper date parsing on Date Posted
- Direct links to each posting

**Automation** ([.github/workflows/scrape-and-deploy.yml](.github/workflows/scrape-and-deploy.yml)) — Daily at 12:00 UTC (and on manual dispatch): scrape → commit the updated data → build → deploy to GitHub Pages. The `chore: update scraped jobs data` commits in the history are the bot.

## Stack

React 19 · TypeScript · Vite 8 · Cheerio · GitHub Actions · GitHub Pages

## Running it locally

```bash
pnpm install
pnpm scrape   # refresh data/jobs.json
pnpm dev      # start the dev server
pnpm build    # typecheck + production build
```

## Notes

The scraper sends a browser User-Agent and reads only the public job search results. It's rate-limited deliberately. It's a personal tool for tracking listings, not affiliated with or endorsed by Capital One.
