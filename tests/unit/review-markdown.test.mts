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

test("review markdown renders safe images and spoiler images", () => {
  const html = renderReview(
    '![cover](https://example.com/cover.jpg)\n\n<spoilerimg src="https://example.com/ending.jpg" alt="ending" />',
  );

  assert.match(html, /src="https:\/\/example\.com\/cover\.jpg"/);
  assert.match(html, /src="https:\/\/example\.com\/ending\.jpg"/);
  assert.match(html, /class="md-spoiler"/);
  assert.match(html, /loading="lazy"/);
});

test("review markdown strips showcase-only embeds and unsafe media", () => {
  const html = renderReview(
    '!game(celeste)\n\n<img src="javascript:alert(1)" alt="unsafe" />\n\nhttps://youtube.com/watch?v=dQw4w9WgXcQ',
  );

  assert.doesNotMatch(html, /class="md-gc/);
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, /!game\(celeste\)/);
});
