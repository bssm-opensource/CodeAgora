/**
 * ConfigDiff — Shows config differences between two sessions.
 * Renders a table of changed keys with old/new values.
 * Unchanged keys are hidden by default (toggle to show all).
 */

import React, { useState, useMemo } from 'react';

interface ConfigDiffProps {
  configA: Record<string, unknown>;
  configB: Record<string, unknown>;
}

interface DiffEntry {
  key: string;
  valueA: unknown;
  valueB: unknown;
  changed: boolean;
}

/**
 * Flatten a nested object into dot-notation keys.
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Format a value for display.
 */
function formatValue(value: unknown): string {
  if (value === undefined) return '--';
  if (value === null) return 'null';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Build a sorted list of diff entries from two flat config objects.
 */
function buildDiffEntries(
  flatA: Record<string, unknown>,
  flatB: Record<string, unknown>,
): DiffEntry[] {
  const allKeys = new Set([...Object.keys(flatA), ...Object.keys(flatB)]);
  const entries: DiffEntry[] = [];

  for (const key of [...allKeys].sort()) {
    const valueA = flatA[key];
    const valueB = flatB[key];
    const changed = JSON.stringify(valueA) !== JSON.stringify(valueB);
    entries.push({ key, valueA, valueB, changed });
  }

  return entries;
}

export function ConfigDiff({ configA, configB }: ConfigDiffProps): React.JSX.Element {
  const [showAll, setShowAll] = useState(false);

  const entries = useMemo(() => {
    const flatA = flattenObject(configA);
    const flatB = flattenObject(configB);
    return buildDiffEntries(flatA, flatB);
  }, [configA, configB]);

  const changedCount = entries.filter((e) => e.changed).length;
  const displayed = showAll ? entries : entries.filter((e) => e.changed);

  if (entries.length === 0) {
    return (
      <div className="config-diff">
        <p className="config-diff__empty">No configuration data available.</p>
      </div>
    );
  }

  return (
    <div className="config-diff">
      <div className="config-diff__header">
        <h4 className="config-diff__title">
          Configuration Differences
          <span className="config-diff__count">
            {changedCount} change{changedCount !== 1 ? 's' : ''}
          </span>
        </h4>
        <button
          type="button"
          className="config-diff__toggle"
          onClick={() => setShowAll((prev) => !prev)}
        >
          {showAll ? 'Show changes only' : `Show all (${entries.length})`}
        </button>
      </div>

      {displayed.length === 0 ? (
        <p className="config-diff__empty">No differences found.</p>
      ) : (
        <table className="config-diff__table">
          <thead>
            <tr>
              <th className="config-diff__th">Key</th>
              <th className="config-diff__th">Session A</th>
              <th className="config-diff__th">Session B</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((entry) => (
              <tr
                key={entry.key}
                className={`config-diff__row${entry.changed ? ' config-diff__row--changed' : ''}`}
              >
                <td className="config-diff__td config-diff__td--key">
                  <code>{entry.key}</code>
                </td>
                <td className={`config-diff__td${entry.changed && entry.valueA !== undefined ? ' config-diff__td--removed' : ''}`}>
                  {formatValue(entry.valueA)}
                </td>
                <td className={`config-diff__td${entry.changed && entry.valueB !== undefined ? ' config-diff__td--added' : ''}`}>
                  {formatValue(entry.valueB)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
