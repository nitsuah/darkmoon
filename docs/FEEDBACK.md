# DARKMOON QA CHECKLIST

**Branch**: `phase-9` | **PR**: #40

## QA Feedback

- Home page cards are still messed up at smaller dimensions than max-width (pasted img 1 - 2)
- home page card flip content is still scrunched. make the cards 30% bigger (on both or have the flip also expand the card in both directions up & down slightly) (img 3 )
- OK! THE INTERTIA IS THERE! i think slow it down or decrease the gravity a bit? its not "floaty enough" yet.
- when in the air, shift should be RCS jets on a space suit. so maybe reduce the upward force and increase the duration you can hold the button to keep it going? take input direction from QWEASD too.
- the jetpack should only be triggered by a "double jump" and the effect should be lessened.
- tl;dr player needs to be a bit heavier and floatier. but the walk and sprint speeds are good (we're just a bit too fast in air?)
- tagging logic looks great! except when we tag the bot now, they seem to immediately tag us back even if we try and run away (its like they dont get frozen and theres no delay so they immediately can tag us back). might be a collision state issue? idk.
- add sound effects for jetpack, tagging, footsteps (different for walk vs sprint), landing thud
- for the current background music, this is better but fade it out and in a bit more or mix some open source classical music that fits the theme better and kinda play both maybe? (current can just fade in/out/play over slightly to enhance? idk man)
- did we not ask to implement a "debug tag" mode where you can see the hit-boxes of players and it spawns 2 bots to help with testing tag collisions and logic? can we add this please?

- [ ] **Mobile joystick touch responsiveness**: Test left/right joystick touch on actual device
- [ ] **Two-finger camera rotation**: Verify smoothness on actual device
- [ ] **Jump button activation**: on mobile this should be a double tap on the jump button to trigger the jetpack
- [ ] **Card flip interactions**: just needs a new "expand" animation as part of the flip.

**Note**: All code implementations complete. Final verification requires physical mobile device testing.
