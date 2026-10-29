import * as THREE from "three";

export interface AlienParts {
  group: THREE.Group;
  head: THREE.Mesh;
  body: THREE.Mesh;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  hat: THREE.Mesh;
  coat: THREE.Mesh;
  antennaL: THREE.Mesh;
  antennaR: THREE.Mesh;
  materials: THREE.MeshStandardMaterial[];
}

export interface HumanParts {
  group: THREE.Group;
  head: THREE.Mesh;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  scanner?: THREE.Mesh; // agents only
  materials: THREE.MeshStandardMaterial[];
}

const SKIN = 0x59c9a5;

function mat(color: number, emissive = 0x000000, ei = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: ei,
    roughness: 0.8,
  });
}

/** The Alien: big head, big dark eyes, small teal body, hoodie + disguise. */
export function createAlien(): AlienParts {
  const g = new THREE.Group();
  const materials: THREE.MeshStandardMaterial[] = [];

  const skin = mat(SKIN);
  const hoodie = mat(0xe88d3c);
  const dark = mat(0x0a0a0f);
  const pants = mat(0x3a3a4a);
  materials.push(skin, hoodie, dark, pants);

  // Body (hoodie).
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.5, 6, 12), hoodie);
  body.position.y = 0.85;
  body.castShadow = true;
  g.add(body);

  // Big head.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 14), skin);
  head.position.y = 1.62;
  head.scale.set(1, 0.92, 0.95);
  head.castShadow = true;
  g.add(head);

  // Big dark eyes + glints.
  const eyeGeo = new THREE.SphereGeometry(0.13, 10, 8);
  const eyeL = new THREE.Mesh(eyeGeo, dark);
  eyeL.position.set(-0.17, 1.68, 0.36);
  eyeL.scale.set(1, 1.5, 0.6);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.17;
  const glintMat = mat(0xffffff);
  materials.push(glintMat);
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), glintMat);
  glint.position.set(-0.13, 1.74, 0.46);
  const glint2 = glint.clone();
  glint2.position.x = 0.21;
  g.add(eyeL, eyeR, glint, glint2);

  // Antennae.
  const antGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.3, 5);
  const antennaL = new THREE.Mesh(antGeo, skin);
  antennaL.position.set(-0.14, 2.12, 0);
  antennaL.rotation.z = 0.4;
  const antennaR = new THREE.Mesh(antGeo, skin);
  antennaR.position.set(0.14, 2.12, 0);
  antennaR.rotation.z = -0.4;
  const bob = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshStandardMaterial({
      color: 0x58e86b,
      emissive: 0x58e86b,
      emissiveIntensity: 1.2,
    }),
  );
  bob.position.y = 0.17;
  antennaL.add(bob);
  const bob2 = bob.clone();
  antennaR.add(bob2);
  g.add(antennaL, antennaR);

  // Arms & legs.
  const armGeo = new THREE.CapsuleGeometry(0.09, 0.42, 4, 8);
  const armL = new THREE.Mesh(armGeo, hoodie);
  armL.position.set(-0.42, 0.95, 0);
  const armR = new THREE.Mesh(armGeo, hoodie);
  armR.position.set(0.42, 0.95, 0);
  // Pivot at shoulder.
  armL.geometry.translate(0, -0.21, 0);
  armR.geometry.translate(0, -0.21, 0);
  const legGeo = new THREE.CapsuleGeometry(0.11, 0.4, 4, 8);
  legGeo.translate(0, -0.28, 0);
  const legL = new THREE.Mesh(legGeo, pants);
  legL.position.set(-0.16, 0.62, 0);
  const legR = new THREE.Mesh(legGeo, pants);
  legR.position.set(0.16, 0.62, 0);
  g.add(armL, armR, legL, legR);

  // --- Human disguise (hidden by default): hat + oversized coat. ---
  const hat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.34, 14),
    mat(0x6b5b3a),
  );
  hat.position.y = 1.95;
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.72, 0.05, 14),
    mat(0x5a4a2e),
  );
  brim.position.y = 1.8;
  hat.add(brim);
  const coat = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.44, 0.85, 6, 12),
    mat(0x6b5b8e),
  );
  coat.position.y = 0.78;
  coat.castShadow = true;
  hat.visible = false;
  coat.visible = false;
  materials.push((hat.material as THREE.MeshStandardMaterial), (coat.material as THREE.MeshStandardMaterial));
  g.add(hat, coat);

  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      const m = o.material as THREE.MeshStandardMaterial;
      if (!materials.includes(m)) materials.push(m);
    }
  });

  return {
    group: g, head, body, armL, armR, legL, legR,
    hat, coat, antennaL, antennaR, materials,
  };
}

