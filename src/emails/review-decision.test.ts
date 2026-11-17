import { describe, expect, it } from 'vitest';
import { renderReviewDecisionEmail, type ReviewDecision } from './review-decision';

const base = {
  recipientName: 'Demo Artist',
  profileName: 'Les Pixels (démo)',
  editorUrl: 'https://acf.test/fr/account/profiles/00000000-0000-4000-b000-000000000001',
  publicUrl: 'https://acf.test/fr/artists/demo-les-pixels',
};

describe('review decision email', () => {
  for (const locale of ['ar', 'fr', 'en'] as const) {
    for (const decision of ['approved', 'rejected', 'suspended', 'reinstated'] as ReviewDecision[]) {
      it(`${decision} in ${locale}`, () => {
        const email = renderReviewDecisionEmail({
          ...base,
          locale,
          decision,
          notePublic: decision === 'approved' ? null : 'Merci d’ajouter une biographie.',
        });
        expect(email).toMatchSnapshot();
      });
    }
  }

  it('only links the public page when the profile is public', () => {
    const rejected = renderReviewDecisionEmail({
      ...base,
      locale: 'fr',
      decision: 'rejected',
      notePublic: 'Note',
    });
    expect(rejected.text).not.toContain(base.publicUrl);
    const approved = renderReviewDecisionEmail({
      ...base,
      locale: 'fr',
      decision: 'approved',
      notePublic: null,
    });
    expect(approved.text).toContain(base.publicUrl);
    expect(approved.text).toContain(base.editorUrl);
  });

  it('keeps user text on one line in the subject and greeting', () => {
    const email = renderReviewDecisionEmail({
      ...base,
      locale: 'en',
      decision: 'approved',
      notePublic: null,
      profileName: 'Evil\r\nBcc: x@evil.test',
      recipientName: 'Name\nInjected',
    });
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.text.split('\n')[0]).toContain('Name Injected');
  });
});
