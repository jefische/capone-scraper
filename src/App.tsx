import { useState, useEffect } from 'react'
import capitalOneData from '../data/jobs.json'
import costarData from '../data/costar-jobs.json'
import JobBoard, { type Job } from './JobBoard'
import './App.css'

type JobsFile = { scrapedAt: string; jobs: Job[] }

const BOARDS = {
  capitalone: {
    company: 'Capital One',
    data: capitalOneData as unknown as JobsFile,
    defaultLocation: 'McLean, VA',
    jobUrl: (job: Job) => `https://www.capitalonecareers.com/job/-/-/1732/${job.id}`,
  },
  costar: {
    company: 'CoStar',
    data: costarData as unknown as JobsFile,
    defaultLocation: 'Arlington, VA',
    jobUrl: (job: Job) => `https://careers.costargroup.com/careers?pid=${job.id}`,
  },
}

type BoardKey = keyof typeof BOARDS

// The active board lives in the URL hash (#costar) so each page is linkable on GitHub Pages
function boardFromHash(): BoardKey {
  const hash = window.location.hash.slice(1)
  return hash in BOARDS ? (hash as BoardKey) : 'capitalone'
}

function App() {
  const [active, setActive] = useState<BoardKey>(boardFromHash)

  useEffect(() => {
    const onHashChange = () => setActive(boardFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const board = BOARDS[active]

  return (
    <div className="app">
      <nav className="tabs">
        {(Object.keys(BOARDS) as BoardKey[]).map((key) => (
          <a
            key={key}
            href={`#${key}`}
            className={key === active ? 'tab active' : 'tab'}
          >
            {BOARDS[key].company}
          </a>
        ))}
      </nav>
      <JobBoard
        key={active}
        company={board.company}
        scrapedAt={board.data.scrapedAt}
        jobs={board.data.jobs}
        defaultLocation={board.defaultLocation}
        jobUrl={board.jobUrl}
      />
    </div>
  )
}

export default App
