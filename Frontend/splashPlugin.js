/* A Vite plugin (used by vite.config.js) that writes the loading screen into index.html, so the very first load shows
   it instead of a blank white page while the app downloads. The screen is built from the same strings as the React
   LoadingScreen (loadingScreen.js), so the two cannot drift. It sits beside #root; main.jsx fades it out with
   dismissSplash() once the app has painted. Tests: node --test Frontend/splashPlugin.test.js */
import { LOADING_CSS, SPLASH_ID, loadingMarkup } from "./loadingScreen.js";

const ROOT = /<div id="root"[^>]*><\/div>/;

export function bondusSplash() {
  return {
    name: "bondus-splash",
    transformIndexHtml(html) {
      if (!ROOT.test(html)) throw new Error('bondus-splash: index.html has no <div id="root"></div> to put the loading screen beside.');
      if (!html.includes("</head>")) throw new Error("bondus-splash: index.html has no </head> to put the loading screen's CSS in.");
      return html
        .replace("</head>", () => `    <style id="eai-ld-css">${LOADING_CSS}</style>\n  </head>`)
        .replace(ROOT, (root) => `${loadingMarkup({ id: SPLASH_ID })}\n    ${root}`);
    },
  };
}
