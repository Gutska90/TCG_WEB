import { HELP_FAQS, LEGAL_DOCUMENTS } from "@tcg/config";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Screen } from "../../src/ui/screen";
import { useColors } from "../../src/ui/theme-provider";

export default function LegalScreen() {
  const colors = useColors();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  if (slug === "ayuda") {
    return (
      <Screen title="Ayuda">
        {HELP_FAQS.map((section) => (
          <View key={section.heading} style={{ marginTop: 12, gap: 6 }}>
            <Text style={{ fontWeight: "600" }}>{section.heading}</Text>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph.slice(0, 32)} style={{ fontSize: 15, lineHeight: 22 }}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </Screen>
    );
  }
  const doc = LEGAL_DOCUMENTS.find((item) => item.slug === slug);
  if (!doc) {
    return (
      <Screen title="Documento">
        <Text>No encontramos ese documento.</Text>
      </Screen>
    );
  }
  return (
    <Screen title={doc.title}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>Versión {doc.version}</Text>
      {doc.sections.map((section) => (
        <View key={section.heading} style={{ marginTop: 12, gap: 6 }}>
          <Text style={{ fontWeight: "600" }}>{section.heading}</Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph.slice(0, 32)} style={{ fontSize: 15, lineHeight: 22 }}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </Screen>
  );
}

