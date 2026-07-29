import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownContent } from "../../components/markdown/markdown-content";

function renderReview(content: string) {
  return renderToStaticMarkup(
    createElement(MarkdownContent, {
      content,
      lang: "pt-BR",
      variant: "review",
    }),
  );
}

test("review markdown renders basic formatting, mentions and spoilers", () => {
  const html = renderReview(
    "**Excelente** para @alice, mas o final é ||surpreendente||.",
  );

  assert.match(html, /<strong>Excelente<\/strong>/);
  assert.match(html, /href="\/pt-BR\/u\/alice"/);
  assert.match(html, /class="md-spoiler"/);
});

test("review markdown strips showcase-only embeds and raw media", () => {
  const html = renderReview(
    '!game(celeste)\n\n<img src="https://example.com/cover.jpg" alt="cover" />\n\n![cover](https://example.com/cover.jpg)\n\nhttps://youtube.com/watch?v=dQw4w9WgXcQ',
  );

  assert.doesNotMatch(html, /class="md-gc/);
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, /!game\(celeste\)/);
});
