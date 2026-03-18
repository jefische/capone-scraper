import { useState, useMemo, useRef, useEffect } from 'react'
import jobsData from '../data/jobs.json'
import './App.css'

interface Job {
  id: string
  title: string
  location: string
  datePosted: string
}

const { scrapedAt, jobs } = jobsData as unknown as { scrapedAt: string; jobs: Job[] }

const locations = [...new Set(jobs.map((j) => j.location))].sort()
const EXCLUDE_KEYWORDS = ['senior', 'lead', 'director', 'manager'] as const

function App() {
  const [search, setSearch] = useState('')
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set(['McLean, VA']))
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [excludedKeywords, setExcludedKeywords] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<keyof Job>('datePosted')
  const [sortAsc, setSortAsc] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleLocation(loc: string) {
    setSelectedLocations((prev) => {
      const next = new Set(prev)
      if (next.has(loc)) next.delete(loc)
      else next.add(loc)
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = jobs.filter((j) => {
      if (selectedLocations.size > 0 && !selectedLocations.has(j.location)) return false
      if (excludedKeywords.size > 0) {
        const titleLower = j.title.toLowerCase()
        for (const kw of excludedKeywords) {
          if (titleLower.includes(kw)) return false
        }
      }
      if (q) {
        return (
          j.title.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          j.id.includes(q)
        )
      }
      return true
    })

    list.sort((a, b) => {
      let cmp: number
      if (sortKey === 'datePosted') {
        const [am, ad, ay] = a.datePosted.split('/')
        const [bm, bd, by] = b.datePosted.split('/')
        cmp = new Date(`${ay}-${am}-${ad}`).getTime() - new Date(`${by}-${bm}-${bd}`).getTime()
      } else {
        cmp = a[sortKey].localeCompare(b[sortKey])
      }
      return sortAsc ? cmp : -cmp
    })

    return list
  }, [search, selectedLocations, excludedKeywords, sortKey, sortAsc])

  function handleSort(key: keyof Job) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const sortIndicator = (key: keyof Job) =>
    sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : ''

  const locationLabel = selectedLocations.size === 0
    ? 'All Locations'
    : selectedLocations.size === 1
      ? [...selectedLocations][0]
      : `${selectedLocations.size} locations`

  return (
    <div className="app">
      <header>
        <h1>Capital One Jobs</h1>
        <p className="subtitle">
          {filtered.length} of {jobs.length} jobs
          {scrapedAt && <span className="last-updated"> · Last updated {new Date(scrapedAt).toLocaleDateString()}</span>}
        </p>
        <div className="filters">
          <input
            type="text"
            className="search"
            placeholder="Search by title, location, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="location-dropdown" ref={dropdownRef}>
            <button
              className="location-toggle"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {locationLabel}
              <span className="chevron">{dropdownOpen ? '▲' : '▼'}</span>
            </button>
            {dropdownOpen && (
              <div className="location-menu">
                <button
                  className="location-clear"
                  onClick={() => setSelectedLocations(new Set())}
                >
                  Clear all
                </button>
                <ul>
                  {locations.map((loc) => (
                    <li key={loc}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedLocations.has(loc)}
                          onChange={() => toggleLocation(loc)}
                        />
                        {loc}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="exclude-filters">
          <span className="exclude-label">Exclude titles containing:</span>
          {EXCLUDE_KEYWORDS.map((kw) => (
            <label key={kw} className="exclude-option">
              <input
                type="checkbox"
                checked={excludedKeywords.has(kw)}
                onChange={() => {
                  setExcludedKeywords((prev) => {
                    const next = new Set(prev)
                    if (next.has(kw)) next.delete(kw)
                    else next.add(kw)
                    return next
                  })
                }}
              />
              {kw}
            </label>
          ))}
        </div>
      </header>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('id')}>ID{sortIndicator('id')}</th>
              <th onClick={() => handleSort('title')}>Title{sortIndicator('title')}</th>
              <th onClick={() => handleSort('location')}>Location{sortIndicator('location')}</th>
              <th onClick={() => handleSort('datePosted')}>Date Posted{sortIndicator('datePosted')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => (
              <tr key={job.id}>
                <td className="col-id">{job.id}</td>
                <td className="col-title">
                  <a
                    href={`https://www.capitalonecareers.com/job/-/-/1732/${job.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {job.title}
                  </a>
                </td>
                <td>{job.location}</td>
                <td className="col-date">{job.datePosted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default App
