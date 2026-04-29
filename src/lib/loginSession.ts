import { isRecognizedDemoGateEmail } from '@/lib/data';

/** Demo gate emails (see LoginScreen). */
const DEMO_EMAIL_KEY = 'cyberconnect_demo_gate_email';
/** Set when user chooses "Switch role" — next LoginScreen opens on role selection. */
const RESUME_ROLE_KEY = 'cyberconnect_resume_role_select';

export function saveDemoGateEmail(email: string): void {
  try {
    sessionStorage.setItem(DEMO_EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    /* ignore */
  }
}

export function getStoredDemoGateEmail(): string {
  try {
    return (sessionStorage.getItem(DEMO_EMAIL_KEY) ?? '').trim().toLowerCase();
  } catch {
    return '';
  }
}

export function setResumeRoleSelection(): void {
  try {
    sessionStorage.setItem(RESUME_ROLE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearLoginSessionStorage(): void {
  try {
    sessionStorage.removeItem(DEMO_EMAIL_KEY);
    sessionStorage.removeItem(RESUME_ROLE_KEY);
  } catch {
    /* ignore */
  }
}

export function peekResumeRoleSnapshot(): { goRole: boolean; email: string } {
  try {
    const resume = sessionStorage.getItem(RESUME_ROLE_KEY) === '1';
    const email = (sessionStorage.getItem(DEMO_EMAIL_KEY) ?? '').trim().toLowerCase();
    const valid = email !== '' && isRecognizedDemoGateEmail(email);
    return { goRole: resume && valid, email: valid ? email : '' };
  } catch {
    return { goRole: false, email: '' };
  }
}

export function consumeResumeRoleFlag(): void {
  try {
    sessionStorage.removeItem(RESUME_ROLE_KEY);
  } catch {
    /* ignore */
  }
}
