import { Text, View, StyleSheet } from "react-native";
import { colors, fonts } from "@/lib/theme";

/** Minimal renderer for the small markdown subset used in learning_notes content
 * (bold, italic, inline code, bullet lists, simple tables). Mirrors apps/web/components/MarkdownLite.tsx. */

function renderInline(text: string, keyPrefix: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return tokens.map((token, i) => {
    const key = `${keyPrefix}-${i}`;
    if (token.startsWith("**") && token.endsWith("**")) {
      return (
        <Text key={key} style={styles.bold}>
          {token.slice(2, -2)}
        </Text>
      );
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <Text key={key} style={styles.code}>
          {token.slice(1, -1)}
        </Text>
      );
    }
    if (token.startsWith("*") && token.endsWith("*")) {
      return (
        <Text key={key} style={styles.italic}>
          {token.slice(1, -1)}
        </Text>
      );
    }
    return <Text key={key}>{token}</Text>;
  });
}

export function MarkdownLite({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let tableBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <View key={key} style={{ gap: 4 }}>
        {listBuffer.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 6 }}>
            <Text style={styles.body}>•</Text>
            <Text style={[styles.body, { flex: 1 }]}>{renderInline(item, `${key}-li-${i}`)}</Text>
          </View>
        ))}
      </View>
    );
    listBuffer = [];
  };

  const flushTable = (key: string) => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer.filter((r) => !/^\|?\s*-+\s*\|/.test(r)).map((r) =>
      r
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    );
    const [header, ...body] = rows;
    blocks.push(
      <View key={key} style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", gap: 8, borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 4 }}>
          {header.map((h, i) => (
            <Text key={i} style={[styles.tableHeader, { flex: 1 }]}>
              {h}
            </Text>
          ))}
        </View>
        {body.map((row, ri) => (
          <View key={ri} style={{ flexDirection: "row", gap: 8 }}>
            {row.map((c, ci) => (
              <Text key={ci} style={[styles.body, { flex: 1 }]}>
                {renderInline(c, `${key}-c-${ri}-${ci}`)}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
    tableBuffer = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("|")) {
      flushList(`list-${idx}`);
      tableBuffer.push(trimmed);
      return;
    }
    flushTable(`table-${idx}`);

    if (trimmed.startsWith("- ")) {
      listBuffer.push(trimmed.slice(2));
      return;
    }
    flushList(`list-${idx}`);

    if (trimmed.length === 0) return;

    blocks.push(
      <Text key={`p-${idx}`} style={styles.body}>
        {renderInline(trimmed, `p-${idx}`)}
      </Text>
    );
  });
  flushList("list-end");
  flushTable("table-end");

  return <View style={{ gap: 10 }}>{blocks}</View>;
}

const styles = StyleSheet.create({
  body: { fontSize: 13.5, lineHeight: 20, color: colors.textSecondary },
  bold: { fontFamily: fonts.bodySemiBold, color: colors.textPrimary },
  italic: { fontStyle: "italic" },
  code: { fontFamily: "monospace", fontSize: 12.5, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 4 },
  tableHeader: { fontFamily: fonts.display, fontWeight: "700", fontSize: 12, color: colors.textMuted },
});
