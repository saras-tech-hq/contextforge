import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { createHash } from "node:crypto";
import { documentToMarkdown } from "../shared/dist/htmlToMarkdown.js";

const html = `<!doctype html>
<html>
  <head>
    <title>Compatibility Fixture — ContextForge</title>
    <meta name="author" content="QA" />
  </head>
  <body>
    <nav><a href="/">Home</a><a href="/about">About</a></nav>
    <article>
      <h1>Readability compatibility fixture</h1>
      <p>This paragraph exists to exercise the real Readability scoring path.</p>
      <h2>Lists</h2>
      <ul><li>Alpha</li><li>Beta</li><li>Gamma</li></ul>
      <pre><code>const x = 1;
console.log(x);</code></pre>
      <p>A second long paragraph with a <a href="https://example.com/link">link</a> and <strong>bold</strong> text. It needs enough words for Readability to treat the article as the main content of the document rather than navigation chrome.</p>
      <blockquote><p>Quoted material.</p></blockquote>
    </article>
    <footer>Footer noise</footer>
  </body>
</html>`;

const result = documentToMarkdown(
  new JSDOM(html).window.document,
  {
    Readability: Readability,
    TurndownService: TurndownService,
  },
  {},
  "https://example.com/fixture"
);

const markdown = result.markdown;
console.log(
  JSON.stringify(
    {
      readabilityVersion: process.env.READABILITY_VERSION || "unknown",
      title: result.title,
      tokenEstimate: result.tokenEstimate,
      markdownLength: markdown.length,
      markdownSha256: createHash("sha256").update(markdown).digest("hex"),
      markdown,
    },
    null,
    2
  )
);
