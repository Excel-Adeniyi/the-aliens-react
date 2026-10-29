import * as THREE from "three";

import { music, sfx } from "./audio";
import {
  AlienParts,
  HumanParts,
  animateHumanoid,
  createAlien,
  createHuman,
} from "./characters";
import { allMissionsDone, missions, missionCompleteText, objectiveText, renderMissions } from "./missions";
import { Collider, WorldRefs, buildWorld, removeCollider } from "./world";
import {
  el,
  setAbilityStates,
  setHudVisible,
  setPrompt,
  setSuspicion,
  showToast,
} from "./ui";

type GameState = "title" | "playing" | "paused" | "won" | "lost";

interface Agent {
  parts: HumanParts;
  pos: THREE.Vector3;
  facing: number;
  waypoints: THREE.Vector3[];
  wpIndex: number;
  state: "patrol" | "suspicious" | "chase" | "stunned";
  awareness: number;
  lastSeen: THREE.Vector3;
  lastSeenTime: number;
  stunUntil: number;
  scanBase: number;
}

interface Npc {
  parts: HumanParts;
  pos: THREE.Vector3;
  facing: number;
  anchor: THREE.Vector3;
  target: THREE.Vector3;
  idleUntil: number;
}

interface PulseFx {
  ring: THREE.Mesh;
  life: number;
}

const KEYMAP: Record<string, string> = {
  KeyW: "fwd", ArrowUp: "fwd",
  KeyS: "back", ArrowDown: "back",
  KeyA: "left", ArrowLeft: "left",
  KeyD: "right", ArrowRight: "right",
  ShiftLeft: "sprint", ShiftRight: "sprint",
  Space: "jump",
};

export class Game {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  private state: GameState = "title";
  private keys: Record<string, boolean> = {};
  private yaw = 0;
  private pitch = 0.42;

  private world!: WorldRefs;
  private colliders: Collider[] = [];
  private crateCollider!: Collider;
  private basketCollider!: Collider;

  private alien!: AlienParts;
  private playerPos = new THREE.Vector3(0, 0, 20);
  private playerVel = new THREE.Vector3();
  private playerFacing = Math.PI;
  private carrying: "crate" | "basket" | null = null;

  private agents: Agent[] = [];
  private npcs: Npc[] = [];
  private pulses: PulseFx[] = [];

  private suspicion = 0;
  private disguiseOn = false;
  private camoActive = false;
  private camoTicksLeft = 0;
  private pulseCooldown = 0;
  private camoCooldown = 0;
  private time = 0;

