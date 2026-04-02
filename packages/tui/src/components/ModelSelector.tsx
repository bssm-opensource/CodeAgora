/**
 * ModelSelector — Searchable model picker with smart defaults.
 *
 * UX improvements (v2.2.1, #445):
 * - Shows available models immediately (API key detected providers first)
 * - Tier replaced with practical info: context window + price
 * - Search with visible cursor and placeholder
 * - Selection confirmation feedback
 * - "Show all" toggle for unavailable providers
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import path from 'path';
import { colors, icons, getTerminalSize } from '../theme.js';
import { isProviderAvailable } from '../utils/provider-status.js';
import { t } from '@codeagora/shared/i18n/index.js';

// ============================================================================
// Types
// ============================================================================

interface ModelEntry {
  source: string;
  model_id: string;
  name: string;
  tier: string;
  context: string;
  aa_price_input?: number;
  aa_price_output?: number;
  aa_speed_tps?: number;
}

export interface SelectedModel {
  id: string;
  name: string;
  tier: string;
  context: string;
  source: string;
}

interface Props {
  source?: string;
  provider?: string;
  onSelect: (model: SelectedModel) => void;
  onCancel: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Helpers
// ============================================================================

function formatPrice(input?: number, output?: number): string {
  if (input == null && output == null) return '';
  if (input === 0 && output === 0) return 'FREE';
  if (input != null && output != null) {
    return `$${input}/$${output}`;
  }
  return '';
}

// ============================================================================
// Component
// ============================================================================

export function ModelSelector({ source, provider: initialProvider, onSelect, onCancel }: Props): React.JSX.Element {
  const [search, setSearch] = useState(initialProvider ? `${initialProvider}/` : '');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadedModels, setLoadedModels] = useState<ModelEntry[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [confirmed, setConfirmed] = useState<SelectedModel | null>(null);

  const { rows } = getTerminalSize();
  const visibleCount = Math.max(rows - 10, 6);

  useEffect(() => {
    const require = createRequire(import.meta.url);
    const rankingsPath = (() => {
      try { return require.resolve('@codeagora/shared/data/model-rankings.json'); } catch {}
      return path.join(__dirname, '../../../shared/src/data/model-rankings.json');
    })();
    readFile(rankingsPath, 'utf-8')
      .then(raw => {
        const data = JSON.parse(raw) as { models?: ModelEntry[] };
        setLoadedModels(data.models ?? []);
      })
      .catch(() => setLoadedModels([]));
  }, []);

  // Sort: available providers first, then by source name
  const allModels = useMemo(() => {
    let models = source && source !== 'all'
      ? loadedModels.filter(m => m.source === source)
      : loadedModels;

    if (!showAll) {
      models = models.filter(m => isProviderAvailable(m.source));
    }

    return models.slice().sort((a, b) => {
      const aAvail = isProviderAvailable(a.source) ? 0 : 1;
      const bAvail = isProviderAvailable(b.source) ? 0 : 1;
      if (aAvail !== bAvail) return aAvail - bAvail;
      return a.source.localeCompare(b.source) || a.name.localeCompare(b.name);
    });
  }, [source, loadedModels, showAll]);

  const filtered = useMemo(() => {
    if (!search) return allModels;
    const lower = search.toLowerCase();

    const slashIdx = lower.indexOf('/');
    if (slashIdx > 0) {
      const providerQuery = lower.slice(0, slashIdx);
      const modelQuery = lower.slice(slashIdx + 1);
      return allModels.filter(m => {
        const sourceMatch = m.source.toLowerCase().includes(providerQuery) ||
                           m.model_id.toLowerCase().startsWith(providerQuery);
        if (!sourceMatch) return false;
        if (!modelQuery) return true;
        return m.name.toLowerCase().includes(modelQuery) ||
               m.model_id.toLowerCase().includes(modelQuery);
      });
    }

    return allModels.filter(m =>
      m.name.toLowerCase().includes(lower) ||
      m.model_id.toLowerCase().includes(lower) ||
      m.source.toLowerCase().includes(lower)
    );
  }, [allModels, search]);

  const clampedIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  // Viewport windowing
  const halfHeight = Math.floor(visibleCount / 2);
  let startOffset = Math.max(0, clampedIndex - halfHeight);
  const endOffset = Math.min(filtered.length, startOffset + visibleCount);
  if (endOffset - startOffset < visibleCount && startOffset > 0) {
    startOffset = Math.max(0, endOffset - visibleCount);
  }
  const visibleModels = filtered.slice(startOffset, endOffset);

  useInput((input, key) => {
    if (confirmed) {
      // Any key after confirmation dismisses
      onSelect(confirmed);
      return;
    }
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return && filtered.length > 0) {
      const model = filtered[clampedIndex];
      if (model) {
        const selected: SelectedModel = {
          id: model.model_id,
          name: model.name,
          tier: model.tier,
          context: model.context,
          source: model.source,
        };
        setConfirmed(selected);
      }
      return;
    }
    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(i => Math.min(filtered.length - 1, i + 1));
      return;
    }
    // Tab toggles show all
    if (key.tab) {
      setShowAll(s => !s);
      setSelectedIndex(0);
      return;
    }
    if (key.backspace || key.delete) {
      setSearch(s => s.slice(0, -1));
      setSelectedIndex(0);
      return;
    }
    if (input && !key.return) {
      const clean = input.replace(/[\x00-\x1F\x7F]/g, '');
      if (!clean) return;
      setSearch(s => s + clean);
      setSelectedIndex(0);
    }
  });

  // Confirmation screen
  if (confirmed) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text color={colors.success} bold>{icons.check} </Text>
          <Text bold>{confirmed.source}/{confirmed.name}</Text>
        </Box>
        <Text dimColor>context: {confirmed.context} | {confirmed.id}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press any key to continue</Text>
        </Box>
      </Box>
    );
  }

  const hasAbove = startOffset > 0;
  const hasBelow = endOffset < filtered.length;
  const availableCount = loadedModels.filter(m => isProviderAvailable(m.source)).length;
  const totalCount = loadedModels.length;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={colors.primary}>{t('model.selector.title')}</Text>

      {/* Search bar */}
      <Box marginTop={0}>
        <Text color={colors.muted}>{icons.arrow} </Text>
        <Text>{search || ''}</Text>
        <Text color={colors.primary}>|</Text>
        {!search && <Text dimColor> type to search...</Text>}
        <Text dimColor>  {filtered.length}/{showAll ? totalCount : availableCount} models</Text>
      </Box>

      {/* Filter info */}
      <Box>
        <Text dimColor>
          {showAll
            ? `Showing all models (Tab: show available only)`
            : `Showing ${availableCount} available (Tab: show all ${totalCount})`
          }
        </Text>
      </Box>

      {/* Model list */}
      <Box marginTop={1} flexDirection="column">
        {filtered.length === 0 ? (
          <Text dimColor>
            {showAll ? 'No models match your search' : 'No available models. Press Tab to show all.'}
          </Text>
        ) : (
          <>
            {hasAbove && (
              <Text dimColor>  {icons.arrowDown} {startOffset} more above</Text>
            )}
            {visibleModels.map((model, vi) => {
              const realIndex = startOffset + vi;
              const isSelected = realIndex === clampedIndex;
              const available = isProviderAvailable(model.source);
              const price = formatPrice(model.aa_price_input, model.aa_price_output);

              return (
                <Box key={`${model.source}-${model.model_id}`}>
                  <Text
                    color={isSelected ? colors.primary : undefined}
                    bold={isSelected}
                    dimColor={!available && !isSelected}
                  >
                    {isSelected ? `${icons.arrow} ` : '  '}
                    <Text color={available ? colors.success : colors.error}>
                      {available ? icons.check : icons.cross}
                    </Text>
                    {' '}{model.name}
                  </Text>
                  <Text dimColor={!isSelected}>
                    {' '}
                    <Text color={colors.muted}>({model.source})</Text>
                    {' '}{model.context}
                    {price && <Text color={price === 'FREE' ? colors.success : colors.muted}> {price}</Text>}
                  </Text>
                </Box>
              );
            })}
            {hasBelow && (
              <Text dimColor>  {icons.arrowDown} {filtered.length - endOffset} more below</Text>
            )}
          </>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          {icons.check}=key set  {icons.cross}=no key  |  Enter: select  Esc: cancel  Tab: toggle all
        </Text>
      </Box>
    </Box>
  );
}
