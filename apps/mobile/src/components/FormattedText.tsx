import React from "react";
import { Text, TextStyle } from "react-native";

export function FormattedText({
  text,
  style,
  spoiler,
}: {
  text: string;
  style?: TextStyle;
  spoiler?: boolean;
}) {
  if (spoiler) {
    return (
      <Text style={[style, { fontStyle: "italic", opacity: 0.85 }]}>
        [Spoiler] {text}
      </Text>
    );
  }
  const lines = text.split("\n");
  return (
    <Text style={style}>
      {lines.map((line, li) => (
        <Text key={li}>
          {li > 0 ? "\n" : ""}
          {parseLine(line, style)}
        </Text>
      ))}
    </Text>
  );
}

function parseLine(line: string, base?: TextStyle) {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      parts.push(line.slice(last, m.index));
    }
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(
        <Text key={i++} style={[base, { fontWeight: "800" }]}>
          {token.slice(2, -2)}
        </Text>,
      );
    } else {
      parts.push(
        <Text key={i++} style={[base, { fontStyle: "italic" }]}>
          {token.slice(1, -1)}
        </Text>,
      );
    }
    last = m.index + token.length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}
