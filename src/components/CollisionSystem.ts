import * as THREE from "three";

export class CollisionSystem {
  private boundaries: THREE.Box3[];
  private playerRadius: number;

  constructor() {
    this.boundaries = [];
    this.playerRadius = 0.25; // Half the width of the player box
    this.initializeBoundaries();
  }

  private initializeBoundaries() {
    // Create world boundaries (invisible walls)
    const worldSize = 50;

    // North boundary
    this.boundaries.push(
      new THREE.Box3(
        new THREE.Vector3(-worldSize, -10, worldSize),
        new THREE.Vector3(worldSize, 10, worldSize + 1)
      )
    );

    // South boundary
    this.boundaries.push(
      new THREE.Box3(
        new THREE.Vector3(-worldSize, -10, -worldSize - 1),
        new THREE.Vector3(worldSize, 10, -worldSize)
      )
    );

    // East boundary
    this.boundaries.push(
      new THREE.Box3(
        new THREE.Vector3(worldSize, -10, -worldSize),
        new THREE.Vector3(worldSize + 1, 10, worldSize)
      )
    );

    // West boundary
    this.boundaries.push(
      new THREE.Box3(
        new THREE.Vector3(-worldSize - 1, -10, -worldSize),
        new THREE.Vector3(-worldSize, 10, worldSize)
      )
    );

    // Add corner obstacles and moon rocks to match visible geometry
    this.boundaries.push(
      new THREE.Box3(new THREE.Vector3(15, 0, 15), new THREE.Vector3(20, 3, 20))
    );

    this.boundaries.push(
      new THREE.Box3(
        new THREE.Vector3(-20, 0, -20),
        new THREE.Vector3(-15, 3, -15)
      )
    );

    this.boundaries.push(
      new THREE.Box3(
        new THREE.Vector3(15, 0, -20),
        new THREE.Vector3(20, 3, -15)
      )
    );

    this.boundaries.push(
      new THREE.Box3(
        new THREE.Vector3(-20, 0, 15),
        new THREE.Vector3(-15, 3, 20)
      )
    );

    // Moon rocks - spherical obstacles (approximated as boxes)
    // Rock at [5, 0.8, 5] - radius 1.5
    this.boundaries.push(
      new THREE.Box3(
        new THREE.Vector3(3.5, 0, 3.5),
        new THREE.Vector3(6.5, 2, 6.5)
      )
    );
    // Rock at [-8, 0.6, 10] - radius 1.2
    this.boundaries.push(
      new THREE.Box3(
        new THREE.Vector3(-9.2, 0, 8.8),
        new THREE.Vector3(-6.8, 1.8, 11.2)
      )
    );
    // Rock at [12, 0.5, -5] - radius 1.0
    this.boundaries.push(
      new THREE.Box3(
        new THREE.Vector3(11, 0, -6),
        new THREE.Vector3(13, 1.5, -4)
      )
    );
    // Rock at [-15, 0.9, -8] - radius 1.6
    this.boundaries.push(
      new THREE.Box3(
        new THREE.Vector3(-16.6, 0, -9.6),
        new THREE.Vector3(-13.4, 2.2, -6.4)
      )
    );
    // Rock at [3, 0.7, -12] - radius 1.3
    this.boundaries.push(
      new THREE.Box3(
        new THREE.Vector3(1.7, 0, -13.3),
        new THREE.Vector3(4.3, 2, -10.7)
      )
    );
    // Rock at [-3, 0.4, 15] - radius 0.8
    this.boundaries.push(
      new THREE.Box3(
        new THREE.Vector3(-3.8, 0, 14.2),
        new THREE.Vector3(-2.2, 1.2, 15.8)
      )
    );
  }

  checkCollision(
    currentPosition: THREE.Vector3,
    newPosition: THREE.Vector3
  ): THREE.Vector3 {
    const playerBox = new THREE.Box3(
      new THREE.Vector3(
        newPosition.x - this.playerRadius,
        newPosition.y - 0.5,
        newPosition.z - this.playerRadius
      ),
      new THREE.Vector3(
        newPosition.x + this.playerRadius,
        newPosition.y + 0.5,
        newPosition.z + this.playerRadius
      )
    );

    // Check collision with all boundaries
    for (const boundary of this.boundaries) {
      if (playerBox.intersectsBox(boundary)) {
        // If player is above the rock (jumping/jetpacking over it), allow movement
        const playerBottomY = newPosition.y - 0.5;
        const boundaryTopY = boundary.max.y;

        if (playerBottomY > boundaryTopY + 0.2) {
          // Player is clearly above the obstacle, allow movement
          continue;
        }

        // Collision detected, calculate the best position to move to
        return this.resolveCollision(currentPosition, newPosition, boundary);
      }
    }

    return newPosition; // No collision
  }

  private resolveCollision(
    currentPos: THREE.Vector3,
    newPos: THREE.Vector3,
    boundary: THREE.Box3
  ): THREE.Vector3 {
    const resolved = currentPos.clone();

    // Try moving only in X direction
    const testX = new THREE.Vector3(newPos.x, currentPos.y, currentPos.z);
    const testBoxX = new THREE.Box3(
      new THREE.Vector3(
        testX.x - this.playerRadius,
        testX.y - 0.5,
        testX.z - this.playerRadius
      ),
      new THREE.Vector3(
        testX.x + this.playerRadius,
        testX.y + 0.5,
        testX.z + this.playerRadius
      )
    );

    if (!testBoxX.intersectsBox(boundary)) {
      resolved.x = newPos.x;
    }

    // Try moving only in Z direction
    const testZ = new THREE.Vector3(currentPos.x, currentPos.y, newPos.z);
    const testBoxZ = new THREE.Box3(
      new THREE.Vector3(
        testZ.x - this.playerRadius,
        testZ.y - 0.5,
        testZ.z - this.playerRadius
      ),
      new THREE.Vector3(
        testZ.x + this.playerRadius,
        testZ.y + 0.5,
        testZ.z + this.playerRadius
      )
    );

    if (!testBoxZ.intersectsBox(boundary)) {
      resolved.z = newPos.z;
    }

    return resolved;
  }

  checkPlayerCollision(
    player1Pos: THREE.Vector3,
    player2Pos: THREE.Vector3
  ): boolean {
    const distance = player1Pos.distanceTo(player2Pos);
    return distance < this.playerRadius * 2 + 0.1; // Small buffer
  }

  // Get boundary geometry for rendering (optional, for debugging)
  getBoundaryGeometry(): THREE.BufferGeometry[] {
    return this.boundaries.map((boundary) => {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      boundary.getSize(size);
      boundary.getCenter(center);

      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      geometry.translate(center.x, center.y, center.z);
      return geometry;
    });
  }
}

export default CollisionSystem;