  private camoSaved: Array<[THREE.MeshStandardMaterial, number, boolean]> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );

    this.setupScene();
    this.bindEvents();
    this.loop();
  }

  // ---------------------------------------------------------------------
  // Setup.
  // ---------------------------------------------------------------------

  private setupScene(): void {
    this.scene.background = new THREE.Color(0xffd9a3);
    this.scene.fog = new THREE.Fog(0xf2a65e, 34, 95);

    // Sunset lighting.
    const hemi = new THREE.HemisphereLight(0xffd9a3, 0x6b7f4e, 0.95);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffb36b, 2.1);
    sun.position.set(-24, 15, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -38;
    sun.shadow.camera.right = 38;
    sun.shadow.camera.top = 38;
    sun.shadow.camera.bottom = -38;
    sun.shadow.camera.far = 90;
    this.scene.add(sun);

    this.world = buildWorld(this.scene);
    this.colliders = this.world.colliders;
    this.crateCollider = this.colliders.find((c) => c.removable && this.world.crate.position.distanceTo(c.box.getCenter(new THREE.Vector3())) < 3) ?? this.colliders[0];
    this.basketCollider = this.colliders.find((c) => c.removable && c !== this.crateCollider) ?? this.colliders[0];

    // Alien player.
    this.alien = createAlien();
    this.alien.group.position.copy(this.playerPos);
    this.scene.add(this.alien.group);

    // NPCs.
    const npcSpecs: Array<[number, number, number]> = [
      [8, 1, 0xf4a259], [-3, 5, 0x5b8ea6], [6, -6, 0xd94f4f],
      [-8, -4, 0x8ab87a], [11, 8, 0x9a6fb8], [-13, 1, 0x4a9a8a],
      [2, -8, 0xc97b4a],
    ];
    for (const [x, z, color] of npcSpecs) {
      const parts = createHuman({ shirt: color });
      parts.group.position.set(x, 0, z);
      this.scene.add(parts.group);
      this.npcs.push({
        parts,
        pos: new THREE.Vector3(x, 0, z),
        facing: this.randomFacing(),
        anchor: new THREE.Vector3(x, 0, z),
        target: new THREE.Vector3(x, 0, z),
        idleUntil: 0,
      });
    }

    // Capture agents.
    const routeA = [
      new THREE.Vector3(9, 0, 6), new THREE.Vector3(9, 0, -9),
      new THREE.Vector3(-4, 0, -9), new THREE.Vector3(-4, 0, 6),
    ];
    const routeB = [
      new THREE.Vector3(-11, 0, 3), new THREE.Vector3(-16, 0, -3),
      new THREE.Vector3(-8, 0, -11), new THREE.Vector3(6, 0, -11),
      new THREE.Vector3(6, 0, 3),
    ];
    for (const route of [routeA, routeB]) {
      const parts = createHuman({ shirt: 0, isAgent: true });
      parts.group.position.copy(route[0]);
      this.scene.add(parts.group);
      this.agents.push({
        parts,
        pos: route[0].clone(),
        facing: 0,
        waypoints: route,
        wpIndex: 1,
        state: "patrol",
        awareness: 0,
        lastSeen: new THREE.Vector3(),
        lastSeenTime: -99,
        stunUntil: 0,
        scanBase: 0,
      });
    }

    renderMissions(el.missionList);
  }

  private randomFacing(): number {
    return this.random01() * Math.PI * 2;
  }

  private random01(): number {
    return Math.random();
  }

  // ---------------------------------------------------------------------
  // Events.
  // ---------------------------------------------------------------------

  private bindEvents(): void {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener("keydown", (e) => {
      if (e.code === "Escape") {
        if (this.state === "playing") this.pause();
        return;
      }
      const k = KEYMAP[e.code];
      if (k) {
        this.keys[k] = true;
        if (k === "jump") e.preventDefault();
      }
      if (this.state !== "playing") return;
      if (e.code === "KeyE") this.interact();
      if (e.code === "KeyQ") this.toggleDisguise();
      if (e.code === "KeyF") this.usePulse();
      if (e.code === "KeyC") this.toggleCamo();
    });
    document.addEventListener("keyup", (e) => {
      const k = KEYMAP[e.code];
      if (k) this.keys[k] = false;
    });

    document.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement !== this.renderer.domElement) return;
      this.yaw -= e.movementX * 0.0026;
      this.pitch = Math.max(
        0.08,
        Math.min(1.15, this.pitch + e.movementY * 0.0022),
      );
    });

    document.addEventListener("pointerlockchange", () => {
      if (
        document.pointerLockElement !== this.renderer.domElement &&
        this.state === "playing"
      ) {
        this.pause();
      }
    });
  }

  // ---------------------------------------------------------------------
  // Public state API.
  // ---------------------------------------------------------------------

  start(): void {
    this.state = "playing";
    el.titleScreen.classList.add("hidden");
    setHudVisible(true);
    music.start(); // 🎃 Looping Halloween track (user gesture = allowed)
    showToast(
      "Rule #1 of blending in: act natural. Rule #2: waving is friendly. Extra arms are not.",
      5000,
    );
    void this.renderer.domElement.requestPointerLock();
  }

  pause(): void {
    if (this.state !== "playing") return;
    this.state = "paused";
    document.exitPointerLock();
    el.pauseScreen.classList.remove("hidden");
  }

  resume(): void {
    if (this.state !== "paused") return;
    this.state = "playing";
    el.pauseScreen.classList.add("hidden");
    void this.renderer.domElement.requestPointerLock();
  }

  showControls(): void {
    el.pauseScreen.classList.add("hidden");
    showToast(
      "WASD move · Shift sprint · Space jump · E interact · Q disguise · F pulse · C camo · Esc pause",
      6000,
    );
    el.pauseScreen.classList.remove("hidden");
  }

  restart(): void {
    this.reset();
    el.winScreen.classList.add("hidden");
    el.lossScreen.classList.add("hidden");
    el.pauseScreen.classList.add("hidden");
    this.state = "playing";
    setHudVisible(true);
    void this.renderer.domElement.requestPointerLock();
  }

  private win(): void {
    this.state = "won";
    document.exitPointerLock();
    sfx.win();
    el.winScreen.classList.remove("hidden");
  }

  private lose(): void {
    this.state = "lost";
    document.exitPointerLock();
    sfx.caught();
    el.lossScreen.classList.remove("hidden");
  }

  private reset(): void {
    this.playerPos.set(0, 0, 20);
    this.playerVel.set(0, 0, 0);
    this.playerFacing = Math.PI;
    this.yaw = 0;
    this.suspicion = 0;
    this.disguiseOn = false;
    this.camoActive = false;
    this.camoTicksLeft = 0;
    this.pulseCooldown = 0;
    this.camoCooldown = 0;
    this.carrying = null;
    this.heartsReset();
    this.alien.hat.visible = false;
    this.alien.coat.visible = false;
    this.restoreCamo();

    // World props back to original spots.
    this.world.crate.position.set(18, 0, -6);
    this.world.crate.visible = true;
    this.world.basket.position.set(2.2, 0, 5.2);
    this.world.basket.visible = true;
    // Restore removable colliders.
    for (const c of [this.crateCollider, this.basketCollider]) {
      if (!this.colliders.includes(c)) this.colliders.push(c);
    }
    // Break the lamppost again.
    const bulbMat = this.world.lamppostBulb.material as THREE.MeshStandardMaterial;
    bulbMat.emissiveIntensity = 0;
    bulbMat.color.set(0x555555);
    this.world.lamppost.rotation.z = 0.28;

    for (const m of missions) {
      m.done = false;
      m.stage = 0;
    }
    renderMissions(el.missionList);

    this.agents.forEach((a, i) => {
      a.state = "patrol";
      a.awareness = 0;
      a.pos.copy(a.waypoints[0]);
      a.wpIndex = 1;
      a.stunUntil = 0;
      a.parts.group.position.copy(a.pos);
    });
    this.npcs.forEach((n) => {
      n.pos.copy(n.anchor);
      n.parts.group.position.copy(n.pos);
      n.idleUntil = 0;
    });

    for (const p of this.pulses) this.scene.remove(p.ring);
    this.pulses = [];
  }

  private heartsReset(): void {
    // Reserved for future health mechanics.
  }

  // ---------------------------------------------------------------------
  // Abilities.
  // ---------------------------------------------------------------------

  private toggleDisguise(): void {
    this.disguiseOn = !this.disguiseOn;
    this.alien.hat.visible = this.disguiseOn;
    this.alien.coat.visible = this.disguiseOn;
    sfx.disguise();
    if (this.disguiseOn) {
      this.checkAbilityWitnessed("flipped their collar into a disguise");
    }
  }

  private usePulse(): void {
    if (this.pulseCooldown > 0) return;
    this.pulseCooldown = 8;
    sfx.pulse();

    // Expanding teal rings.
    for (const [delay, maxR] of [[0, 6], [0.18, 4]] as const) {
      window.setTimeout(() => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.4, 0.06, 8, 40),
          new THREE.MeshBasicMaterial({
            color: 0x58e8c9,
            transparent: true,
            opacity: 0.9,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(this.playerPos.x, 0.4, this.playerPos.z);
        this.scene.add(ring);
        this.pulses.push({ ring, life: maxR });
      }, delay * 1000);
    }

    // Fix the lamppost (mission 2).
    if (!missions[1].done) {
      const d = this.playerPos.distanceTo(this.world.lamppost.position);
      if (d < 6) {
        missions[1].done = true;
        const bulbMat = this.world.lamppostBulb.material as THREE.MeshStandardMaterial;
        bulbMat.emissiveIntensity = 1.4;
        bulbMat.color.set(0xfff3c9);
        this.world.lamppost.rotation.z = 0;
        this.bumpMissionHud();
        showToast(missionCompleteText("m2"), 4200);
        sfx.deliver();
      }
    }

    // Stun nearby agents — but being seen using it is BAD.
    for (const a of this.agents) {
      const d = a.pos.distanceTo(this.playerPos);
      if (d < 6) {
        a.state = "stunned";
        a.stunUntil = this.time + 3.5;
      }
    }
    this.checkAbilityWitnessed("sent out a glowing alien pulse");
  }

  private toggleCamo(): void {
    if (this.camoCooldown > 0) return;
    if (this.camoActive) {
      this.restoreCamo();
      return;
    }
    this.camoActive = true;
    this.camoTicksLeft = 360; // ~6s at 60fps
    this.camoCooldown = 22;
    sfx.disguise();
    this.setAlienOpacity(0.22);
    showToast("You are basically a rumor now.", 2600);
    this.checkAbilityWitnessed("faded into thin air");
  }

  private setAlienOpacity(op: number): void {
    for (const m of this.alien.materials) {
      m.transparent = true;
      m.opacity = op;
    }
  }

  private restoreCamo(): void {
    this.camoActive = false;
    this.camoTicksLeft = 0;
    for (const m of this.alien.materials) {
      m.transparent = false;
      m.opacity = 1;
    }
  }

  /** Agents with line of sight see the alien using an ability. */
  private checkAbilityWitnessed(description: string): void {
    let seen = false;
    for (const a of this.agents) {
      if (a.state === "stunned") continue;
      if (this.agentSeesPlayer(a, true)) {
        a.awareness = Math.max(a.awareness, 0.85);
        a.lastSeen.copy(this.playerPos);
        a.lastSeenTime = this.time;
        seen = true;
      }
    }
    if (seen) {
      this.suspicion = Math.min(100, this.suspicion + 35);
      showToast(`An agent saw you ${description}! 👀`, 3000);
      sfx.spotted();
    }
  }

  // ---------------------------------------------------------------------
  // Interaction & missions.
  // ---------------------------------------------------------------------

  private interfaceCandidate(): { label: string; action: () => void } | null {
    const pp = this.playerPos;
    const near = (x: number, z: number, r = 2.3) =>
      Math.hypot(pp.x - x, pp.z - z) < r;

    // Crate pickup.
    if (!missions[0].done && missions[0].stage === 0 && !this.carrying && near(18, -6)) {
      return {
        label: "Pick up the stock crate",
        action: () => {
          missions[0].stage = 1;
          this.carrying = "crate";
          this.world.crate.visible = false;
          removeCollider(this.colliders, this.crateCollider);
          showToast("Oof. Earth gravity is rude.", 2600);
          sfx.pickup();
          this.bumpMissionHud();
        },
      };
    }
    // Crate delivery.
    if (missions[0].stage === 1 && this.carrying === "crate" && near(8.2, -2)) {
      return {
        label: "Stock the shelves",
        action: () => {
          missions[0].done = true;
          missions[0].stage = 2;
          this.carrying = null;
          showToast(missionCompleteText("m1"), 4200);
          sfx.deliver();
          this.bumpMissionHud();
        },
      };
    }
    // Basket pickup (unlocks after m1).
    if (missions[0].done && !missions[2].done && missions[2].stage === 0 && !this.carrying && near(2.2, 5.2)) {
      return {
        label: "Pick up Granny's groceries",
        action: () => {
          missions[2].stage = 1;
          this.carrying = "basket";
          this.world.basket.visible = false;
          removeCollider(this.colliders, this.basketCollider);
          showToast("Granny smells like cookies and wisdom.", 3000);
          sfx.pickup();
          this.bumpMissionHud();
        },
      };
    }
    // Basket delivery.
    if (missions[2].stage === 1 && this.carrying === "basket" && near(10, -11.6)) {
      return {
        label: "Deliver groceries to Granny",
        action: () => {
          missions[2].done = true;
          missions[2].stage = 2;
          this.carrying = null;
          showToast(missionCompleteText("m3"), 4200);
          sfx.deliver();
          this.bumpMissionHud();
        },
      };
    }
    // Safehouse.
    if (near(0, 11.6)) {
      if (allMissionsDone()) {
        return { label: "Rest at your safehouse 🛸", action: () => this.win() };
      }
      return {
        label: "Safehouse (finish your missions first)",
        action: () =>
          showToast("People still need your help out there.", 2600),
      };
    }
    return null;
  }

  private interact(): void {
    const c = this.interfaceCandidate();
    if (c) c.action();
  }

  private bumpMissionHud(): void {
    renderMissions(el.missionList);
    el.objective.textContent = objectiveText();
  }

  // ---------------------------------------------------------------------
  // Perception.
  // ---------------------------------------------------------------------

  private losBlocked(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const dir = to.clone().sub(from);
    const dist = dir.length();
    if (dist < 0.01) return false;
    dir.normalize();
    const ray = new THREE.Ray(from, dir);
    const hit = new THREE.Vector3();
    for (const c of this.colliders) {
      if (c.removable && !this.colliders.includes(c)) continue;
      if (ray.intersectBox(c.box, hit)) {
        if (hit.distanceTo(from) < dist - 0.4) return true;
      }
    }
    return false;
  }

  private agentSeesPlayer(a: Agent, ignoreDisguise = false): boolean {
    if (this.camoActive) return false;
    const eye = new THREE.Vector3(a.pos.x, 1.6, a.pos.z);
    const to = this.playerPos.clone().setY(1.2);
    const d = eye.distanceTo(to);
    const maxDist = this.disguiseOn && !ignoreDisguise ? 4.5 : 14;
    if (d > maxDist) return false;
    if (d > 2.2) {
      const fwd = new THREE.Vector3(Math.sin(a.facing), 0, Math.cos(a.facing));
      const dir = to.clone().sub(eye).normalize();
      if (fwd.dot(dir) < 0.68) return false;
    }
    return !this.losBlocked(eye, to);
  }

  // ---------------------------------------------------------------------
  // Update.
  // ---------------------------------------------------------------------

  private update(dtRaw: number): void {
    const dt = Math.min(dtRaw, 0.05);
    this.time += dt;

    if (this.state === "playing") {
      this.updatePlayer(dt);
      this.updateNpcs(dt);
      this.updateAgents(dt);
      this.updateSuspicion(dt);
      this.updateAbilities(dt);
      this.updateCarried();
      this.updateCamera(dt);
      this.updateHud();
    }
    this.updatePulses(dt);
  }

  private updatePlayer(dt: number): void {
    // Camera sits behind the player at (sin(yaw), cos(yaw)); forward is
    // the direction the camera looks (into the scene).
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).negate();
    // Camera-relative right vector (cross of forward and world up).
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);

    const dir = new THREE.Vector3();
    if (this.keys["fwd"]) dir.add(fwd);
    if (this.keys["back"]) dir.sub(fwd);
    if (this.keys["right"]) dir.add(right);
    if (this.keys["left"]) dir.sub(right);
    const moving = dir.lengthSq() > 0;
    if (moving) dir.normalize();

    const sprint = this.keys["sprint"] === true;
    const carryPenalty = this.carrying ? 0.72 : 1;
    const maxSpeed = (sprint ? 7.0 : 4.2) * carryPenalty;
    const accel = moving ? 30 : 20;
    this.playerVel.x += (dir.x * maxSpeed - this.playerVel.x) * Math.min(1, accel * dt / maxSpeed * 2);
    this.playerVel.z += (dir.z * maxSpeed - this.playerVel.z) * Math.min(1, accel * dt / maxSpeed * 2);
    if (!moving) {
      this.playerVel.multiplyScalar(Math.max(0, 1 - 12 * dt));
    }

    // Jump.
    if (this.keys["jump"] && this.playerPos.y <= 0.001) {
      this.playerVel.y = 6.4;
      this.keys["jump"] = false;
    }
    this.playerVel.y -= 18 * dt;
    this.playerPos.y += this.playerVel.y * dt;
    if (this.playerPos.y < 0) {
      this.playerPos.y = 0;
      this.playerVel.y = 0;
    }

    // Integrate + collide (XZ).
    this.playerPos.x += this.playerVel.x * dt;
    this.playerPos.z += this.playerVel.z * dt;
    this.collidePlayer();
    this.playerPos.x = Math.max(-32, Math.min(32, this.playerPos.x));
    this.playerPos.z = Math.max(-32, Math.min(32, this.playerPos.z));

    // Facing & animation.
    const speed2d = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (speed2d > 0.4) {
      const target = Math.atan2(this.playerVel.x, this.playerVel.z);
      let d = target - this.playerFacing;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.playerFacing += d * Math.min(1, 14 * dt);
    }
    this.alien.group.position.copy(this.playerPos);
    this.alien.group.rotation.y = this.playerFacing;
    animateHumanoid(this.alien, this.alien.group, this.time, Math.min(1, speed2d / 7), this.carrying !== null);
  }

  private collidePlayer(): void {
    const r = 0.4;
    const p = this.playerPos;
    for (const c of this.colliders) {
      if (c.removable && !this.colliders.includes(c)) continue;
      const b = c.box;
      if (p.y >= b.max.y - 0.05) continue; // above the box
      if (
        p.x > b.min.x - r && p.x < b.max.x + r &&
        p.z > b.min.z - r && p.z < b.max.z + r
      ) {
        // Push out along the smallest penetration.
        const dxL = p.x - (b.min.x - r);
        const dxR = (b.max.x + r) - p.x;
        const dzL = p.z - (b.min.z - r);
        const dzR = (b.max.z + r) - p.z;
        const min = Math.min(dxL, dxR, dzL, dzR);
        if (min === dxL) p.x = b.min.x - r;
        else if (min === dxR) p.x = b.max.x + r;
        else if (min === dzL) p.z = b.min.z - r;
        else p.z = b.max.z + r;
      }
    }
  }

  private updateNpcs(dt: number): void {
    for (const n of this.npcs) {
      const seesAlien =
        !this.disguiseOn &&
        !this.camoActive &&
        n.pos.distanceTo(this.playerPos) < 8 &&
        !this.losBlocked(new THREE.Vector3(n.pos.x, 1.5, n.pos.z), this.playerPos.clone().setY(1.2));

      if (seesAlien) {
        // Gossip: stare at the alien.
        n.facing = Math.atan2(
          this.playerPos.x - n.pos.x,
          this.playerPos.z - n.pos.z,
        );
        this.suspicion = Math.min(100, this.suspicion + 4 * dt);
        animateHumanoid(n.parts, n.parts.group, this.time, 0);
      } else {
        // Wander near anchor.
        if (n.pos.distanceTo(n.target) < 0.4) {
          if (this.time > n.idleUntil) {
            const a = this.random01() * Math.PI * 2;
            const r = this.random01() * 5;
            n.target.set(n.anchor.x + Math.cos(a) * r, 0, n.anchor.z + Math.sin(a) * r);
            n.idleUntil = this.time + 1.5 + this.random01() * 3;
          }
          animateHumanoid(n.parts, n.parts.group, this.time, 0);
        } else {
          const dir = n.target.clone().sub(n.pos).setY(0);
          if (dir.lengthSq() > 0.01) {
            dir.normalize();
            n.facing = Math.atan2(dir.x, dir.z);
            n.pos.addScaledVector(dir, 1.2 * dt);
            animateHumanoid(n.parts, n.parts.group, this.time, 0.4);
          }
        }
      }
      n.parts.group.position.set(n.pos.x, n.parts.group.position.y, n.pos.z);
      n.parts.group.rotation.y = n.facing;
      void dt;
    }
  }

  private updateAgents(dt: number): void {
    for (const a of this.agents) {
      // Stunned by pulse.
      if (a.state === "stunned") {
        if (this.time > a.stunUntil) {
          a.state = a.awareness > 0.5 ? "suspicious" : "patrol";
        } else {
          if (a.parts.scanner) {
            a.parts.scanner.visible = this.random01() > 0.4;
          }
          animateHumanoid(a.parts, a.parts.group, this.time, 0);
          continue;
        }
      }
      if (a.parts.scanner) a.parts.scanner.visible = true;

      const sees = this.agentSeesPlayer(a);

      if (sees) {
        a.lastSeen.copy(this.playerPos);
        a.lastSeenTime = this.time;
        if (!this.disguiseOn) {
          a.awareness = Math.min(1, a.awareness + dt * 1.5);
          const closeness = 1 - Math.min(1, a.pos.distanceTo(this.playerPos) / 14);
          this.suspicion = Math.min(100, this.suspicion + (4 + 12 * closeness) * dt);
        } else {
          // Close-range "that coat is weird" suspicion.
          if (a.pos.distanceTo(this.playerPos) < 4) {
            this.suspicion = Math.min(100, this.suspicion + 2.5 * dt);
            a.awareness = Math.min(1, a.awareness + dt * 0.4);
          }
        }
      } else {
        a.awareness = Math.max(0, a.awareness - 0.22 * dt);
      }

      switch (a.state) {
        case "patrol": {
          this.moveAlongWaypoints(a, 2.1, dt);
          if ((sees && a.awareness > 0.3 && this.suspicion > 35) || a.awareness > 0.55) {
            a.state = "suspicious";
            sfx.spotted();
          }
          break;
        }
        case "suspicious": {
          const target = sees ? this.playerPos : a.lastSeen;
          this.moveToward(a, target, 2.7, dt);
          if (sees) a.awareness = Math.min(1, a.awareness + dt * 1.8);
          if (a.awareness >= 0.85 || this.suspicion >= 80) {
            a.state = "chase";
          } else if (this.time - a.lastSeenTime > 4 && a.awareness < 0.3) {
            a.state = "patrol";
          }
          break;
        }
        case "chase": {
          const target = sees ? this.playerPos : a.lastSeen;
          this.moveToward(a, target, 5.3, dt);
          if (sees) {
            a.lastSeenTime = this.time;
            a.lastSeen.copy(this.playerPos);
          }
          const d = a.pos.distanceTo(this.playerPos);
          if (d < 1.35 && !this.camoActive) {
            this.lose();
            return;
          }
          if (this.time - a.lastSeenTime > 7 && a.awareness < 0.35) {
            a.state = "suspicious";
          }
          break;
        }
        default:
          break;
      }

      a.parts.group.position.set(a.pos.x, a.parts.group.position.y, a.pos.z);
      a.parts.group.rotation.y = a.facing;
      const speed01 = a.state === "chase" ? 1 : a.state === "suspicious" ? 0.55 : 0.5;
      animateHumanoid(a.parts, a.parts.group, this.time, speed01);
    }
  }

  private moveAlongWaypoints(a: Agent, speed: number, dt: number): void {
    const wp = a.waypoints[a.wpIndex];
    if (a.pos.distanceTo(wp) < 0.5) {
      a.wpIndex = (a.wpIndex + 1) % a.waypoints.length;
      return;
    }
    this.moveToward(a, wp, speed, dt);
  }

  private moveToward(a: Agent, target: THREE.Vector3, speed: number, dt: number): void {
    const dir = target.clone().sub(a.pos).setY(0);
    if (dir.lengthSq() < 0.01) return;
    dir.normalize();
    a.facing = Math.atan2(dir.x, dir.z);
    a.pos.addScaledVector(dir, speed * dt);
  }

  private updateSuspicion(dt: number): void {
    // Decay when nobody is watching.
    let watched = false;
    for (const a of this.agents) {
      if (a.state !== "stunned" && this.agentSeesPlayer(a)) watched = true;
    }
    for (const n of this.npcs) {
      if (
        !this.disguiseOn && !this.camoActive &&
        n.pos.distanceTo(this.playerPos) < 8 &&
        !this.losBlocked(new THREE.Vector3(n.pos.x, 1.5, n.pos.z), this.playerPos.clone().setY(1.2))
      ) {
        watched = true;
      }
    }
    if (!watched) {
      this.suspicion = Math.max(0, this.suspicion - 5.5 * dt);
    }
    if (this.suspicion >= 100) {
      // Panic level: every agent converges.
      for (const a of this.agents) {
        if (a.state === "patrol") a.state = "chase";
        a.lastSeen.copy(this.playerPos);
        a.lastSeenTime = this.time;
      }
    }
    setSuspicion(this.suspicion);
  }

  private updateAbilities(dt: number): void {
    this.pulseCooldown = Math.max(0, this.pulseCooldown - dt);
    this.camoCooldown = Math.max(0, this.camoCooldown - dt);
    if (this.camoActive) {
      this.camoTicksLeft--;
      if (this.camoTicksLeft <= 0) this.restoreCamo();
    }
    setAbilityStates(
      this.disguiseOn,
      this.pulseCooldown / 8,
      this.camoActive ? "active" : this.camoCooldown > 0 ? "cooldown" : "ready",
    );
  }

  private updateCarried(): void {
    if (!this.carrying) return;
    const item = this.carrying === "crate" ? this.world.crate : this.world.basket;
    item.visible = true;
    const fx = Math.sin(this.playerFacing);
    const fz = Math.cos(this.playerFacing);
    item.position.set(
      this.playerPos.x + fx * 0.75,
      0.45,
      this.playerPos.z + fz * 0.75,
    );
    item.rotation.y = this.playerFacing;
  }

  private updatePulses(dt: number): void {
    for (const p of this.pulses) {
      p.life -= dt * 9;
      const s = Math.max(0.01, (6 - p.life) * 1.2);
      p.ring.scale.set(s, s, s);
      (p.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life / 6);
    }
    this.pulses = this.pulses.filter((p) => {
      if (p.life <= 0) {
        this.scene.remove(p.ring);
        return false;
      }
      return true;
    });
  }

  private updateCamera(dt: number): void {
    const d = 5.6;
    const camOff = new THREE.Vector3(
      Math.sin(this.yaw),
      0,
      Math.cos(this.yaw),
    );
    const target = new THREE.Vector3(
      this.playerPos.x + camOff.x * d * Math.cos(this.pitch * 0.7),
      this.playerPos.y + 1.6 + d * Math.sin(this.pitch),
      this.playerPos.z + camOff.z * d * Math.cos(this.pitch * 0.7),
    );

    // Keep the camera out of buildings.
    const head = this.playerPos.clone().add(new THREE.Vector3(0, 1.5, 0));
    const dir = target.clone().sub(head);
    const dist = dir.length();
    dir.normalize();
    const ray = new THREE.Ray(head, dir);
    const hit = new THREE.Vector3();
    let allowed = dist;
    for (const c of this.colliders) {
      if (c.removable && !this.colliders.includes(c)) continue;
      if (ray.intersectBox(c.box, hit)) {
        const t = hit.distanceTo(head);
        if (t < allowed) allowed = Math.max(1.2, t - 0.3);
      }
    }
    target.copy(head).addScaledVector(dir, allowed);
    if (target.y < 0.4) target.y = 0.4;

    this.camera.position.lerp(target, Math.min(1, 12 * dt));
    this.camera.lookAt(this.playerPos.x, this.playerPos.y + 1.5, this.playerPos.z);
  }

  private updateHud(): void {
    el.objective.textContent = objectiveText();
  }

  private loop(): void {
    requestAnimationFrame(() => this.loop());
    const dt = this.clock.getDelta();
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}

// Augment Agent with group reference helper (used in reset).
declare module "./game" {}
interface AgentProto {
  group?: THREE.Group;
}
