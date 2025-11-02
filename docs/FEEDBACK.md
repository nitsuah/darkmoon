# DARKMOON QA CHECKLIST

**Branch**: `phase-9` | **PR**: #40

## Recently Completed - Please Verify

### Character Model & Tag Fixes

- [ ] Arms animate when moving/sprinting, head follows camera
- [ ] Visible jetpack on all characters
- [ ] Only tagged player freezes (not tagger)
- [ ] Character colors update instantly when IT changes
- [ ] Bots sprint in bursts when IT (2s sprint, 5s cooldown)
- [ ] Tag UI shows correct IT player in real-time

---

## QA Feedback

- [ ] **Debug Mode**: Verify "Start Debug" button functionality in GameUI
- [ ] **Mobile joystick touch responsiveness**: Test left/right joystick touch on actual device
- [ ] **Two-finger camera rotation**: Verify smoothness on actual device
- [ ] **Jump button activation**: on mobile this should be a double tap on the jump button to trigger the jetpack
- [ ] **Card flip interactions**: just needs a new "expand" animation as part of the flip.

**Note**: All code implementations complete. Final verification requires physical mobile device testing.
