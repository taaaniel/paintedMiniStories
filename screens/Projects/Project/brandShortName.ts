export const getBrandShortName = (brand?: string): string => {
  const raw = String(brand ?? '').trim();
  if (!raw) return '';

  if (raw === 'greenStuffWorld') return 'GSW';
  if (raw.toLowerCase() === 'green stuff world') return 'GSW';

  if (raw === 'twoThinCoatsPaints') return 'Two Thin Coats';
  if (raw.toLowerCase() === 'two thin coats paints') return 'Two Thin Coats';

  return raw;
};
