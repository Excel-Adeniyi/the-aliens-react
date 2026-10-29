import * as THREE from "three";

export interface Collider {
  box: THREE.Box3;
  removable?: boolean; // crates/baskets that get picked up
}

export interface WorldRefs {
  colliders: Collider[];
  lamppost: THREE.Group;
  lamppostBulb: THREE.Mesh;
  crate: THREE.Group;
  basket: THREE.Group;
  safehouseWindow: THREE.Mesh;
  shopWindow: THREE.Mesh;
}

function boxMesh(
  w: number,
  h: number,
  d: number,
  color: number,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
  );
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function addCollider(
  colliders: Collider[],
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  removable = false,
): Collider {
  const box = new THREE.Box3(
    new THREE.Vector3(x - w / 2, 0, z - d / 2),
    new THREE.Vector3(x + w / 2, h, z + d / 2),
  );
  const c: Collider = { box, removable };
  colliders.push(c);
  return c;
}

function makeHouse(
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  wall: number,
  roof: number,
  rotY = 0,
): THREE.Group {
  const g = new THREE.Group();
  const body = boxMesh(w, h, d, wall, 0, 0, 0);
  g.add(body);
  const roofMesh = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.55, 4),
    new THREE.MeshStandardMaterial({ color: roof, roughness: 0.8 }),
  );
  roofMesh.position.y = h + h * 0.27;
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.castShadow = true;
  g.add(roofMesh);
  // Glowing windows (sunset vibe).
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xffd27f,
    emissive: 0xffb347,
    emissiveIntensity: 0.9,
  });
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.12), winMat);
  win.position.set(-w * 0.22, h * 0.5, d / 2 + 0.02);
  g.add(win);
  const door = boxMesh(1.0, 1.8, 0.14, 0x5a3a2a, w * 0.22, 0, d / 2);
  g.add(door);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

function makeTree(x: number, z: number, s = 1): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 2.2 * s, 7),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 }),
  );
  trunk.position.y = 1.1 * s;
  trunk.castShadow = true;
  g.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4e7a3a, roughness: 1 });
  const f1 = new THREE.Mesh(new THREE.SphereGeometry(1.5 * s, 10, 8), leafMat);
  f1.position.y = 2.9 * s;
  f1.castShadow = true;
  const f2 = new THREE.Mesh(
    new THREE.SphereGeometry(1.05 * s, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x5d8f46, roughness: 1 }),
  );
  f2.position.set(0.7 * s, 3.6 * s, 0.3 * s);
  f2.castShadow = true;
  g.add(f1, f2);
  g.position.set(x, 0, z);
  return g;
}

function makeStreetlamp(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 3.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 0.6 }),
  );
  pole.position.y = 1.7;
  pole.castShadow = true;
  g.add(pole);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xfff3c9,
      emissive: 0xffc46b,
      emissiveIntensity: 1.2,
    }),
  );
  bulb.position.y = 3.5;
  g.add(bulb);
  g.position.set(x, 0, z);
  return g;
}

function makeBench(x: number, z: number, rotY = 0): THREE.Group {
  const g = new THREE.Group();
  const seat = boxMesh(2.0, 0.14, 0.6, 0x8a5a34);
  seat.position.y = 0.45;
  const back = boxMesh(2.0, 0.55, 0.1, 0x8a5a34, 0, 0.45, -0.26);
  const leg1 = boxMesh(0.12, 0.45, 0.5, 0x3a3a3a, -0.85, 0, 0);
  const leg2 = boxMesh(0.12, 0.45, 0.5, 0x3a3a3a, 0.85, 0, 0);
  g.add(seat, back, leg1, leg2);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

function makeBin(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.36, 1.0, 10),
    new THREE.MeshStandardMaterial({ color: 0x4a6a52, roughness: 0.7 }),
  );
  body.position.y = 0.5;
  body.castShadow = true;
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x35503e }),
  );
  lid.position.y = 1.05;
  g.add(body, lid);
  g.position.set(x, 0, z);
  return g;
}

