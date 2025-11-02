# DARKMOON QA CHECKLIST

**Branch**: `phase-9` | **PR**: #40

- bot2 seems to be spawning inside the rock.
- we need to fix some of the collision/invisible boxing on the tops of the rocks
- make sure players and bots dont spawn in the same place as rocks.
- make debug tag games take 1 minute instead of seconds (games are too fast, both debug and normal at 7 seconds)
- starting a game of tag seems to default to debug. (it should default to no game started and nobody being it yet until the game starts)
- pressing "start debug" again doesnt "stop" debug mode (it should, and the button should say "stop debug" when in debug mode)
- when loading the game, tag is already started and the player is "it".
- the debug tag mode ui should appear below the game mode ui on the right side.
- what is with the weird green blocks around the bots/AI? should this be a sphere that we can see through more effectively? does this represent their hitbox or hit radius?
- sprint should not affect the jet pack
- a single jump should just do a regular jump. a double tap on the jump button (mobile) or the space bar or quick double press of the space bar should trigger the jetpack.
- slow the player speed down a bit more when using the jetpack (its too fast right now)
- when the player lands after using the jetpack, there should be a landing sound effect and a dust kickup effect.
- when the player is using the jetpack, there should be a continuous jetpack sound and visual effect.
- Improve the design of our spaceman (pasted image 2) - make our body, helmet, and jetpack more visually interesting and detailed. give some minor ambulation to the arms and legs while walking (alternate direction they point)/running (alternate direction of arms very quickly) and jet packing (arms and legs should kind of kick back/point behind a bit or rag doll if possible).

## QA Feedback

- [ ] **Debug Mode**: Verify "Start Debug" button functionality in GameUI
- [ ] **Mobile joystick touch responsiveness**: Test left/right joystick touch on actual device
- [ ] **Two-finger camera rotation**: Verify smoothness on actual device
- [ ] **Jump button activation**: on mobile this should be a double tap on the jump button to trigger the jetpack
- [ ] **Card flip interactions**: just needs a new "expand" animation as part of the flip.

**Note**: All code implementations complete. Final verification requires physical mobile device testing.
