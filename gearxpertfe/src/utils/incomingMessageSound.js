/** Short chime for incoming chat (Web Audio — no extra asset). */

let ctxRef = null;

function getAudioContext() {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  if (!ctxRef) ctxRef = new C();
  return ctxRef;
}

/**
 * Browsers may start AudioContext suspended until a user gesture; call
 * `resumeIncomingMessageSound` from a one-time click/touch on the app.
 */
export function resumeIncomingMessageSound() {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

export function playIncomingMessageSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(660, t + 0.1);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.22);
  } catch {
    // ignore autoplay / missing API
  }
}
