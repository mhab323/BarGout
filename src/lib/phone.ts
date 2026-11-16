/**
 * Phone numbers and WhatsApp click-to-chat links.
 * wa.me needs the full international number, digits only: 050-123-4567 -> 972501234567.
 */

/** Turn what was typed into international digits, or null if it can't be a phone number. */
export function normalizePhone(input: string, countryCode: string): string | null {
  let digits = input.replace(/[^\d+]/g, '')
  if (!digits) return null

  if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = countryCode + digits.slice(1) // local: 050... -> 97250...
  else if (!digits.startsWith(countryCode)) digits = countryCode + digits // 501234567 -> 972501234567

  digits = digits.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15 ? digits : null
}

/** Show a stored number the local way: 972501234567 -> 050-123-4567. */
export function formatPhone(phone: string, countryCode: string): string {
  if (!phone.startsWith(countryCode)) return `+${phone}`
  const local = '0' + phone.slice(countryCode.length)
  return local.length === 10 ? `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}` : local
}

/** Fill {name}, {hold}, {hours}... in a message template. Unknown placeholders stay as they are. */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}
