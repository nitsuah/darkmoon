import * as React from "react";
import { MobileJoystick } from "./MobileJoystick";
import { MobileActionButton } from "./21st.dev/MobileActionButton";

interface MobileControlsProps {
  onJoystickMove: (x: number, y: number) => void;
  onCameraMove: (x: number, y: number) => void;
  onShoot: () => void;
  onShootRelease: () => void;
  onJumpPress: () => void;
  onJumpRelease: () => void;
  onJumpDoubleTap: () => void;
  onSprintPress: () => void;
  onSprintRelease: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onJoystickMove,
  onCameraMove,
  onShoot,
  onShootRelease,
  onJumpPress,
  onJumpRelease,
  onJumpDoubleTap,
  onSprintPress,
  onSprintRelease,
}) => {
  return (
    <>
      {/* Left stick — movement (bottom-left) */}
      <MobileJoystick side="left" label="Move" onMove={onJoystickMove} />

      {/* Right stick — camera aim (bottom-right corner) */}
      <MobileJoystick side="right" label="Aim" onMove={onCameraMove} />

      {/* Fire button — large red button to the left of the right joystick */}
      <MobileActionButton
        position="fire"
        label="Fire"
        icon="🔫"
        onPress={onShoot}
        onRelease={onShootRelease}
      />

      {/* Jump button — above the fire button */}
      <MobileActionButton
        position="jump-right"
        label="Jump"
        icon="⬆️"
        onPress={onJumpPress}
        onRelease={onJumpRelease}
        onDoubleTap={onJumpDoubleTap}
      />

      {/* Sprint button — bottom center */}
      <MobileActionButton
        position="bottom-center"
        label="Sprint"
        icon="⚡"
        onPress={onSprintPress}
        onRelease={onSprintRelease}
      />
    </>
  );
};
