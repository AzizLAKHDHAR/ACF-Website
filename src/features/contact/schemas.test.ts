import { describe, expect, it } from 'vitest';
import { contactSchema } from './schemas';

const valid = {
  locale: 'ar',
  name: 'زائر',
  email: 'visitor@acf.test',
  subject: 'سؤال',
  message: 'مرحبا',
};

describe('contactSchema', () => {
  it('accepts a complete message and trims it', () => {
    const parsed = contactSchema.parse({ ...valid, name: '  زائر  ' });
    expect(parsed.name).toBe('زائر');
  });

  it('reports each missing field with a shared field-error key', () => {
    const result = contactSchema.safeParse({
      locale: 'fr',
      name: '',
      email: 'nope',
      subject: ' ',
      message: '',
    });
    expect(result.success).toBe(false);
    const messages = Object.fromEntries(
      result.error?.issues.map((issue) => [issue.path[0], issue.message]) ?? [],
    );
    expect(messages).toEqual({
      name: 'required',
      email: 'invalidEmail',
      subject: 'required',
      message: 'required',
    });
  });

  it('rejects an unknown locale and over-long messages', () => {
    expect(contactSchema.safeParse({ ...valid, locale: 'de' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, message: 'x'.repeat(5001) }).success).toBe(false);
  });
});