function makeCar(x: number, z: number, rotY: number, color: number): THREE.Group {
  const g = new THREE.Group();
  const body = boxMesh(3.6, 0.85, 1.7, color);
  body.position.y = 0.5;
  const cabin = boxMesh(2.0, 0.7, 1.5, 0x9fd8e8, -0.2, 1.3, 0);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  for (const [wx, wz] of [
    [-1.2, 0.85],
    [1.2, 0.85],
    [-1.2, -0.85],
    [1.2, -0.85],
  ]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12),
      wheelMat,
    );
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.32, wz);
    g.add(wheel);
  }
  g.add(body, cabin);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

function makeFountain(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.9, 0.7, 18),
    new THREE.MeshStandardMaterial({ color: 0xb8b3a8, roughness: 0.9 }),
  );
  base.position.y = 0.35;
  base.castShadow = true;
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.45, 0.15, 18),
    new THREE.MeshStandardMaterial({
      color: 0x6fc7e8,
      emissive: 0x3a8fb0,
      emissiveIntensity: 0.4,
    }),
  );
  water.position.y = 0.72;
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.2, 1.1, 8),
    new THREE.MeshStandardMaterial({ color: 0xb8b3a8 }),
  );
  spout.position.y = 1.2;
  g.add(base, water, spout);
  g.position.set(x, 0, z);
  return g;
}

