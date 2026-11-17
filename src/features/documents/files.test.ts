import { describe, expect, it } from 'vitest';
import {
  checkDocumentFile,
  documentMimeType,
  formatFileSize,
  LIBRARY_PATH,
  libraryPath,
  MAX_DOCUMENT_BYTES,
  safeFileName,
} from './files';

describe('safeFileName', () => {
  it('keeps Latin letters, digits, dots, dashes and underscores, lower-cased', () => {
    expect(safeFileName('Procès-verbal AG 2026.PDF')).toBe('proces-verbal-ag-2026.pdf');
    expect(safeFileName('budget_v2.xlsx')).toBe('budget_v2.xlsx');
  });

  it('falls back to "document" when nothing Latin is left, keeping the extension', () => {
    expect(safeFileName('محضر الجلسة.pdf')).toBe('document.pdf');
    expect(safeFileName('...')).toBe('document');
  });

  it('stays within 100 characters, extension included', () => {
    const name = safeFileName(`${'a'.repeat(300)}.docx`);
    expect(name.length).toBeLessThanOrEqual(100);
    expect(name.endsWith('.docx')).toBe(true);
  });
});

describe('library paths', () => {
  it('builds paths the record action accepts', () => {
    const path = libraryPath('3f2b7c1e-1d2a-4b5c-8d9e-0a1b2c3d4e5f', 'Guide des bénévoles.pdf');
    expect(path).toBe('library/3f2b7c1e-1d2a-4b5c-8d9e-0a1b2c3d4e5f/guide-des-benevoles.pdf');
    expect(LIBRARY_PATH.test(path)).toBe(true);
  });

  it('refuses other folders and path tricks', () => {
    expect(LIBRARY_PATH.test('legal/3f2b7c1e-1d2a-4b5c-8d9e-0a1b2c3d4e5f/x.pdf')).toBe(false);
    expect(LIBRARY_PATH.test('library/3f2b7c1e-1d2a-4b5c-8d9e-0a1b2c3d4e5f/../x.pdf')).toBe(false);
    expect(LIBRARY_PATH.test('library/x/y.pdf')).toBe(false);
  });
});

describe('file checks', () => {
  it('reads the type from the browser, or from the extension when it reports none', () => {
    expect(documentMimeType({ name: 'a.pdf', type: 'application/pdf' })).toBe('application/pdf');
    expect(documentMimeType({ name: 'notes.md', type: '' })).toBe('text/markdown');
    expect(documentMimeType({ name: 'photo.JPEG', type: '' })).toBe('image/jpeg');
    expect(documentMimeType({ name: 'run.exe', type: 'application/x-msdownload' })).toBeNull();
    expect(documentMimeType({ name: 'archive.zip', type: '' })).toBeNull();
  });

  it('checks type, emptiness and the 20 MB limit', () => {
    expect(checkDocumentFile({ name: 'a.pdf', type: 'application/pdf', size: 10 })).toBe('ok');
    expect(checkDocumentFile({ name: 'a.zip', type: 'application/zip', size: 10 })).toBe(
      'fileType',
    );
    expect(checkDocumentFile({ name: 'a.pdf', type: 'application/pdf', size: 0 })).toBe('empty');
    expect(
      checkDocumentFile({ name: 'a.pdf', type: 'application/pdf', size: MAX_DOCUMENT_BYTES + 1 }),
    ).toBe('fileTooLarge');
  });

  it('formats sizes in the page language', () => {
    expect(formatFileSize(512, 'en')).toBe('512 byte');
    expect(formatFileSize(1536, 'en')).toBe('1.5 kB');
    expect(formatFileSize(5 * 1024 * 1024, 'fr-TN')).toMatch(/^5\sMo$/);
  });
});
