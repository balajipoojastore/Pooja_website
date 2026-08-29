import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

export function OtpCodeInput({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? '');
  const update = (index: number, digit: string) => {
    const next = [...digits]; next[index] = digit; onChange(next.join('').slice(0, 6));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };
  const keyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) refs.current[index - 1]?.focus();
    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < 5) refs.current[index + 1]?.focus();
  };
  const paste = (event: ClipboardEvent<HTMLInputElement>) => {
    const code = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!code) return;
    event.preventDefault(); onChange(code); refs.current[Math.min(code.length, 6) - 1]?.focus();
  };
  return <fieldset className="otp-boxes" aria-label="Six-digit verification code" disabled={disabled}>
    <legend className="sr-only">Verification code</legend>
    {digits.map((digit, index) => <input
      key={index} ref={(element) => { refs.current[index] = element; }} value={digit}
      onChange={(event) => update(index, event.target.value.replace(/\D/g, '').slice(-1))}
      onKeyDown={(event) => keyDown(event, index)} onPaste={paste} inputMode="numeric"
      autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={1}
      aria-label={`Digit ${index + 1}`} autoFocus={index === 0}
    />)}
  </fieldset>;
}