export function buildWorld(scene: THREE.Scene): WorldRefs {
  // Ground.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ color: 0x86a15f, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Roads (cross through town square).
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x63666e, roughness: 1 });
  const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(5, 80), roadMat);
  roadNS.rotation.x = -Math.PI / 2;
  roadNS.position.set(0, 0.02, 0);
  roadNS.receiveShadow = true;
  const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(80, 5), roadMat);
  roadEW.rotation.x = -Math.PI / 2;
  roadEW.position.set(0, 0.02, 0);
  roadEW.receiveShadow = true;
  scene.add(roadNS, roadEW);

  const colliders: Collider[] = [];

  // --- Shop (east) ---
  const shop = makeHouse(13, -2, 9, 6, 4.2, 0xe2725b, 0x8a3a2a, Math.PI / 2);
  scene.add(shop);
  addCollider(colliders, 13, -2, 6, 9, 4.2);
  const shopWindowMat = new THREE.MeshStandardMaterial({
    color: 0xfff2d0,
    emissive: 0xffc46b,
    emissiveIntensity: 0.7,
  });
  const shopWindow = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 1.6, 2.6),
    shopWindowMat,
  );
  shopWindow.position.set(8.45, 1.6, -2);
  scene.add(shopWindow);

  // --- Residential houses (north street) ---
  scene.add(makeHouse(-11, -16, 6, 5, 3.4, 0x5b8ea6, 0x2e4a5e));
  addCollider(colliders, -11, -16, 6, 5, 3.4);
  scene.add(makeHouse(0, -17, 6, 5, 3.8, 0xf4a259, 0x8a5a34));
  addCollider(colliders, 0, -17, 6, 5, 3.8);
  scene.add(makeHouse(11, -16, 6, 5, 3.4, 0xd9d0c0, 0x6b4a2f)); // Granny
  addCollider(colliders, 11, -16, 6, 5, 3.4);

  // --- Safehouse (south) ---
  scene.add(makeHouse(0, 15, 6, 5, 3.4, 0x8ab87a, 0x2e4a5e));
  addCollider(colliders, 0, 15, 6, 5, 3.4);
  const safehouseWindow = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.9, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x9fffc9,
      emissive: 0x58e86b,
      emissiveIntensity: 1.4,
    }),
  );
  safehouseWindow.position.set(1.6, 1.6, 12.52);
  scene.add(safehouseWindow);

  // --- Park (west) ---
  const treeSpots: Array<[number, number, number]> = [
    [-16, 6, 1.1], [-19, -2, 1.3], [-15, -8, 1.0],
    [-9, -9, 1.15], [4, -6, 1.0], [-4, 8, 1.0], [6, 8, 1.1],
  ];
  for (const [tx, tz, ts] of treeSpots) {
    scene.add(makeTree(tx, tz, ts));
    addCollider(colliders, tx, tz, 0.9, 0.9, 2.4);
  }

  // Benches & bins.
  scene.add(makeBench(-10.5, 2.5, Math.PI / 2));
  addCollider(colliders, -10.5, 2.5, 0.7, 2.0, 1.0);
  scene.add(makeBench(2.8, 3.2, 0));
  addCollider(colliders, 2.8, 3.2, 2.0, 0.7, 1.0);
  scene.add(makeBin(4.2, -3.2));
  addCollider(colliders, 4.2, -3.2, 0.8, 0.8, 1.1);
  scene.add(makeBin(12.5, 2.5));
  addCollider(colliders, 12.5, 2.5, 0.8, 0.8, 1.1);

  // Fountain in the square.
  scene.add(makeFountain(0, 1));
  addCollider(colliders, 0, 1, 3.8, 3.8, 1.5);

  // Streetlamps.
  scene.add(makeStreetlamp(4, 6.5));
  scene.add(makeStreetlamp(-4, -6.5));
  scene.add(makeStreetlamp(6, -9));

  // Parked cars along the north street.
  scene.add(makeCar(-5.5, -10.6, 0, 0xc94f4f));
  addCollider(colliders, -5.5, -10.6, 3.8, 1.9, 1.6);
  scene.add(makeCar(5, -10.6, 0, 0x4f7fc9));
  addCollider(colliders, 5, -10.6, 3.8, 1.9, 1.6);

  // Fences along front yards (decor, thin colliders).
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xb8a888 });
  for (let i = -13; i <= 13; i += 1.2) {
    if (i > -2.5 && i < 2.5) continue; // gaps for paths
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), fenceMat);
    p.position.set(i, 0.4, -11.8);
    scene.add(p);
  }

  // --- Mission props ---
  // Stock crate behind the shop.
  const crate = new THREE.Group();
  const crateBox = boxMesh(1.0, 1.0, 1.0, 0xb8894a);
  crate.add(crateBox);
  crate.position.set(18, 0, -6);
  scene.add(crate);
  const crateCollider = addCollider(colliders, 18, -6, 1.2, 1.2, 1.0, true);

  // Broken lamppost in the park.
  const lamppost = makeStreetlamp(-14, -1);
  const lamppostBulb = lamppost.children[1] as THREE.Mesh;
  (lamppostBulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
  (lamppostBulb.material as THREE.MeshStandardMaterial).color.set(0x555555);
  lamppost.rotation.z = 0.28; // tilted, broken
  scene.add(lamppost);

  // Granny's grocery basket near the fountain.
  const basket = new THREE.Group();
  const basketBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.4, 0.45, 10),
    new THREE.MeshStandardMaterial({ color: 0xc9a05a, roughness: 1 }),
  );
  basketBody.position.y = 0.22;
  basketBody.castShadow = true;
  basket.add(basketBody);
  for (let i = 0; i < 4; i++) {
    const fruit = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 6),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0xd94f4f : 0x8ab87a }),
    );
    const a = (i / 4) * Math.PI * 2;
    fruit.position.set(Math.cos(a) * 0.22, 0.5, Math.sin(a) * 0.22);
    basket.add(fruit);
  }
  basket.position.set(2.2, 0, 5.2);
  scene.add(basket);
  addCollider(colliders, 2.2, 5.2, 1.0, 1.0, 0.6, true);

  return {
    colliders,
    lamppost,
    lamppostBulb,
    crate,
    basket,
    safehouseWindow,
    shopWindow,
  };
}

export function removeCollider(colliders: Collider[], c: Collider): void {
  const i = colliders.indexOf(c);
  if (i >= 0) colliders.splice(i, 1);
}
export { addCollider };
