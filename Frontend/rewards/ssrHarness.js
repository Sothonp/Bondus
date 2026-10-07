/* Test helper (not a test): renders the app's React components to static markup in Node, because the project has no
   DOM test library. Vite's SSR loader compiles the .jsx files; react-dom/server renders them. Effects don't run, so
   only the first render is visible — enough to check structure, text and attributes.

     const s = await startSsr();
     const { default: Thing } = await s.load("/Frontend/rewards/Thing.jsx");   // path from the repo root
     const html = s.render(s.h(Thing, { lang: "en" }));
     s.text(html)                                                              // visible text, entities decoded
     await s.close();

   Load a module and every module it shares state with (e.g. a context) through the SAME `s.load`, so they are one
   instance. Run tests from the repository root (the server's root is process.cwd()). */
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

export async function startSsr() {
  // hmr/watch off: no websocket port to fight over when several test files start a server at once, and no file watcher.
  const server = await createServer({
    root: process.cwd(), appType: "custom", logLevel: "error",
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  return {
    load: (path) => server.ssrLoadModule(path),
    h: React.createElement,
    render: (element) => renderToStaticMarkup(element),
    text: (markup) => markup
      .replace(/<[^>]*>/g, " ")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&")
      .replace(/\s+/g, " ").trim(),
    close: () => server.close(),
  };
}
