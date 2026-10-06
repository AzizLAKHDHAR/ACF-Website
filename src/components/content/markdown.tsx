import ReactMarkdown, { type Components } from 'react-markdown';
import { isSafeExternalUrl } from '@/lib/content/embeds';

// Post bodies are user-written Markdown. react-markdown builds React elements (raw HTML is not
// rendered), links keep only http(s)/relative/mailto targets, and outbound links get
// rel="nofollow ugc noopener" (CLAUDE.md → Security rule 11). Headings start at h2 (h1 is the title).
const components: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
  a: ({ href, children }) => {
    const target = typeof href === 'string' ? href : '';
    const external = isSafeExternalUrl(target);
    const safe = external || target.startsWith('/') || target.startsWith('mailto:');
    if (!safe) return <span>{children}</span>;
    return (
      <a href={target} {...(external ? { rel: 'nofollow ugc noopener', target: '_blank' } : {})}>
        {children}
      </a>
    );
  },
  img: ({ src, alt }) =>
    typeof src === 'string' && isSafeExternalUrl(src) ? (
      // eslint-disable-next-line @next/next/no-img-element -- user images of unknown size from any host
      <img src={src} alt={alt ?? ''} loading="lazy" referrerPolicy="no-referrer" />
    ) : null,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div
      dir="auto"
      className="flex max-w-3xl flex-col gap-4 text-lg leading-relaxed [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-s-4 [&_blockquote]:ps-4 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h3]:text-xl [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:list-disc [&_ul]:ps-6"
    >
      <ReactMarkdown components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
