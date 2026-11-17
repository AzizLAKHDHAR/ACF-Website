import { describe, expect, it } from 'vitest';
import { checkImageFile, fitWithin, MAX_SOURCE_BYTES } from './images';

describe('checkImageFile', () => {
  it('accepts the bucket’s image types under the size limit', () => {
    expect(checkImageFile({ type: 'image/jpeg', size: 2_000_000 })).toBe('ok');
    expect(checkImageFile({ type: 'image/webp', size: MAX_SOURCE_BYTES })).toBe('ok');
  });

  it('rejects other types', () => {
    expect(checkImageFile({ type: 'image/svg+xml', size: 1000 })).toBe('fileType');
    expect(checkImageFile({ type: 'application/pdf', size: 1000 })).toBe('fileType');
    expect(checkImageFile({ type: '', size: 1000 })).toBe('fileType');
  });

  it('rejects oversized files', () => {
    expect(checkImageFile({ type: 'image/png', size: MAX_SOURCE_BYTES + 1 })).toBe('fileTooLarge');
  });
});

describe('fitWithin', () => {
  it('scales the longest side down to the maximum', () => {
    expect(fitWithin(4000, 3000, 800)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1080, 1920, 1600)).toEqual({ width: 900, height: 1600 });
  });

  it('never scales up', () => {
    expect(fitWithin(300, 200, 800)).toEqual({ width: 300, height: 200 });
  });
});
