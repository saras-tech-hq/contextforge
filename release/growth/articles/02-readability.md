# Draft: What Mozilla Readability actually does

**Status:** unpublished draft

Readability scores DOM nodes to find the article. Turndown emits Markdown. ContextForge runs Readability in the tab (user gesture / activeTab) then Turndown in the popup.

This is the same family of technique as Firefox Reader View. It is not an LLM summarizer. Tables and infoboxes can still be noisy (see Wikipedia extracts).

Public example: https://en.wikipedia.org/wiki/Markdown
