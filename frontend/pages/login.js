import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { login } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loginUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/');
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      loginUser(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💪</div>
          <h1 className="text-2xl font-bold text-zinc-100">Pushup Debt</h1>
          <p className="text-zinc-500 text-sm mt-1">Turn procrastination into gains</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-zinc-100 mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-6">
            No account?{' '}
            <Link href="/signup" className="text-orange-400 hover:text-orange-300 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
