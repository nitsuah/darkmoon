import * as React from "react";
import { MobileJoystick } from "./MobileJoystick";
import { MobileButton } from "./MobileButton";

interface MobileControlsProps {
  onJoystickMove: (x: number, y: number) => void;
  onJumpPress: () => void;
  onJumpRelease: () => void;
  onJumpDoubleTap: () => void;
  onSprintPress: () => void;
  onSprintRelease: () => void;
}

/**
 * Mobile control overlay with joystick and action buttons
 * Only rendered on touch-enabled devices
 */
export const MobileControls: React.FC<MobileControlsProps> = ({
  onJoystickMove,
  onJumpPress,
  onJumpRelease,
  onJumpDoubleTap,
  onSprintPress,
  onSprintRelease,
}) => {
  return (
    <>
      <MobileJoystick side="left" label="Move" onMove={onJoystickMove} />
      <MobileButton
        position="bottom-right"
        label="Jump"
        onPress={onJumpPress}
        onRelease={onJumpRelease}
        onDoubleTap={onJumpDoubleTap}
      />
      <MobileButton
        position="bottom-center"
        label="Sprint"
        onPress={onSprintPress}
        onRelease={onSprintRelease}
      />
    </>
  );
};
