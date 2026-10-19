import { LOADING_CSS, loadingMarkup } from "./loadingScreen.js";

/* The Duolingo-style full-screen loading screen: the BONDUS owl grooving on white (dark: #111827) with
   "Getting things ready…" under it. The drawing, the animation and the first-load copy in index.html all come from
   loadingScreen.js, so this is just the React doorway to it. Typical uses:

     <Suspense fallback={<LoadingScreen lang={lang} dark={dark} />}> <LazyPage /> </Suspense>
     {isLoading && <LoadingScreen lang={lang} dark={dark} />}

   Props: `lang` ("en" | "km"), `dark` (the app's theme), `message` (replaces the words; the animated dots are added for
   you, so leave off any trailing "..."). It brings its own CSS, fades in after 150ms (a load that finishes sooner never
   shows it), is a polite status region for screen readers, and stands still when the user asks for reduced motion. */
export default function LoadingScreen({ lang = "en", dark = false, message }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LOADING_CSS }} />
      {/* display: contents keeps this wrapper out of the layout; the overlay inside is position: fixed. The markup is a
          fixed string built from our own dictionary (a custom message is escaped), so injecting it is safe, and React
          leaves it alone between renders, so the animation never restarts. */}
      <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: loadingMarkup({ lang, dark, message }) }} />
    </>
  );
}
