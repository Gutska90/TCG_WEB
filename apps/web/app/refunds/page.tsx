import { REFUNDS_DOCUMENT } from "@tcg/config";
import { LegalDocumentPage } from "../../components/legal-document";

export default function RefundsPage() {
  return <LegalDocumentPage document={REFUNDS_DOCUMENT} />;
}
