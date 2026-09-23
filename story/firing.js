// ─────────────────────────────────────────────────────────────────────────────
// story/firing.js — the second chance: the Jordan conversation, one more time.
//
// The first time is on the pivot night (story/pivot_day.js): Alex DMs the
// founder right after Jordan claims the board, and "I'll talk to her" opens
// her thread in the same sitting. Every way of not finishing that sentence
// keeps her — and she builds the board at her part-time pace (world.js).
//
// This room is the one that comes after: Alex opens the door once more two
// weeks later (jordan_door_again, story/jordan_arc.js), or for the first time
// after a late pivot (the fifty-match verdict skips the pivot night). Same
// conversation, same beats (story/jordan_talk.js), ids suffixed "_2", and
// every keep-her exit in here is final — there is no third door.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const JT = typeof require !== "undefined" ? require("./jordan_talk.js") : window.JORDAN_TALK;

  const mod = {
    arcs: [
      {
        id: "firing",
        // Jordan's thread, and the founders' chat where it ends.
        scene: { cast: ["founders", "jordan"] },
        beats: JT.jordanTalk("_2", ["jordan_door_again:talk"], true),
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
