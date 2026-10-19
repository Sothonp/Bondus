/* Pure parts of the landing page's subject ribbon (see SubjectRibbon.jsx): the subject list, the two languages' strings
   and the scroll arithmetic for the arrow buttons, so they can be tested without a browser.

   The ribbon is a Duolingo-style strip of "what you can study here", not the practice bank: its names are the short
   marketing labels, and it lists Economy, which has no practice questions yet. `color` is the tile behind each icon
   (white glyph on top). `km` is the Khmer name shown when the app is in Khmer; those match the subject names used in
   the practice section, except Economy, which is new here. */
export const RIBBON_SUBJECTS = [
  { id: "mathematics", en: "Math", km: "គណិតវិទ្យា", color: "#5B5BD6" },
  { id: "khmer", en: "Khmer", km: "អក្សរសាស្ត្រខ្មែរ", color: "#E0A020" },
  { id: "physics", en: "Physics", km: "រូបវិទ្យា", color: "#0EA5E9" },
  { id: "chemistry", en: "Chemistry", km: "គីមីវិទ្យា", color: "#159A82" },
  { id: "english", en: "English", km: "ភាសាអង់គ្លេស", color: "#D9543F" },
  { id: "biology", en: "Biology", km: "ជីវវិទ្យា", color: "#22A559" },
  { id: "history", en: "History", km: "ប្រវត្តិវិទ្យា", color: "#B8612E" },
  { id: "earth", en: "Earth & Science", km: "ផែនដីវិទ្យា", color: "#0E7490" },
  { id: "economy", en: "Economy", km: "សេដ្ឋកិច្ច", color: "#DB2777" },
  { id: "morality", en: "Morality", km: "សីលធម៌ពលរដ្ឋវិទ្យា", color: "#8B5CF6" },
  { id: "geography", en: "Geography", km: "ភូមិវិទ្យា", color: "#6B8E23" },
];

export const RIBBON_STRINGS = {
  en: { region: "Subjects", left: "Scroll subjects left", right: "Scroll subjects right" },
  km: { region: "មុខវិជ្ជា", left: "រំកិលមុខវិជ្ជាទៅឆ្វេង", right: "រំកិលមុខវិជ្ជាទៅស្តាំ" },
};

/* Which arrows can do something, from the scroll box's numbers. Browsers report fractional scroll positions on zoomed or
   high-DPI screens, so "at the edge" means within one pixel. */
export function scrollState({ scrollLeft, clientWidth, scrollWidth }) {
  return {
    canLeft: scrollLeft > 1,
    canRight: scrollLeft + clientWidth < scrollWidth - 1,
  };
}

// How far an arrow click scrolls: about three quarters of what is visible, so the last item on screen stays in view.
export function scrollStep(clientWidth, direction) {
  return direction * Math.max(160, Math.round(clientWidth * 0.75));
}
