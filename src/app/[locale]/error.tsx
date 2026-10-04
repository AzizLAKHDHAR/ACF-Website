'use client';

import { useEffect } from 'react';
import { ErrorView } from '@/components/layout/error-view';

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Surfaces the digest so it can be matched with server logs.
    console.error(error);
  }, [error]);

  return <ErrorView onRetry={retry} />;
}
