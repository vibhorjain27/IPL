import { useState } from 'react'

export default function ApiKeyBanner({ apiKey, isMock, error, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(apiKey)

  const handleSave = () => {
    onSave(draft)
    setEditing(false)
  }

  if (!isMock && !error) return null   // live data, no banner needed

  return (
    <div className="bg-yellow-900/20 border border-yellow-700/60 rounded-xl px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-yellow-300 font-medium">
            {error ? `⚠️ ${error}` : '⚠️ Demo mode — showing mock IPL odds'}
          </p>
          <p className="text-yellow-500/80 text-xs mt-1">
            Add a free API key from{' '}
            <a
              href="https://the-odds-api.com/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-yellow-300"
            >
              the-odds-api.com
            </a>{' '}
            (500 req/month free) to see live prices across Bet365, Pinnacle, Betfair &amp; more.
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => { setDraft(apiKey); setEditing(true) }}
            className="shrink-0 text-xs px-3 py-1.5 bg-yellow-700/40 hover:bg-yellow-700/70 border border-yellow-700 text-yellow-300 rounded-lg transition-colors"
          >
            {apiKey ? 'Change key' : 'Add key'}
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3 flex gap-2">
          <input
            type="password"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Paste your Odds API key here"
            className="flex-1 bg-black/30 border border-yellow-700/60 rounded-lg px-3 py-2 text-white text-xs
                       placeholder-gray-600 focus:outline-none focus:border-yellow-500"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="text-xs px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-xs px-3 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
