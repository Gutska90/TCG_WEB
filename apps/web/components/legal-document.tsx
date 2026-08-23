import Link from "next/link";
import { LEGAL, type LegalDocument } from "@tcg/config";

export function LegalNotice() {
  return (
    <p className="rounded border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-text">
      {LEGAL.betaNotice}
    </p>
  );
}

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <main className="mx-auto max-w-prose px-6 py-12 text-text">
      <p className="text-sm text-text-muted">
        <Link href="/" className="underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          Inicio
        </Link>
        {" · "}
        <Link href="/ayuda" className="underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          Ayuda
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{document.title}</h1>
      <p className="mt-2 text-sm text-text-muted">Versión {document.version}</p>
      <div className="mt-4">
        <LegalNotice />
      </div>
      {document.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-xl font-semibold">{section.heading}</h2>
          {section.paragraphs.map((paragraph, index) => (
            <p key={`${section.heading}-${index}`} className="mt-3 leading-relaxed text-text">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
