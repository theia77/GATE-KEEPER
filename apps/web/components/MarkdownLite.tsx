/** Minimal, dependency-free renderer for the small markdown subset used in learning_notes
 * content (bold, italic, inline code, bullet lists, simple tables). No dangerouslySetInnerHTML. */

function renderInline(text: string, keyPrefix: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return tokens.map((token, i) => {
    const key = `${keyPrefix}-${i}`;
    if (token.startsWith("**") && token.endsWith("**")) {
      return (
        <strong key={key} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code key={key} className="font-mono text-[13px] bg-black/30 rounded px-1 py-0.5">
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith("*") && token.endsWith("*")) {
      return <em key={key}>{token.slice(1, -1)}</em>;
    }
    return <span key={key}>{token}</span>;
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
      <ul key={key} className="list-disc list-outside pl-5 flex flex-col gap-1">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item, `${key}-li-${i}`)}</li>
        ))}
      </ul>
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
      <div key={key} className="overflow-x-auto">
        <table className="text-sm w-full border-collapse">
          <thead>
            <tr>
              {header.map((h, i) => (
                <th key={i} className="text-left border-b border-hairline px-2 py-1.5 text-inkMuted font-display font-bold">
                  {renderInline(h, `${key}-h-${i}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri}>
                {row.map((c, ci) => (
                  <td key={ci} className="border-b border-hairline/50 px-2 py-1.5">
                    {renderInline(c, `${key}-c-${ri}-${ci}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("| ") || trimmed.startsWith("|")) {
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
      <p key={`p-${idx}`} className="leading-relaxed">
        {renderInline(trimmed, `p-${idx}`)}
      </p>
    );
  });
  flushList("list-end");
  flushTable("table-end");

  return <div className="flex flex-col gap-2.5 text-sm text-inkMuted">{blocks}</div>;
}
