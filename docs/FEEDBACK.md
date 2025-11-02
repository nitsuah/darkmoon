# DARKMOON FEEDBACK

## Phase 8 QA Verification Checklist

**Branch**: `phase-8` | **PR**: #39 | **Commit**: d16b289

Please verify the following fixes work as expected:

### Bot AI & Tag Mechanics

- [ ] **Bot Debug** maybe we should add another bot and have them both simulate much faster games of tag (5-10 secs) and log events locally (for local debugging) to help debug? and iterate/etc. (slow ML)
- [ ] **Bot chase**: When bot is IT, it always chases player (no longer moves away) - but this should only happen when the game tag is active and the bot is actually it.
- [ ] **Tag collision**: Easier to tag bot (reduced distance: 1.5→1.2 units) - but the bot cant seem to tag us
- [ ] **Tag cooldown**: 1.5 second delay prevents rapid re-tagging - doesnt seem t work on the collision still triggers the "bot tagged you" message rapidly, it also doesnt change who is it. so the bot tags us but nothing changes. make the delay 3 seconds.
- [ ] **Freeze duration**: Bot/player frozen for 1.5s after being tagged (make it 3 seconds)
- [ ] **Tag game only**: Cannot tag outside active tag games
- [ ]

### UI Positioning

### Jetpack Improvements

- [ ] this is a joke right? we just hop higher. theres no inertia, no moon gravity, no floaty feel, no fun. fix this plz.

### Home Page

- [ ] **Flip card**: Solo Practice card flips on hover showing game features
- [ ] **Features list**: Shows Smart AI, Tag mechanics, Jetpack, Practice controls

---

## Open Issues (Phase 9)

### Mobile Joystick Touch (HIGH PRIORITY)

Right joystick appears on a grey bar at top-right instead of lower-right. Left joystick doesn't respond to touch. Two-finger touch should work like right-click but doesn't. Single touch (not on joystick) should do nothing. Investigate touch event handling and joystick positioning/responsiveness.

**Note**: May need input toggle for mobile controls or investigate proven React joystick libraries.

### Mobile Browser Address Bar (MEDIUM PRIORITY)

Current `dvh` solution doesn't work on mobile Safari or Android Chrome. Address bar still visible on load and after device rotation. Need alternative approach (possibly viewport-fit=cover meta tag or iOS-specific handling).

---

## Completed in Phase 8

✅ Bot AI chase behavior fixed  
✅ Tag collision distance reduced  
✅ Tag cooldown enforced (1.5s)  
✅ Freeze duration increased (1.5s)  
✅ Tag game duration shortened to 1 minute  
✅ Dynamic duration scaling implemented  
✅ Prevent tagging outside active games  
✅ UI positioning conflicts resolved  
✅ Jetpack mechanics improved (hold 1s, stronger thrust, more floaty)  
✅ Home page flip card animation added
