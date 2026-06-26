import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('merges base classes', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })

  it('handles conditional classes', () => {
    expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2')
    expect(cn({ class1: true, class2: false })).toBe('class1')
  })

  it('merges tailwind classes correctly (overrides earlier classes with later ones)', () => {
    // Background color override
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
    // Padding override
    expect(cn('px-2 py-1', 'p-4')).toBe('p-4')
    // Text size override
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
    // Tailwind + custom class
    expect(cn('text-sm custom-class', 'text-lg')).toBe('custom-class text-lg')
  })

  it('handles arrays of classes', () => {
    expect(cn(['class1', 'class2'], ['class3'])).toBe('class1 class2 class3')
    expect(cn(['bg-red-500', 'text-sm'], 'bg-blue-500')).toBe('text-sm bg-blue-500')
  })

  it('handles undefined, null, and empty inputs gracefully', () => {
    expect(cn('class1', undefined, null, '', false, 'class2')).toBe('class1 class2')
    expect(cn()).toBe('')
    expect(cn(undefined)).toBe('')
    expect(cn(null)).toBe('')
  })
})
