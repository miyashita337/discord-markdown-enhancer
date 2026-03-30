(function () {
  "use strict";

  const PROCESSED_ATTR = "data-dme-processed";
  const RENDER_CLASS = "dme-rendered";
  const TOGGLE_CLASS = "dme-toggle";
  const CONTAINER_CLASS = "dme-container";
  const MERMAID_CLASS = "dme-mermaid";

  // Debounce to avoid excessive processing during Discord's React re-renders
  let debounceTimer = null;
  const DEBOUNCE_MS = 300;

  // Initialize mermaid
  if (typeof mermaid !== "undefined") {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "strict",
      fontFamily: "gg sans, Noto Sans, Helvetica Neue, Helvetica, Arial, sans-serif",
    });
  }

  // Configure marked for tables only
  if (typeof marked !== "undefined") {
    marked.setOptions({
      gfm: true,
      breaks: false,
    });
  }

  /**
   * Check if text contains a markdown table
   * Requires at least a header row, separator row, and one data row
   */
  function containsTable(text) {
    const lines = text.trim().split("\n");
    if (lines.length < 3) return false;

    const pipeRowPattern = /^\s*\|(.+\|)+\s*$/;
    const separatorPattern = /^\s*\|(\s*:?-+:?\s*\|)+\s*$/;

    if (!pipeRowPattern.test(lines[0])) return false;

    for (let i = 1; i < lines.length; i++) {
      if (separatorPattern.test(lines[i])) return true;
    }
    return false;
  }

  /**
   * Check if text is a mermaid diagram definition
   */
  function isMermaidBlock(codeBlock) {
    const lang = codeBlock.querySelector(
      'span[class*="hljs"], span[class*="language-"]'
    );
    if (lang) {
      const classes = lang.className || "";
      if (classes.includes("mermaid")) return true;
    }

    // Fallback: check the text content for mermaid keywords at the start
    const text = codeBlock.textContent.trim();
    const mermaidKeywords = [
      "graph ",
      "graph\n",
      "flowchart ",
      "sequenceDiagram",
      "classDiagram",
      "stateDiagram",
      "erDiagram",
      "gantt",
      "pie ",
      "pie\n",
      "gitGraph",
      "journey",
      "mindmap",
      "timeline",
      "quadrantChart",
      "sankey",
      "xychart",
    ];
    return mermaidKeywords.some(
      (kw) => text.startsWith(kw) || text.startsWith(kw.trim())
    );
  }

  /**
   * Create a toggle button
   */
  function createToggleButton() {
    const btn = document.createElement("button");
    btn.className = TOGGLE_CLASS;
    btn.textContent = "Raw";
    btn.title = "Toggle rendered/raw view";
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const container = this.closest("." + CONTAINER_CLASS);
      if (!container) return;

      const rendered = container.querySelector("." + RENDER_CLASS);
      const original = container.querySelector("[data-dme-original]");

      if (rendered.style.display === "none") {
        rendered.style.display = "";
        original.style.display = "none";
        this.textContent = "Raw";
      } else {
        rendered.style.display = "none";
        original.style.display = "";
        this.textContent = "Render";
      }
    });
    return btn;
  }

  /**
   * Render a markdown table
   */
  function renderTable(codeElement) {
    const text = codeElement.textContent;
    if (!containsTable(text)) return;

    const html = marked.parse(text);
    // Verify that marked actually produced a table
    if (!html.includes("<table")) return;

    wrapWithRendered(codeElement.closest("pre") || codeElement, html);
  }

  /**
   * Render a mermaid diagram
   */
  async function renderMermaid(codeBlock) {
    const text = codeBlock.textContent.trim();
    const id = "dme-mermaid-" + Math.random().toString(36).substr(2, 9);

    try {
      const { svg } = await mermaid.render(id, text);
      const mermaidHtml = `<div class="${MERMAID_CLASS}">${svg}</div>`;
      wrapWithRendered(codeBlock.closest("pre") || codeBlock, mermaidHtml);
    } catch (err) {
      console.warn("[DME] Mermaid render failed:", err.message);
    }
  }

  /**
   * Wrap original element with rendered output + toggle
   */
  function wrapWithRendered(originalElement, renderedHtml) {
    if (originalElement.getAttribute(PROCESSED_ATTR)) return;
    originalElement.setAttribute(PROCESSED_ATTR, "true");

    const container = document.createElement("div");
    container.className = CONTAINER_CLASS;

    // Clone original and hide it
    const originalClone = originalElement.cloneNode(true);
    originalClone.setAttribute("data-dme-original", "true");
    originalClone.style.display = "none";

    // Create rendered view
    const renderedDiv = document.createElement("div");
    renderedDiv.className = RENDER_CLASS;
    renderedDiv.innerHTML = renderedHtml;

    // Assemble
    container.appendChild(createToggleButton());
    container.appendChild(renderedDiv);
    container.appendChild(originalClone);

    originalElement.parentNode.replaceChild(container, originalElement);
  }

  /**
   * Scan for code blocks in Discord messages and process them
   */
  function scanAndProcess() {
    // Discord renders code blocks as <pre><code>...</code></pre>
    const codeBlocks = document.querySelectorAll(
      `pre:not([${PROCESSED_ATTR}]) code`
    );

    codeBlocks.forEach((codeBlock) => {
      const pre = codeBlock.closest("pre");
      if (!pre || pre.getAttribute(PROCESSED_ATTR)) return;

      // Check for mermaid
      if (isMermaidBlock(codeBlock)) {
        renderMermaid(codeBlock);
        return;
      }

      // Check for table
      if (containsTable(codeBlock.textContent)) {
        renderTable(codeBlock);
      }
    });
  }

  /**
   * Debounced scan
   */
  function debouncedScan() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scanAndProcess, DEBOUNCE_MS);
  }

  /**
   * Set up MutationObserver on Discord's message container
   */
  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }
      if (shouldScan) debouncedScan();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Initial scan
    scanAndProcess();

    console.log("[DME] Discord Markdown Enhancer active");
  }

  // Wait for Discord to finish loading
  if (document.readyState === "complete") {
    startObserver();
  } else {
    window.addEventListener("load", startObserver);
  }
})();
