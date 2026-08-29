import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { checkPincode } from '../../services/deliveryService';
import { useUiStore } from '../../stores/uiStore';
import { pincodeSchema } from '../../utils/validation';
import { BrandLogo } from '../common/BrandLogo';

export function PinCodeGate() {
  const isDesignPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'storefront';
  const open = useUiStore((state) => state.pinGateOpen); const selected = useUiStore((state) => state.selectedPincode);
  const setPincode = useUiStore((state) => state.setPincode); const setOpen = useUiStore((state) => state.setPinGateOpen);
  const [value, setValue] = useState(selected ?? ''); const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null); const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null); const dialogRef = useRef<HTMLElement>(null); const restoreRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement; document.body.classList.add('gated'); document.body.style.overflow = 'hidden'; window.setTimeout(() => inputRef.current?.focus(), 30);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selected) { event.preventDefault(); setOpen(false); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])')];
      if (!controls.length) return; const first = controls[0]!; const last = controls[controls.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.classList.remove('gated'); document.body.style.overflow = ''; document.removeEventListener('keydown', onKeyDown); window.setTimeout(() => restoreRef.current?.focus(), 0); };
  }, [open, selected, setOpen]);
  if (!open || isDesignPreview) return null;
  const close = () => { if (selected) setOpen(false); };
  const submit = async () => {
    const parsed = pincodeSchema.safeParse(value);
    if (!parsed.success) { setMessage({ type: 'err', text: parsed.error.issues[0]!.message }); inputRef.current?.focus(); return; }
    setChecking(true); setMessage(null);
    try {
      const area = await checkPincode(parsed.data);
      if (!area) { setMessage({ type: 'err', text: isSupabaseConfigured ? `Delivery is not available for ${parsed.data} yet.` : 'Delivery checking is not configured.' }); return; }
      setMessage({ type: 'ok', text: `Delivery is available in ${area.area_name}.` }); window.setTimeout(() => setPincode(parsed.data), 400);
    } catch (error) { setMessage({ type: 'err', text: error instanceof Error ? error.message : 'Unable to check delivery.' }); }
    finally { setChecking(false); }
  };
  return <div className="pin-gate show" onMouseDown={(event) => { if (event.currentTarget === event.target) close(); }}>
    <section ref={dialogRef} className="pin-card" role="dialog" aria-modal="true" aria-labelledby="pin-title" aria-describedby="pin-description">
      <BrandLogo className="brand-mark" /><p className="label">Delivery check</p><h1 id="pin-title">Pooja essentials, delivered nearby</h1><p id="pin-description">Enter your six-digit PIN to check the live delivery-area list.</p>
      <form className="pin-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}><label className="sr-only" htmlFor="delivery-pin">Six-digit PIN code</label><input id="delivery-pin" ref={inputRef} inputMode="numeric" maxLength={6} autoComplete="postal-code" value={value} aria-invalid={message?.type === 'err'} aria-describedby={message ? 'pin-result' : undefined} onChange={(event) => { setValue(event.target.value.replace(/\D/g, '').slice(0, 6)); setMessage(null); }} placeholder="560087" /><button className="primary-btn" disabled={checking}>{checking ? 'Checking…' : 'Check delivery'}</button></form>
      {message && <p id="pin-result" className={`pin-msg ${message.type}`} role="status" aria-live="polite">{message.type === 'ok' && <CheckCircle2 />}{message.text}</p>}{selected && <button className="pin-close" onClick={close}>Keep {selected}</button>}
    </section>
  </div>;
}
