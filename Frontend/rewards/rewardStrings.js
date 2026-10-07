/* English and Khmer copy for the treasure-box rewards and the Wardrobe. It lives here, not in App.jsx's STRINGS,
   because these components can't import App.jsx (it imports them) and a separate module lets a test check that the
   two languages stay in step. The Khmer is a draft that still needs a native speaker's review.

   rt(lang, key, vars) looks a string up (falling back to English, then to the key itself) and fills {placeholders}
   from vars; numbers are written with Khmer digits when lang is "km", as everywhere else in the app. */

const KHMER_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
// Same behaviour as localizeNum in App.jsx.
export const localizeDigits = (value, lang) => (lang === "km" ? String(value).replace(/[0-9]/g, (d) => KHMER_DIGITS[d]) : String(value));

export const REWARD_STRINGS = {
  en: {
    rwBoxLabel: "Open treasure box", rwBoxPrompt: "Tap to open your reward!", rwBoxCollected: "Reward collected",
    rwBoxAlready: "Reward already collected for this set.",
    rwTitle: "Treasure unlocked!", rwNew: "NEW", rwSourceRandom: "Random drop", rwSourceMilestone: "Milestone reward",
    rwAllOwned: "You own every item! Here's extra XP.", rwXpEarned: "{n} XP earned", rwFlawless: "Flawless!",
    rwLevel: "Level {n}", rwToNext: "{n} XP to Level {m}", rwLevelUp: "Level up! You're now Level {n}.",
    rwEquipNow: "Equip now", rwEquipped: "Equipped", rwOpenWardrobe: "Open wardrobe", rwContinue: "Continue", rwClose: "Close",
    rarityCommon: "Common", rarityRare: "Rare", rarityEpic: "Epic", rarityLegendary: "Legendary",
    slotHat: "Hat", slotFace: "Face", slotBody: "Clothes", slotExtra: "Extras",
    wardrobeTitle: "Wardrobe", wardrobeSub: "Pick your favourites, then save your Bondus's style.",
    wardrobeUnsaved: "Unsaved changes", wardrobeSave: "Save style", wardrobeSaved: "Style saved", wardrobeReset: "Reset",
    wardrobeRandomHint: "Found in treasure boxes", wardrobeLocked: "Locked",
    hintFirstBox: "Open your first treasure box", hintLevel: "Reach level {n}", hintStreak: "Study {n} days in a row", hintSets: "Complete {n} sets",
  },
  km: {
    rwBoxLabel: "បើកប្រអប់ទ្រព្យសម្បត្តិ", rwBoxPrompt: "ចុចដើម្បីបើករង្វាន់របស់អ្នក!", rwBoxCollected: "បានទទួលរង្វាន់ហើយ",
    rwBoxAlready: "បានទទួលរង្វាន់សម្រាប់សំណុំនេះរួចហើយ។",
    rwTitle: "បើកទ្រព្យសម្បត្តិបានហើយ!", rwNew: "ថ្មី", rwSourceRandom: "ធ្លាក់ដោយចៃដន្យ", rwSourceMilestone: "រង្វាន់ជំហានសំខាន់",
    rwAllOwned: "អ្នកមានរបស់គ្រប់មុខហើយ! នេះជា XP បន្ថែម។", rwXpEarned: "ទទួលបាន {n} XP", rwFlawless: "គ្មានកំហុសសោះ!",
    rwLevel: "កម្រិត {n}", rwToNext: "នៅសល់ {n} XP ដល់កម្រិត {m}", rwLevelUp: "ឡើងកម្រិត! ឥឡូវអ្នកនៅកម្រិត {n}។",
    rwEquipNow: "ពាក់ឥឡូវនេះ", rwEquipped: "បានពាក់ហើយ", rwOpenWardrobe: "បើកបន្ទប់ស្លៀកពាក់", rwContinue: "បន្ត", rwClose: "បិទ",
    rarityCommon: "ធម្មតា", rarityRare: "កម្រ", rarityEpic: "អស្ចារ្យ", rarityLegendary: "ព្រេងនិទាន",
    slotHat: "មួក", slotFace: "មុខ", slotBody: "សម្លៀកបំពាក់", slotExtra: "គ្រឿងលម្អ",
    wardrobeTitle: "បន្ទប់ស្លៀកពាក់", wardrobeSub: "ជ្រើសរើសតាមចិត្ត រួចរក្សាទុកស្ទីលរបស់ Bondus។",
    wardrobeUnsaved: "មានការផ្លាស់ប្តូរមិនទាន់រក្សាទុក", wardrobeSave: "រក្សាទុកស្ទីល", wardrobeSaved: "បានរក្សាទុកស្ទីលហើយ", wardrobeReset: "កំណត់ឡើងវិញ",
    wardrobeRandomHint: "រកឃើញក្នុងប្រអប់ទ្រព្យសម្បត្តិ", wardrobeLocked: "ជាប់សោ",
    hintFirstBox: "បើកប្រអប់ទ្រព្យសម្បត្តិដំបូងរបស់អ្នក", hintLevel: "ឡើងដល់កម្រិត {n}", hintStreak: "រៀនជាប់គ្នា {n} ថ្ងៃ", hintSets: "បញ្ចប់ {n} សំណុំ",
  },
};

// Keys for the things the UI names by id: an item's rarity, a slot, and a milestone's requirement.
export const RARITY_LABEL_KEY = { common: "rarityCommon", rare: "rarityRare", epic: "rarityEpic", legendary: "rarityLegendary" };
export const SLOT_LABEL_KEY = { hat: "slotHat", face: "slotFace", body: "slotBody", extra: "slotExtra" };
export const HINT_KEY = { firstBox: "hintFirstBox", level: "hintLevel", sets: "hintSets", streak: "hintStreak" };

export function rt(lang, key, vars) {
  const text = REWARD_STRINGS[lang]?.[key] ?? REWARD_STRINGS.en[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? localizeDigits(vars[name], lang) : whole)) : text;
}
