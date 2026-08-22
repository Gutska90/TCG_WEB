import { PRIVACY_DOCUMENT } from "@tcg/config";
import { LegalDocumentPage } from "../../components/legal-document";

export default function PrivacyPage() {
  return <LegalDocumentPage document={PRIVACY_DOCUMENT} />;
}
