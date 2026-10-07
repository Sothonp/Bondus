import { createContext, useContext } from "react";
import { emptyRewards } from "./rewardLogic.js";

/* What the rewards feature shares through React context. App owns the state (see `rewardsApi` there) and provides it
   around the signed-in screens; owls, the treasure box and the Wardrobe read it with useRewards().
     outfit        the SAVED outfit: { hat, face, body, extra } of item ids or null — every owl wears it
     owned         ids of the items the student has unlocked
     isClaimed(k)  has the set with this key already paid its box?
     claimSet(…)   claim the box for a finished set → the result the pop-up shows, or null if already claimed
     equip / saveOutfit / openWardrobe   change the saved outfit, or go to the Wardrobe page
   Outside a provider (the pre-account screens) the default below is an empty wardrobe, so owls simply wear nothing. */
const noop = () => {};

export const DEFAULT_REWARDS_API = {
  outfit: emptyRewards().outfit,
  owned: [],
  isClaimed: () => false,
  claimSet: () => null,
  equip: noop,
  saveOutfit: noop,
  openWardrobe: noop,
};

export const RewardsContext = createContext(DEFAULT_REWARDS_API);
export const useRewards = () => useContext(RewardsContext);
