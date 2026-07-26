import React from 'react';
import FilterCombo from './FilterCombo';

/**
 * Numeric screener bound with typeahead presets (still accepts any typed number).
 */
export default function NumericFilterCombo({
  label,
  labelStyle,
  inputStyle,
  value,
  onChange,
  options = [],
  placeholder = '—',
}) {
  return (
    <FilterCombo
      label={label}
      labelStyle={labelStyle}
      inputStyle={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }}
      value={value ?? ''}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      emptyLabel="Clear"
      maxVisible={64}
    />
  );
}
