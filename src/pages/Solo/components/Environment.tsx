import React from "react";
import { type QualitySettings } from "./SoloScene.types";

type RockPosition = { x: number; z: number; size: number; height: number };

type Props = {
  qualitySettings: QualitySettings;
  rockPositions: RockPosition[];
};

const Environment: React.FC<Props> = ({ qualitySettings, rockPositions }) => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow={qualitySettings.shadows}
      />

      <gridHelper args={[100, 100]} />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#888888" />
      </mesh>

      {rockPositions.map((rock, i) => (
        <mesh
          key={`rock-${i}`}
          position={[rock.x, rock.height / 2, rock.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[rock.size, rock.height, rock.size]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
      ))}
    </>
  );
};

export default Environment;
