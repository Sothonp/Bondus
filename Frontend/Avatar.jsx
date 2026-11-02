/* The face in a round profile button: the student's photo, or their initials when they have none or the photo will not
   load (a dead Google address, no connection). It fills the box it is put in, so the button around it keeps its own size,
   colour and focus ring; that button needs `overflow-hidden` for the corners.

   referrerPolicy="no-referrer": Google answers a picture request that carries another site's address as the referrer with
   an error now and then, and nothing here needs to tell Google which page the picture is shown on.
   alt="": the button around it has the accessible name ("Open my profile"), so the picture is decoration. */
import React, { useState } from "react";

export function AvatarFace({ src, initials }) {
  const [failed, setFailed] = useState(null); // the address that did not load, so a new photo gets its own chance
  if (src && failed !== src) {
    return <img src={src} alt="" referrerPolicy="no-referrer" draggable={false} onError={() => setFailed(src)}
      style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />;
  }
  return <>{initials}</>;
}
