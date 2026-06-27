import * as React from "react";
import { MobileJoystick } from "./MobileJoystick";
import { MobileActionButton } from "./21st.dev/MobileActionButton";

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
      <MobileActionButton
        position="bottom-right"
        label="Jump"
        icon="⬆️"
        onPress={onJumpPress}
        onRelease={onJumpRelease}
        onDoubleTap={onJumpDoubleTap}
      />
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
