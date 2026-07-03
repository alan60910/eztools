import { describe, expect, it } from 'vitest'
import { tools } from './tools.js'

describe('tools', () => {
  it('has at least one entry', () => {
    expect(tools.length).toBeGreaterThan(0)
  })

  it.each(tools)('$slug has a path derived from its slug', (tool) => {
    expect(tool.path).toBe(`./tools/${tool.slug}/`)
  })

  it.each(tools)('$slug has a valid status', (tool) => {
    expect(['planned', 'available']).toContain(tool.status)
  })

  it.each(tools)('$slug has a non-empty name and description', (tool) => {
    expect(tool.name.trim().length).toBeGreaterThan(0)
    expect(tool.description.trim().length).toBeGreaterThan(0)
  })
})
