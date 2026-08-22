import { TERMS_DOCUMENT } from "@tcg/config";
import { LegalDocumentPage } from "../../components/legal-document";

export default function TermsPage() {
  return <LegalDocumentPage document={TERMS_DOCUMENT} />;
}
