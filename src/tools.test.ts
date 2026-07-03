import { describe, expect, it } from 'vitest'
import { renderToolList } from './render.js'
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

// Integration tests against the *real* tools array (not a hand-built
// fixture, which drifted from reality in sprint 01 — render.test.ts alone
// couldn't have caught src/tools.ts forgetting to flip a tool to available).
describe('tools integration (real data)', () => {
  it('marks apng-to-gif as available at its conventional path', () => {
    const apngToGif = tools.find((tool) => tool.slug === 'apng-to-gif')
    expect(apngToGif).toBeDefined()
    expect(apngToGif?.status).toBe('available')
    expect(apngToGif?.path).toBe('./tools/apng-to-gif/')
  })

  it('renderToolList renders a real <a> link for apng-to-gif and none for still-planned tools', () => {
    const html = renderToolList(tools)

    expect(html).toContain('<a class="tool-link" href="./tools/apng-to-gif/">')

    const stillPlanned = tools.filter((tool) => tool.status === 'planned')
    expect(stillPlanned.length).toBeGreaterThan(0) // sanity: this repo still has planned tools to check
    for (const tool of stillPlanned) {
      expect(html).not.toContain(`href="${tool.path}"`)
    }

    const linkCount = (html.match(/<a /g) ?? []).length
    const availableCount = tools.filter((tool) => tool.status === 'available').length
    expect(linkCount).toBe(availableCount)
  })
})
