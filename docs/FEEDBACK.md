# DARKMOON FEEDBACK

## Phase 8 QA Verification Checklist

**Branch**: `phase-8` | **PR**: #39 | **Commit**: d16b289

Please verify the following fixes work as expected:

### Bot AI & Tag Mechanics

Below are bugs, evaluate the desired code and ensure our game replicates the logic of playing "tag" even if the code might be different or the wording below confusing for our intent. just a simple game of tag between a player and a bot (or two bots to expedite things) where the bot chases when it is "it", flees when not "it", tags when close enough, and obeys game state rules otherwise when not in an active game. Most of this is generic QA feedback and responses to this validation checklist.

- [ ] **Bot Debug Game mode of tag** maybe we should add another bot and have them both simulate much faster games of tag with each other? (5-10 secs) and log events locally (for local debugging) to help debug? and iterate/etc. (slow ML but faster than me debugging manually?) also maybe we should log the events more or some file more accessible for now to debug?/read
- [ ] **Bot chase**: When bot is IT, but only during a game of tag it should chase the player (no longer moves away) - but this should only happen when the game tag is active and the bot is actually it.
- [ ] **Tag collision**: Easier to tag bot (reduced distance: 1.5→1.2 units) - but the bot cant seem to tag us back effectively (tho it says we are being tagged)
- [ ] **Tag cooldown**: 1.5 second delay prevents rapid re-tagging - doesnt seem to work on the collision still triggers the "bot tagged you" message rapidly, it also doesnt change who is "it"s. so the bot tags us but nothing changes. make the delay 3 seconds.
- [ ] **Freeze duration**: Bot/player frozen for 1.5s after being tagged (make it 3 seconds but this does seem to work on the bot but not the player, it should affect whom ever just became "it")
- [ ] **Tag game only**: Shouldnt be able to tag outside of active games (but bot can tag user outside active game right now)
- [ ] update the game music so its not just some static. grab some open source "moon" music or something chill and spacey.
- [ ] **Bot movement**: When the bot is not "it", it should move away from the player (flee) instead of just standing still unless frozen (but that shouldnt really occur right?).

### UI Positioning

### Jetpack Improvements

- [ ] this is a joke right? we just hop higher. theres no inertia, no moon gravity, no floaty feel, no fun. fix this plz.

### Home Page

- [ ] **Flip card**: Solo Practice card flips on hover showing game features are too thin on smaller resolutions (mobile/tablet/halfscreen). Make the card bigger or change the cards so they stack vertically on smaller screens (which they do seem to do but then should allow scroll) maybe a happy balance with one card and scrolling? to maintain a single page home feel? flip works as expected
- [ ] **Features list**: Shows Smart AI, Tag mechanics, Jetpack, Practice controls - these should be tiles/cards/labels like the "free to play, browser based, and no install ones are in the main body. should then allow us to more dynamically scale or add them to the flip side of the cards and make them visually appealing.

---

## Open Issues (Phase 9)

### Mobile Joystick Touch (HIGH PRIORITY)

Right joystick appears on a grey bar at top-right instead of lower-right. Left joystick doesn't respond to touch. Two-finger touch should work like right-click but doesn't. Single touch (not on joystick) should do nothing. Investigate touch event handling and joystick positioning/responsiveness.

**Note**: May need input toggle for mobile controls or investigate proven React joystick libraries.

### Mobile Browser Address Bar (MEDIUM PRIORITY)

Current `dvh` solution doesn't work on mobile Safari or Android Chrome. Address bar still visible on load and after device rotation. Need alternative approach (possibly viewport-fit=cover meta tag or iOS-specific handling).
