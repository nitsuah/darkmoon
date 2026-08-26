/**
 * Module-level game input singleton.
 *
 * Event handlers (in Solo.tsx, outside the R3F Canvas) write here;
 * per-frame hooks (PlayerCamera, PlayerWeapon) read and reset here.
 * Using a module singleton avoids threading high-frequency values through
 * React state and the full prop chain.
 */

/** Raw pointer-lock mouse deltas — accumulated between frames, reset after camera consumes them. */
export const mouseMovement = { dx: 0, dy: 0 };

/** Whether the browser pointer lock is currently active. */
export let pointerLocked = false;
export function setPointerLocked(v: boolean): void {
  pointerLocked = v;
}

/** Camera zoom delta from Alt+scroll. Consumed and reset by PlayerCamera each frame. */
export const cameraZoom = { delta: 0 };

/** Weapon scroll direction: +1 = scroll down (next), -1 = scroll up (prev), 0 = none.
 *  Consumed and reset by PlayerWeapon each frame. */
export const weaponScrollInput = { direction: 0 };

/** Whether the player is on a mobile/touch device. Set once on mount; used for aim assist. */
export let isMobile = false;
export function setIsMobile(v: boolean): void {
  isMobile = v;
}

export function resetTransientInput(): void {
  mouseMovement.dx = 0;
  mouseMovement.dy = 0;
  cameraZoom.delta = 0;
  weaponScrollInput.direction = 0;
  pointerLocked = false;
}
