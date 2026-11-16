import { describe, expect, it } from 'vitest'

import { fillTemplate, formatPhone, normalizePhone, whatsappLink } from '@/lib/phone'

describe('normalizePhone (Israel, 972)', () => {
  it.each([
    ['050-123-4567', '972501234567'],
    ['0501234567', '972501234567'],
    ['050 123 4567', '972501234567'],
    ['+972 50-123-4567', '972501234567'],
    ['00972501234567', '972501234567'],
    ['972501234567', '972501234567'],
    ['501234567', '972501234567'],
    ['+44 7700 900123', '447700900123'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizePhone(input, '972')).toBe(expected)
  })

  it.each(['', 'abc', '123', '05'])('rejects %j', (input) => {
    expect(normalizePhone(input, '972')).toBeNull()
  })
})

describe('formatPhone', () => {
  it('shows local numbers the local way', () => {
    expect(formatPhone('972501234567', '972')).toBe('050-123-4567')
  })
  it('shows foreign numbers with +', () => {
    expect(formatPhone('447700900123', '972')).toBe('+447700900123')
  })
})

describe('messages', () => {
  it('fills the WhatsApp template', () => {
    expect(fillTemplate('היי {name}! מחכים לכם תוך {hold} דקות.', { name: 'דנה', hold: 10 })).toBe(
      'היי דנה! מחכים לכם תוך 10 דקות.',
    )
  })
  it('leaves unknown placeholders alone', () => {
    expect(fillTemplate('{name} {other}', { name: 'x' })).toBe('x {other}')
  })
  it('builds a wa.me link with the text encoded', () => {
    expect(whatsappLink('972501234567', 'היי!')).toBe('https://wa.me/972501234567?text=%D7%94%D7%99%D7%99!')
  })
})
