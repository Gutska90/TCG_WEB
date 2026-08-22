import { MARKETPLACE_DOCUMENT } from "@tcg/config";
import { LegalDocumentPage } from "../../components/legal-document";

export default function MarketplacePolicyPage() {
  return <LegalDocumentPage document={MARKETPLACE_DOCUMENT} />;
}
