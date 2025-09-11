"use client";

import React from "react";

/**
 * Renderiza un subconjunto MUY simple de Markdown de forma segura:
 * - Líneas que empiezan por "#" se muestran en negrita (título ligero)
 * - **negrita**
 * - *cursiva* y _cursiva_
 * No interpreta enlaces, HTML, tablas ni código.
 */
export function MarkdownText({ text, className }: { text: string | undefined | null; className?: string }) {
  const html = React.useMemo(() => renderSimpleMarkdown(text ?? ""), [text]);
  return (
    <div
      className={className}
      // Seguro: escapamos primero y luego insertamos etiquetas controladas
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderSimpleMarkdown(input: string): string {
  // Normalizamos saltos de línea y escapamos HTML
  const escaped = escapeHtml(input);

  // Procesamos por líneas para detectar encabezados tipo '# '
  const lines = escaped.split(/\r?\n/);
  const processed = lines.map((line) => {
    // Títulos: cualquier línea que empiece con una o más '#'
    const headingMatch = line.match(/^\s*#+\s+(.*)$/);
    let content = headingMatch ? `<span class="font-semibold">${headingMatch[1]}</span>` : line;

    // Negrita **texto**
    content = content.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Cursiva *texto* (evita chocar con la negrita ya reemplazada)
    content = content.replace(/(^|[^*])\*(?!\s)(.+?)(?<!\s)\*/g, "$1<em>$2</em>");

    // Cursiva _texto_
    content = content.replace(/_(.+?)_/g, "<em>$1</em>");

    return content;
  });

  // Unimos líneas conservando saltos
  return processed.join("<br/>");
}

export default MarkdownText;
