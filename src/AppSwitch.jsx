// src/AppSwitch.jsx
// Skiptu hér á milli "old" og "club" án þess að rugla í main/app.
import OldApp from "./AppOld.jsx";
import ClubApp from "./AppClub.jsx";

const MODE = "old"; // "old" | "club"

export default function AppSwitch() {
  return MODE === "club" ? <ClubApp /> : <OldApp />;
}