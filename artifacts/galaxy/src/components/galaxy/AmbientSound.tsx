import { useEffect, useRef } from "react";

interface Props {
  active: boolean;
  intensity: number;
}

export function AmbientSound({ active, intensity }: Props) {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscsRef = useRef<OscillatorNode[]>([]);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!active) {
      const gain = gainRef.current;
      const ctx = ctxRef.current;
      if (gain && ctx) {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      }
      const t = setTimeout(() => {
        oscsRef.current.forEach((o) => {
          try {
            o.stop();
            o.disconnect();
          } catch {}
        });
        oscsRef.current = [];
        if (gainRef.current) {
          try {
            gainRef.current.disconnect();
          } catch {}
          gainRef.current = null;
        }
        if (ctxRef.current) {
          ctxRef.current.close().catch(() => {});
          ctxRef.current = null;
        }
      }, 1200);
      return () => clearTimeout(t);
    }

    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    ctxRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    gainRef.current = master;

    const freqs = [55, 82.5, 110, 164.8];
    const oscs = freqs.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? "sine" : i === 3 ? "triangle" : "sine";
      o.frequency.value = f;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.05 + i * 0.03;
      lfoGain.gain.value = 0.6 + i * 0.2;
      lfo.connect(lfoGain);
      lfoGain.connect(o.frequency);
      lfo.start();
      const og = ctx.createGain();
      og.gain.value = 0.18;
      o.connect(og);
      og.connect(master);
      o.start();
      return o;
    });
    oscsRef.current = oscs;

    master.gain.setTargetAtTime(0.08, ctx.currentTime, 1.2);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const gain = gainRef.current;
    const ctx = ctxRef.current;
    if (gain && ctx) {
      const target = 0.05 + Math.min(intensity, 1) * 0.12;
      gain.gain.setTargetAtTime(target, ctx.currentTime, 0.8);
    }
  }, [intensity, active]);

  return null;
}