export interface HumanSpec {
  shirt: number;
  isAgent?: boolean;
}

/** Human NPC or capture agent. */
export function createHuman(spec: HumanSpec): HumanParts {
  const g = new THREE.Group();
  const materials: THREE.MeshStandardMaterial[] = [];
  const shirt = spec.isAgent ? mat(0x1c2733) : mat(spec.shirt);
  const pants = mat(spec.isAgent ? 0x10161f : 0x33383f);
  const skin = mat(0xe8b48c);
  materials.push(shirt, pants, skin);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.55, 6, 12), shirt);
  body.position.y = 0.92;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), skin);
  head.position.y = 1.62;
  head.castShadow = true;

  const armGeo = new THREE.CapsuleGeometry(0.08, 0.42, 4, 8);
  armGeo.translate(0, -0.21, 0);
  const armL = new THREE.Mesh(armGeo, shirt);
  armL.position.set(-0.38, 1.05, 0);
  const armR = new THREE.Mesh(armGeo, shirt);
  armR.position.set(0.38, 1.05, 0);
  const legGeo = new THREE.CapsuleGeometry(0.1, 0.42, 4, 8);
  legGeo.translate(0, -0.28, 0);
  const legL = new THREE.Mesh(legGeo, pants);
  legL.position.set(-0.14, 0.62, 0);
  const legR = new THREE.Mesh(legGeo, pants);
  legR.position.set(0.14, 0.62, 0);
  g.add(body, head, armL, armR, legL, legR);

  let scanner: THREE.Mesh | undefined;
  if (spec.isAgent) {
    // Cap with visor.
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.3, 0.16, 12),
      mat(0x0c1219),
    );
    cap.position.y = 1.82;
    g.add(cap);
    // Glowing visor.
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.1, 0.06),
      new THREE.MeshStandardMaterial({
        color: 0x57e8ff,
        emissive: 0x57e8ff,
        emissiveIntensity: 1.6,
      }),
    );
    visor.position.set(0, 1.64, 0.24);
    g.add(visor);
    materials.push(cap.material as THREE.MeshStandardMaterial, visor.material as THREE.MeshStandardMaterial);
    // Scanning device (glowing cone forward).
    scanner = new THREE.Mesh(
      new THREE.ConeGeometry(1.9, 7.5, 4, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x57e8ff,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    scanner.rotation.x = Math.PI / 2;
    scanner.position.set(0, 1.3, 3.9);
    g.add(scanner);
  }

  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });

  return { group: g, head, armL, armR, legL, legR, scanner, materials };
}

/** Procedural walk/idle animation for any humanoid. */
export function animateHumanoid(
  parts: { armL: THREE.Mesh; armR: THREE.Mesh; legL: THREE.Mesh; legR: THREE.Mesh; head: THREE.Mesh },
  group: THREE.Group,
  t: number,
  speed01: number, // 0 idle .. 1 run
  carrying = false,
): void {
  const phase = t * (5 + 6 * speed01);
  const swing = Math.sin(phase) * (0.25 + 0.55 * speed01);
  if (carrying) {
    parts.armL.rotation.x = -0.95;
    parts.armR.rotation.x = -0.95;
  } else {
    parts.armL.rotation.x = swing;
    parts.armR.rotation.x = -swing;
  }
  parts.legL.rotation.x = -swing * 1.1;
  parts.legR.rotation.x = swing * 1.1;
  // Idle head sway + walk bob.
  parts.head.rotation.y = Math.sin(t * 0.8) * 0.12 * (1 - speed01);
  group.position.y = Math.abs(Math.sin(phase)) * 0.055 * speed01;
}
