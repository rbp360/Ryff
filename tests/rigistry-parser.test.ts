import { describe, it, expect } from 'vitest';
import { parseGearLineWithRigistry, cleanGearText, formatGearTitle } from '../src/lib/rigistry-parser';

describe('Rigistry Gear Parser', () => {
  it('cleans prefixes and redundant colons properly', () => {
    expect(cleanGearText('Want: : Charvel 750XL').cleaned).toBe('Charvel 750XL');
    expect(cleanGearText('Want: Soldano').cleaned).toBe('Soldano');
    expect(cleanGearText('Want: Soldano SLO-30 under £1800').cleaned).toBe('Soldano SLO-30');
    expect(cleanGearText('Want: Soldano SLO-30 under £1800').budget_gbp).toBe(1800);
  });

  it('formats gear titles cleanly without duplication', () => {
    expect(formatGearTitle('Soldano', 'Soldano', null)).toBe('Soldano');
    expect(formatGearTitle('Charvel', '750XL', null)).toBe('Charvel 750XL');
    expect(formatGearTitle('PRS', 'EG', null)).toBe('PRS EG');
    expect(formatGearTitle('PRS', 'PRS EG', null)).toBe('PRS EG');
    expect(formatGearTitle(null, ': Soldano', null)).toBe('Soldano');
    expect(formatGearTitle(null, ':: Charvel 750XL', null)).toBe('Charvel 750XL');
  });

  it('parses Charvel as guitar and Soldano as amp via SQL database brands', async () => {
    const charvel = await parseGearLineWithRigistry('Want: : Charvel 750XL');
    expect(charvel.brand).toBe('Charvel');
    expect(charvel.model).toBe('750XL');
    expect(charvel.category).toBe('guitar');
    expect(charvel.kind).toBe('want');
    expect(charvel.want_key).toBe('charvel 750xl');

    const soldano = await parseGearLineWithRigistry('Want: Soldano');
    expect(soldano.brand).toBe('Soldano');
    expect(soldano.category).toBe('amp');
    expect(soldano.kind).toBe('want');
    expect(soldano.want_key).toBe('soldano');

    const prs = await parseGearLineWithRigistry('Want: PRS EG');
    expect(prs.brand).toBe('PRS');
    expect(prs.model).toBe('EG');
    expect(prs.category).toBe('guitar');
    expect(prs.want_key).toBe('prs eg');

    const tubescreamer = await parseGearLineWithRigistry('Ibanez Tubescreamer');
    expect(tubescreamer.brand).toBe('Ibanez');
    expect(tubescreamer.category).toBe('pedal');
  });
});
