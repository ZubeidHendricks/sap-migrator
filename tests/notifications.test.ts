import { describe, it, expect } from 'vitest'
import { commentRecipients, commentPreview } from '@/lib/notifications'

describe('commentRecipients', () => {
  it('includes the owner and prior commenters, excluding the author', () => {
    const r = commentRecipients({ authorId: 'u1', ownerId: 'u2', priorCommenterIds: ['u3', 'u1'] })
    expect(r.sort()).toEqual(['u2', 'u3'])
  })
  it('dedupes when owner is also a prior commenter', () => {
    const r = commentRecipients({ authorId: 'u1', ownerId: 'u2', priorCommenterIds: ['u2', 'u2'] })
    expect(r).toEqual(['u2'])
  })
  it('excludes the author even if they are the owner', () => {
    const r = commentRecipients({ authorId: 'u1', ownerId: 'u1', priorCommenterIds: ['u1'] })
    expect(r).toEqual([])
  })
  it('handles no owner', () => {
    const r = commentRecipients({ authorId: 'u1', ownerId: null, priorCommenterIds: ['u2'] })
    expect(r).toEqual(['u2'])
  })
})

describe('commentPreview', () => {
  it('collapses whitespace', () => {
    expect(commentPreview('hello   world\n\nfoo')).toBe('hello world foo')
  })
  it('truncates long bodies with an ellipsis', () => {
    const out = commentPreview('a'.repeat(200), 80)
    expect(out.length).toBe(80)
    expect(out.endsWith('…')).toBe(true)
  })
  it('leaves short bodies intact', () => {
    expect(commentPreview('short')).toBe('short')
  })
})
