# DARKMOON FEEDBACK

## Phase 8 QA Verification Checklist

**Branch**: `phase-8` | **PR**: #39 | **Commit**: d16b289

Please verify the following fixes work as expected:

### Bot AI & Tag Mechanics

- [ ] **Bot chase**: When bot is IT, it always chases player (no longer moves away) - but this should only happen when the game tag is active and the bot is actually it.
- [ ] **Tag collision**: Easier to tag bot (reduced distance: 1.5→1.2 units) - but the bot cant seem to tag us
- [ ] **Tag cooldown**: 1.5 second delay prevents rapid re-tagging - doesnt seem t work on the collision still triggers the "bot tagged you" message rapidly, it also doesnt change who is it. so the bot tags us but nothing changes. make the delay 3 seconds.
- [ ] **Freeze duration**: Bot/player frozen for 1.5s after being tagged (make it 3 seconds)
- [ ] **Tag game only**: Cannot tag outside active tag games

### Game Settings

- [ ] **Game duration**: Tag games now 1 minute (60s) by default
- [ ] **Dynamic duration**: Games scale +1min per player above 2

### UI Positioning

- [ ] **Press C text**: Positioned below mute/chat buttons (no overlap)
- [ ] **TAG GAME menu**: Moved right, no longer overlaps FPS counter
- [ ] **FPS counter**: Visible at top-right, left of TAG GAME menu

### Jetpack Improvements

- [ ] **Hold duration**: Can hold Space for 1 second (doubled from 0.5s)
- [ ] **Thrust power**: Stronger initial launch and continuous thrust
- [ ] **Floaty feel**: Reduced gravity, less air resistance, more airborne time

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
