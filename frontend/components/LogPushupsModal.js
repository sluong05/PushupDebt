import { useState } from 'react';
import Link from 'next/link';
import { logPushups } from '../lib/api';

export default function LogPushupsModal({ totalOwed, onClose, onLogged }) {
  const [count, setCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickAmounts = [5, 10, 15, 20, 25, 30].filter((n) => n <= totalOwed + 10);

  async function handleSubmit(e) {
    e.preventDefault();
    const num = parseInt(count, 10);
    if (!num || num <= 0) {
      setError('Enter a valid number of pushups');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await logPushups(num);
      onLogged(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log pushups');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-zinc-100">Log Pushups</h2>
          <button onClick={onClose} className="btn-ghost p-1 text-lg leading-none">
            ✕
          </button>
        </div>

        {/* Camera verification CTA */}
        <Link
          href="/verify-pushups"
          onClick={onClose}
          className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 hover:border-orange-500/60 rounded-xl p-4 mb-5 transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/30 transition-colors">
            <span className="text-xl">📷</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-400">Use Camera Verification</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              MediaPipe Pose tracks your elbows and counts reps automatically
            </p>
          </div>
          <svg
            className="w-4 h-4 text-zinc-600 group-hover:text-orange-400 transition-colors flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs text-zinc-600 font-medium">or log manually</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Debt display */}
        <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4 mb-5 text-center">
          <p className="text-sm text-zinc-400 mb-1">Current Debt</p>
          <p className="text-4xl font-bold text-red-400">{totalOwed}</p>
          <p className="text-sm text-zinc-500 mt-1">pushups owed</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick amounts */}
          {quickAmounts.length > 0 && (
            <div>
              <p className="label">Quick Select</p>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(String(n))}
                    className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      count === String(n)
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-orange-500 hover:text-orange-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Number of Pushups</label>
            <input
              type="number"
              className="input text-center text-xl font-bold"
              placeholder="0"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              min="1"
              max="9999"
            />
          </div>

          {count && parseInt(count) > 0 && (
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <p className="text-sm text-zinc-400">
                After logging:{' '}
                <span
                  className={`font-bold ${
                    Math.max(0, totalOwed - parseInt(count)) === 0
                      ? 'text-green-400'
                      : 'text-orange-400'
                  }`}
                >
                  {Math.max(0, totalOwed - parseInt(count))} pushups
                </span>{' '}
                remaining
              </p>
              {parseInt(count) >= totalOwed && totalOwed > 0 && (
                <p className="text-xs text-green-400 mt-1">All debt cleared!</p>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading || !count}>
              {loading ? 'Logging...' : 'Log Pushups'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
