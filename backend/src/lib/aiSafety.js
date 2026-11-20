const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const GOVERNMENT_ID_PATTERN = /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g;
const PAYMENT_CARD_PATTERN = /\b(?:\d[ -]*?){13,19}\b/g;
const PHONE_PATTERN = /(?<!\w)(?:\+?\d{1,3}[\s().-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{4}(?!\w)/g;
const PROMPT_INJECTION_PATTERNS = [
  /\b(?:ignore|disregard|override|bypass)\b.{0,50}\b(?:system|developer|previous|prior|above)\b.{0,30}\b(?:prompt|instruction|rule|message)s?\b/i,
  /\b(?:reveal|print|show|repeat|expose)\b.{0,40}\b(?:system prompt|hidden instruction|secret|credential|api key)\b/i,
  /\b(?:act as|pretend to be)\b.{0,30}\b(?:system|developer|administrator|another user)\b/i,
  /\b(?:bypass|evade|ignore)\b.{0,30}\b(?:authorization|tenant|role|permission|access control)s?\b/i,
];

export function redactPersonalData(value) {
  return String(value ?? "")
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(GOVERNMENT_ID_PATTERN, "[REDACTED_ID]")
    .replace(PAYMENT_CARD_PATTERN, "[REDACTED_NUMBER]")
    .replace(PHONE_PATTERN, "[REDACTED_PHONE]");
}

export function containsPromptInjection(value) {
  const text = String(value ?? "");
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}
