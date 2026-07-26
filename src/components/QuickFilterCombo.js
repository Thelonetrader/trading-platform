import React from 'react';
import MultiFilterCombo from './MultiFilterCombo';
import { chipLabels, idsFromLabels } from '../utils/screenerQuickFilters';

/** Multi-select quick filters stored as catalog ids; dropdown shows labels. */
export default function QuickFilterCombo({
  catalog,
  chipIds = [],
  onChipIdsChange,
  label,
  labelStyle,
  inputStyle,
  placeholder,
  hint,
}) {
  const options = catalog.map((c) => c.label);
  const selected = chipLabels(catalog, chipIds);

  return (
    <div style={{ gridColumn: hint ? '1 / -1' : undefined }}>
      <MultiFilterCombo
        label={label}
        labelStyle={labelStyle}
        inputStyle={inputStyle}
        placeholder={placeholder}
        selected={selected}
        onChange={(labels) => onChipIdsChange(idsFromLabels(catalog, labels))}
        options={options}
        allowCustom={false}
      />
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--tp-text-muted)', marginTop: 6, lineHeight: 1.45 }}>{hint}</div>
      )}
    </div>
  );
}
