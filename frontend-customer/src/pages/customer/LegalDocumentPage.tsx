import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { renderMarkdownToReact, toastError } from '@halal-basket/web';
import { InfoPageShell } from '../../components/layout/InfoPageShell';
import { api } from '../../lib/api';

type LegalDoc = {
  slug: string;
  title: string;
  subtitle: string | null;
  bodyMarkdown: string;
  version: number;
  publishedAt: string | null;
  updatedAt: string;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

export function LegalDocumentPage() {
  const { slug = '' } = useParams();
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setMissing(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setMissing(false);
    api<LegalDoc>(`/platform/legal/${encodeURIComponent(slug)}`)
      .then((d) => {
        setDoc(d);
        setMissing(false);
      })
      .catch((e) => {
        setDoc(null);
        setMissing(true);
        toastError(e, 'Could not load legal page');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <InfoPageShell title="Legal" subtitle="Loading…">
        <p className="text-sm text-[var(--hb-ink)]/55">Please wait…</p>
      </InfoPageShell>
    );
  }

  if (missing || !doc) {
    return (
      <InfoPageShell
        title="Page not found"
        subtitle="This legal document is unavailable or unpublished."
      >
        <p className="text-sm text-[var(--hb-ink)]/65">
          Return to the{' '}
          <Link to="/" className="font-semibold text-[var(--hb-green)]">
            shop
          </Link>{' '}
          or browse other policies in the footer.
        </p>
      </InfoPageShell>
    );
  }

  const updated = formatDate(doc.publishedAt ?? doc.updatedAt);

  return (
    <InfoPageShell title={doc.title} subtitle={doc.subtitle ?? undefined}>
      {updated ? (
        <p className="mb-8 text-xs font-medium uppercase tracking-wide text-[var(--hb-ink)]/45">
          Last updated {updated}
          {doc.version > 1 ? ` · v${doc.version}` : ''}
        </p>
      ) : null}
      <div className="hb-legal-prose space-y-1">
        {renderMarkdownToReact(doc.bodyMarkdown)}
      </div>
    </InfoPageShell>
  );
}
