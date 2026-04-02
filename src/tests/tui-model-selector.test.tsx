import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ModelSelector } from '@codeagora/tui/components/ModelSelector.js';
import type { SelectedModel } from '@codeagora/tui/components/ModelSelector.js';

// ============================================================================
// Mock fs/promises to provide model data synchronously in tests
// ============================================================================

const { mockReadFile } = vi.hoisted(() => {
  const mockData = JSON.stringify({
    models: [
      { source: 'groq', model_id: 'llama-3.3-70b', name: 'Llama 3.3 70B', tier: 'A', context: '131k', aa_price_input: 0, aa_price_output: 0 },
      { source: 'nim', model_id: 'z-ai/glm5', name: 'GLM 5', tier: 'S+', context: '128k', aa_price_input: 1, aa_price_output: 3.2 },
      { source: 'nim', model_id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', tier: 'S+', context: '128k', aa_price_input: 0.6, aa_price_output: 3 },
      { source: 'openrouter', model_id: 'meta/llama-3.3-70b', name: 'Llama 3.3 70B OR', tier: 'A', context: '131k', aa_price_input: 0, aa_price_output: 0 },
    ],
  });
  return { mockReadFile: vi.fn().mockResolvedValue(mockData) };
});

vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
}));

// Mock GROQ_API_KEY so at least one provider shows as available
const originalEnv = process.env;
beforeAll(() => {
  process.env = { ...originalEnv, GROQ_API_KEY: 'test-key' };
  return () => { process.env = originalEnv; };
});

// Helper: render and wait for async useEffect to populate models
async function renderAndWait(props: React.ComponentProps<typeof ModelSelector>) {
  const result = render(<ModelSelector {...props} />);
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 50));
    const frame = result.lastFrame() ?? '';
    if (frame.includes('models') && !frame.includes('0/0 models')) break;
  }
  return result;
}

// ============================================================================
// Tests
// ============================================================================

describe('ModelSelector', () => {
  it('renders the Select Model title', () => {
    const { lastFrame } = render(
      <ModelSelector onSelect={() => {}} onCancel={() => {}} />
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Select Model');
  });

  it('shows search input with cursor', () => {
    const { lastFrame } = render(
      <ModelSelector onSelect={() => {}} onCancel={() => {}} />
    );
    const frame = lastFrame() ?? '';
    // Cursor character "|" and placeholder text
    expect(frame).toContain('|');
    expect(frame).toContain('type to search');
  });

  it('shows available models by default (groq has key)', async () => {
    const { lastFrame } = await renderAndWait({ onSelect: () => {}, onCancel: () => {} });
    const frame = lastFrame() ?? '';
    // groq model should be visible (API key set)
    expect(frame).toContain('Llama 3.3 70B');
    expect(frame).toContain('groq');
  });

  it('shows model context size', async () => {
    const { lastFrame } = await renderAndWait({ onSelect: () => {}, onCancel: () => {} });
    const frame = lastFrame() ?? '';
    expect(frame).toContain('131k');
  });

  it('shows FREE label for free models', async () => {
    const { lastFrame } = await renderAndWait({ onSelect: () => {}, onCancel: () => {} });
    const frame = lastFrame() ?? '';
    expect(frame).toContain('FREE');
  });

  it('shows navigation hints', () => {
    const { lastFrame } = render(
      <ModelSelector onSelect={() => {}} onCancel={() => {}} />
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Enter: select');
    expect(frame).toContain('Esc: cancel');
    expect(frame).toContain('Tab: toggle all');
  });

  it('shows model count', async () => {
    const { lastFrame } = await renderAndWait({ onSelect: () => {}, onCancel: () => {} });
    const frame = lastFrame() ?? '';
    expect(frame).toContain('models');
  });

  it('shows selected indicator on first item', async () => {
    const { lastFrame } = await renderAndWait({ onSelect: () => {}, onCancel: () => {} });
    const frame = lastFrame() ?? '';
    // Arrow indicator ▸
    expect(frame).toContain('\u25b8');
  });

  it('hides unavailable providers by default', async () => {
    const { lastFrame } = await renderAndWait({ onSelect: () => {}, onCancel: () => {} });
    const frame = lastFrame() ?? '';
    // nim models should NOT be visible (no NVIDIA_API_KEY)
    expect(frame).not.toContain('GLM 5');
  });

  it('shows toggle info for showing all providers', () => {
    const { lastFrame } = render(
      <ModelSelector onSelect={() => {}} onCancel={() => {}} />
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Tab: toggle all');
  });

  it('passes onCancel callback prop', () => {
    const onCancel = vi.fn();
    const { lastFrame } = render(
      <ModelSelector onSelect={() => {}} onCancel={onCancel} />
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Esc: cancel');
  });

  it('pre-populates search input when provider prop is set', () => {
    const { lastFrame, unmount } = render(
      <ModelSelector provider="groq" onSelect={() => {}} onCancel={() => {}} />
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('groq/');
    unmount();
  });

  it('shows check/cross icons for key status', async () => {
    const { lastFrame } = await renderAndWait({ onSelect: () => {}, onCancel: () => {} });
    const frame = lastFrame() ?? '';
    expect(frame).toContain('✓');
  });
});
