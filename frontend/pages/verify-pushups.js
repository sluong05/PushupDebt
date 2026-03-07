import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { logPushups, getDebtSummary, getStreak } from '../lib/api';

// ─── MediaPipe landmark indices ───────────────────────────────────────────────
const IDX = {
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13,    R_ELBOW: 14,
  L_WRIST: 15,    R_WRIST: 16,
  L_HIP: 23,      R_HIP: 24,
  L_KNEE: 25,     R_KNEE: 26,
  L_ANKLE: 27,    R_ANKLE: 28,
};

const BODY_CONNECTIONS = [
  [IDX.L_SHOULDER, IDX.R_SHOULDER],
  [IDX.L_HIP,      IDX.R_HIP],
  [IDX.L_SHOULDER, IDX.L_HIP],
  [IDX.R_SHOULDER, IDX.R_HIP],
  [IDX.L_HIP,      IDX.L_KNEE],
  [IDX.L_KNEE,     IDX.L_ANKLE],
  [IDX.R_HIP,      IDX.R_KNEE],
  [IDX.R_KNEE,     IDX.R_ANKLE],
];

const ARM_CONNECTIONS = [
  [IDX.L_SHOULDER, IDX.L_ELBOW],
  [IDX.L_ELBOW,    IDX.L_WRIST],
  [IDX.R_SHOULDER, IDX.R_ELBOW],
  [IDX.R_ELBOW,    IDX.R_WRIST],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcAngle(a, b, c) {
  const rad =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs(rad * (180 / Math.PI));
  if (deg > 180) deg = 360 - deg;
  return deg;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.crossOrigin = 'anonymous';
    el.onload = resolve;
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

// Draw a filled, slightly-rounded rect without relying on roundRect()
function fillPill(ctx, x, y, w, h, r = 4) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function VerifyPushups() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // DOM refs
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  // Session refs (used inside rAF loop — don't trigger re-renders)
  const poseRef    = useRef(null);
  const animRef    = useRef(null);
  const streamRef  = useRef(null);
  const stageRef   = useRef('up');    // 'up' | 'down'
  const repsRef    = useRef(0);
  const countingRef = useRef(false);  // whether rep counting is active

  // UI state
  const [reps,       setReps]       = useState(0);
  const [angle,      setAngle]      = useState(null);
  const [stage,      setStage]      = useState('up');
  const [counting,   setCounting]   = useState(false);
  const [mpLoading,  setMpLoading]  = useState(true);
  const [camError,   setCamError]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [totalOwed,  setTotalOwed]  = useState(0);
  const [streak,     setStreak]     = useState(0);

  // ── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading]);

  // ── Load debt info ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    Promise.all([getDebtSummary(), getStreak()])
      .then(([d, s]) => {
        setTotalOwed(d.data.totalOwed);
        setStreak(s.data.streak);
      })
      .catch(console.error);
  }, [user]);

  // ── Pose result handler ──────────────────────────────────────────────────────
  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    const W = video.videoWidth  || 640;
    const H = video.videoHeight || 480;

    // Sync canvas buffer dimensions to actual video size
    if (canvas.width !== W)  canvas.width  = W;
    if (canvas.height !== H) canvas.height = H;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    if (!results.poseLandmarks) return;

    const L = results.poseLandmarks;

    // Mirror x so the canvas overlay lines up with the CSS-flipped video
    const fx = (x) => W - x * W;
    const fy = (y) => y * H;

    // Helper: draw a connection between two landmarks
    const drawLine = (i, j, color, width) => {
      const a = L[i], b = L[j];
      if (!a || !b || a.visibility < 0.3 || b.visibility < 0.3) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth   = width;
      ctx.lineCap     = 'round';
      ctx.moveTo(fx(a.x), fy(a.y));
      ctx.lineTo(fx(b.x), fy(b.y));
      ctx.stroke();
    };

    // Body skeleton (subtle white)
    BODY_CONNECTIONS.forEach(([i, j]) =>
      drawLine(i, j, 'rgba(255,255,255,0.3)', 2)
    );

    // Arm skeleton (orange highlight)
    ARM_CONNECTIONS.forEach(([i, j]) =>
      drawLine(i, j, 'rgba(249,115,22,0.85)', 4)
    );

    // Landmark dots
    L.forEach((lm, i) => {
      if (lm.visibility < 0.3) return;
      const x = fx(lm.x);
      const y = fy(lm.y);

      const isElbow = i === IDX.L_ELBOW || i === IDX.R_ELBOW;
      const isArm   = [IDX.L_SHOULDER, IDX.R_SHOULDER,
                        IDX.L_ELBOW,   IDX.R_ELBOW,
                        IDX.L_WRIST,   IDX.R_WRIST].includes(i);

      ctx.beginPath();
      ctx.arc(x, y, isElbow ? 9 : isArm ? 6 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = isElbow
        ? '#f97316'
        : isArm
        ? '#fbbf24'
        : 'rgba(255,255,255,0.7)';
      ctx.fill();

      if (isElbow) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth   = 2;
        ctx.stroke();
      }
    });

    // ── Elbow angle ─────────────────────────────────────────────────────────
    const lVis =
      (L[IDX.L_SHOULDER]?.visibility || 0) +
      (L[IDX.L_ELBOW]?.visibility    || 0) +
      (L[IDX.L_WRIST]?.visibility    || 0);
    const rVis =
      (L[IDX.R_SHOULDER]?.visibility || 0) +
      (L[IDX.R_ELBOW]?.visibility    || 0) +
      (L[IDX.R_WRIST]?.visibility    || 0);

    if (lVis < 1.0 && rVis < 1.0) return; // neither side visible enough

    const useLeft = lVis >= rVis;
    const sh  = useLeft ? L[IDX.L_SHOULDER] : L[IDX.R_SHOULDER];
    const el  = useLeft ? L[IDX.L_ELBOW]    : L[IDX.R_ELBOW];
    const wr  = useLeft ? L[IDX.L_WRIST]    : L[IDX.R_WRIST];

    if (!sh || !el || !wr) return;

    const deg = calcAngle(sh, el, wr);
    const ex  = fx(el.x);
    const ey  = fy(el.y);

    // Angle label background pill
    const label = `${Math.round(deg)}°`;
    ctx.font = 'bold 15px Inter, system-ui, sans-serif';
    const tw = ctx.measureText(label).width;
    const px = 8, ph = 22;
    const bx = ex - tw / 2 - px;
    const by = ey - 40;

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    fillPill(ctx, bx, by, tw + px * 2, ph, 5);

    ctx.fillStyle =
      deg < 70  ? '#f97316'
      : deg > 160 ? '#4ade80'
      : '#e4e4e7';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, ex, by + ph / 2);
    ctx.textBaseline = 'alphabetic';

    // Update React display state (batched by React 18)
    setAngle(Math.round(deg));

    // ── State machine — only runs when user has pressed Start ────────────────
    if (!countingRef.current) return;

    if (deg < 70 && stageRef.current === 'up') {
      stageRef.current = 'down';
      setStage('down');
    } else if (deg > 160 && stageRef.current === 'down') {
      stageRef.current = 'up';
      repsRef.current += 1;
      setReps(repsRef.current);
      setStage('up');
    }
  }, []);

  // ── MediaPipe + Camera init ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function init() {
      try {
        // Load drawing_utils first (pose.js depends on it)
        await loadScript(
          'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js'
        );
        await loadScript(
          'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/pose.js'
        );

        if (cancelled) return;
        setMpLoading(false);

        // Instantiate Pose
        const pose = new window.Pose({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`,
        });

        pose.setOptions({
          modelComplexity:       1,
          smoothLandmarks:       true,
          enableSegmentation:    false,
          smoothSegmentation:    false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence:  0.5,
        });

        pose.onResults(onResults);
        poseRef.current = pose;

        // Open webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width:      { ideal: 640 },
            height:     { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current       = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Frame-by-frame inference loop
        async function loop() {
          if (cancelled) return;
          try {
            if (poseRef.current && videoRef.current?.readyState >= 2) {
              await poseRef.current.send({ image: videoRef.current });
            }
          } catch (_) {
            // skip bad frames
          }
          if (!cancelled) {
            animRef.current = requestAnimationFrame(loop);
          }
        }

        animRef.current = requestAnimationFrame(loop);
      } catch (err) {
        if (cancelled) return;
        setMpLoading(false);
        console.error('Pose init error:', err);
        if (
          err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError'
        ) {
          setCamError(
            'Camera access was denied. Please allow camera permissions and refresh.'
          );
        } else if (err.name === 'NotFoundError') {
          setCamError('No camera found on this device.');
        } else {
          setCamError(`Could not start: ${err.message}`);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (poseRef.current) {
        try { poseRef.current.close(); } catch (_) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [user, onResults]);

  // ── Start / stop counting ────────────────────────────────────────────────────
  function startCounting() {
    // Reset stage so a bent-arm starting position doesn't immediately count
    stageRef.current  = 'up';
    setStage('up');
    countingRef.current = true;
    setCounting(true);
  }

  function stopCounting() {
    countingRef.current = false;
    setCounting(false);
  }

  // ── Submit reps ──────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (reps === 0 || submitting) return;
    stopCounting();
    setSubmitting(true);
    try {
      const res = await logPushups(reps);
      setTotalOwed(res.data.totalOwed);
      setSubmitted(true);
      // Reset counter so user can do another set
      repsRef.current  = 0;
      stageRef.current = 'up';
      setReps(0);
      setStage('up');
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Auth loading screen ──────────────────────────────────────────────────────
  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Layout streak={streak}>
      <div className="max-w-5xl mx-auto">

        {/* Page header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 mb-2 transition-colors"
            >
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-zinc-100">Verify Pushups</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              Camera-verified reps · elbow angle tracking
            </p>
          </div>
          <div className="card py-3 px-5 text-center flex-shrink-0">
            <p className="text-xs text-zinc-500 mb-0.5">Debt Remaining</p>
            <p className={`text-2xl font-bold tabular-nums ${totalOwed > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {totalOwed}
            </p>
            <p className="text-xs text-zinc-600">pushups</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Camera feed ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-3">

            {/* Video container */}
            <div className="card p-0 overflow-hidden bg-zinc-950 relative" style={{ aspectRatio: '4/3' }}>

              {/* Loading overlay */}
              {mpLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-900">
                  <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-zinc-300 font-medium">Loading pose detection…</p>
                  <p className="text-zinc-600 text-xs mt-1">Downloading MediaPipe model (~10 MB)</p>
                </div>
              )}

              {/* Camera error overlay */}
              {camError && !mpLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-900 p-8 text-center">
                  <span className="text-5xl mb-4">📷</span>
                  <p className="text-red-400 font-medium">{camError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-secondary mt-4 text-sm"
                  >
                    Refresh page
                  </button>
                </div>
              )}

              {/* Video feed — mirrored via CSS */}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                playsInline
                muted
              />

              {/* Canvas overlay — draws at native video res, displayed via CSS */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'none' }}
              />

              {/* Start counting overlay — shown when camera is ready but not yet counting */}
              {!mpLoading && !camError && !counting && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                  <button
                    onClick={startCounting}
                    className="flex flex-col items-center gap-3 group"
                  >
                    <div className="w-20 h-20 rounded-full bg-orange-500 hover:bg-orange-400 flex items-center justify-center shadow-2xl shadow-orange-500/40 transition-all duration-150 group-hover:scale-105">
                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <span className="text-white font-bold text-lg drop-shadow-md">
                      {reps > 0 ? 'Resume Counting' : 'Start Counting'}
                    </span>
                    <span className="text-zinc-300 text-sm drop-shadow-md">
                      Get in position first
                    </span>
                  </button>
                </div>
              )}

              {/* Stage badge + Stop button — shown while counting */}
              {!mpLoading && !camError && counting && (
                <>
                  <div className="absolute top-3 left-3 z-10">
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-lg transition-all duration-200 ${
                        stage === 'down'
                          ? 'bg-orange-500 text-white shadow-orange-500/30'
                          : 'bg-zinc-900/80 text-green-400 border border-green-500/40'
                      }`}
                    >
                      {stage === 'down' ? '▼ DOWN' : '▲ UP'}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      onClick={stopCounting}
                      className="flex items-center gap-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-zinc-700 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-sm bg-zinc-300 inline-block" />
                      Stop
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Angle threshold guide */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card bg-zinc-900/60 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-400 text-sm font-bold">▼</span>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Down</p>
                  <p className="text-zinc-200 text-sm">
                    Angle <span className="text-orange-400 font-bold">&lt; 70°</span>
                  </p>
                </div>
              </div>
              <div className="card bg-zinc-900/60 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-400 text-sm font-bold">▲</span>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Up</p>
                  <p className="text-zinc-200 text-sm">
                    Angle <span className="text-green-400 font-bold">&gt; 160°</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="card bg-zinc-900/40 py-3 px-4">
              <p className="text-xs text-zinc-500">
                <span className="text-zinc-400 font-medium">Tips:</span> Face the camera side-on for best elbow tracking.
                Keep your arms fully visible. Good lighting improves accuracy.
              </p>
            </div>
          </div>

          {/* ── Right: Stats + submit ──────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Rep counter */}
            <div className={`card text-center py-8 transition-colors duration-200 ${counting ? 'border-orange-500/40 bg-orange-950/10' : ''}`}>
              <div className="flex items-center justify-center gap-2 mb-3">
                {counting && (
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                )}
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
                  {counting ? 'Counting…' : 'Reps This Set'}
                </p>
              </div>
              <p
                className={`text-8xl font-bold tabular-nums transition-all duration-200 ${
                  counting ? 'text-orange-400' : reps > 0 ? 'text-zinc-100' : 'text-zinc-700'
                }`}
              >
                {reps}
              </p>
              <p className="text-zinc-600 text-sm mt-3">pushups</p>
            </div>

            {/* Elbow angle meter */}
            <div className="card py-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 font-medium text-center">
                Elbow Angle
              </p>

              {angle !== null ? (
                <>
                  <p
                    className={`text-4xl font-bold tabular-nums text-center transition-colors duration-150 ${
                      angle < 70
                        ? 'text-orange-400'
                        : angle > 160
                        ? 'text-green-400'
                        : 'text-zinc-100'
                    }`}
                  >
                    {angle}°
                  </p>

                  {/* Progress bar */}
                  <div className="mt-4 relative">
                    <div className="w-full bg-zinc-800 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-100 ${
                          angle < 70
                            ? 'bg-orange-500'
                            : angle > 160
                            ? 'bg-green-500'
                            : 'bg-zinc-500'
                        }`}
                        style={{ width: `${Math.min(100, (angle / 180) * 100)}%` }}
                      />
                    </div>
                    {/* Threshold markers */}
                    <div
                      className="absolute top-0 h-2.5 w-0.5 bg-orange-500/60"
                      style={{ left: `${(70 / 180) * 100}%` }}
                    />
                    <div
                      className="absolute top-0 h-2.5 w-0.5 bg-green-500/60"
                      style={{ left: `${(160 / 180) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-zinc-600">
                    <span>0°</span>
                    <span className="text-orange-500/50">70°</span>
                    <span className="text-green-500/50">160°</span>
                    <span>180°</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-zinc-600 text-sm">Waiting for pose…</p>
                  <p className="text-zinc-700 text-xs mt-1">Stand in frame</p>
                </div>
              )}
            </div>

            {/* Submit button */}
            {submitted ? (
              <div className="card bg-green-900/20 border-green-800/40 text-center py-5">
                <p className="text-green-400 font-bold text-lg">✓ Reps Logged!</p>
                <p className="text-zinc-500 text-sm mt-1">
                  {totalOwed > 0
                    ? `${totalOwed} pushups remaining`
                    : '🎉 All debt cleared!'}
                </p>
                <p className="text-zinc-600 text-xs mt-2">Counter reset — keep going!</p>
              </div>
            ) : counting ? (
              <button
                onClick={stopCounting}
                className="btn-secondary w-full py-4 text-base font-bold border-orange-500/30"
              >
                ■ Stop &amp; Review
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={reps === 0 || submitting}
                className="btn-primary w-full py-4 text-base font-bold"
              >
                {submitting
                  ? 'Logging…'
                  : reps > 0
                  ? `Log ${reps} Verified Rep${reps === 1 ? '' : 's'}`
                  : 'Start counting to begin'}
              </button>
            )}

            <Link
              href="/"
              className="btn-secondary w-full text-center block py-3 text-sm"
            >
              ← Back to Dashboard
            </Link>

            {/* Debt cleared celebration */}
            {totalOwed === 0 && (
              <div className="card bg-green-900/10 border-green-800/30 text-center p-4">
                <p className="text-2xl mb-1">🎉</p>
                <p className="text-green-400 font-semibold text-sm">Debt Free!</p>
                <p className="text-zinc-600 text-xs mt-1">No pushup debt outstanding</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
