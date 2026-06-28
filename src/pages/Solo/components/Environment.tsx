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

      {/* Corner bunkers — match the 4 corner collision boxes in CollisionSystem */}
      {(
        [
          [17.5, 17.5],
          [-17.5, -17.5],
          [17.5, -17.5],
          [-17.5, 17.5],
        ] as [number, number][]
      ).map(([cx, cz], i) => (
        <mesh
          key={`bunker-${i}`}
          position={[cx, 1.5, cz]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[5, 3, 5]} />
          <meshStandardMaterial color="#4a4035" roughness={0.9} />
        </mesh>
      ))}

      {/* Arena boundary walls at ±50 (matching CollisionSystem worldSize) */}
      {(
        [
          [0, 2, 50, 100, 4, 1], // north wall
          [0, 2, -50, 100, 4, 1], // south wall
          [50, 2, 0, 1, 4, 100], // east wall
          [-50, 2, 0, 1, 4, 100], // west wall
        ] as [number, number, number, number, number, number][]
      ).map(([x, y, z, w, h, d], i) => (
        <mesh key={`wall-${i}`} position={[x, y, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color="#334455"
            roughness={0.95}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* Mid-field cover crates — symmetric cross, match CollisionSystem entries */}
      {(
        [
          [0, 8, 3, 1.5, 2], // north: 3w × 1.5h × 2d
          [0, -8, 3, 1.5, 2], // south
          [8, 0, 2, 1.5, 3], // east:  2w × 1.5h × 3d
          [-8, 0, 2, 1.5, 3], // west
        ] as [number, number, number, number, number][]
      ).map(([cx, cz, w, h, d], i) => (
        <mesh
          key={`cover-${i}`}
          position={[cx, h / 2, cz]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color="#556677"
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>
      ))}
    </>
  );
};

export default Environment;
