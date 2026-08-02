import { ApiError } from './client';
import { useToastStore } from '../store/toast-store';

const FALLBACK = 'Something went wrong. Please try again.';

/** Map Nest / Express / class-validator noise to short user copy. */
export function humanizeMessage(raw: string): string {
  const message = raw.trim();
  if (!message) return FALLBACK;

  const lower = message.toLowerCase();

  if (
    lower.includes('request entity too large') ||
    lower.includes('payload too large') ||
    lower.includes('entity too large')
  ) {
    return 'That image is too large. Please use a photo under 350KB.';
  }

  if (
    lower.includes('profile image is too large') ||
    /avatarurl must be shorter/i.test(message)
  ) {
    return 'That image is too large. Please use a photo under 350KB.';
  }

  if (lower.includes('profile image url is too long')) {
    return 'That image link is too long. Please use a shorter URL.';
  }

  if (
    lower.includes('avatar must be an http') ||
    lower.includes('avatar must be')
  ) {
    return 'Please upload an image file or paste a valid image link.';
  }

  if (lower.includes('unauthorized') || lower === 'forbidden') {
    return 'Please sign in again to continue.';
  }

  if (lower.includes('too many requests') || lower.includes('throttl')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (lower.includes('networkerror') || lower.includes('failed to fetch')) {
    return 'Could not reach the server. Check your connection and try again.';
  }

  if (lower.includes('internal server error')) {
    return 'Something went wrong on our side. Please try again.';
  }

  // class-validator style: "email must be an email"
  if (/must be an email/i.test(message)) {
    return 'Please enter a valid email address.';
  }

  if (/password.*must be longer than or equal to/i.test(message)) {
    return 'Password must be at least 8 characters.';
  }

  if (/should not be empty/i.test(message)) {
    return 'Please fill in all required fields.';
  }

  if (/should not exist/i.test(message)) {
    return 'Some fields are not allowed. Please refresh and try again.';
  }

  if (/must be a uuid/i.test(message)) {
    return 'Something looks invalid. Please refresh and try again.';
  }

  if (/must be a (number|integer|string|boolean|array|object)/i.test(message)) {
    return 'Please check your entries and try again.';
  }

  // Nest often joins validation with ", "
  if (message.includes(', ') && /must |should /i.test(message)) {
    const parts = message.split(', ').map((p) => humanizeMessage(p));
    const unique = [...new Set(parts)];
    if (unique.length === 1) return unique[0]!;
    return unique.join(' ');
  }

  return message;
}

export function formatUserFacingError(
  err: unknown,
  fallback: string = FALLBACK,
): string {
  if (typeof err === 'string' && err.trim()) {
    return humanizeMessage(err);
  }

  if (err instanceof ApiError) {
    if (err.status === 413) {
      return 'That image is too large. Please use a photo under 350KB.';
    }
    if (err.status === 401) {
      return 'Please sign in again to continue.';
    }
    if (err.status === 403) {
      return 'You do not have permission to do that.';
    }
    if (err.status === 404) {
      return 'We could not find what you were looking for.';
    }
    if (err.status === 429) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (err.status >= 500) {
      return 'Something went wrong on our side. Please try again.';
    }
    const text = humanizeMessage(err.message);
    return text || fallback;
  }

  if (err instanceof Error && err.message) {
    return humanizeMessage(err.message);
  }

  return fallback;
}

export function toastError(err: unknown, fallback?: string) {
  useToastStore
    .getState()
    .toast(formatUserFacingError(err, fallback), 'error');
}

export function toastSuccess(message: string) {
  useToastStore.getState().toast(message, 'default');
}
