# THE ALIENS 🛸

A compact 3D action-stealth game built with **Three.js + TypeScript + Vite**.

You are a friendly alien stranded in a small human town. Blend in, help people,
and complete three good deeds before the capture unit bags you like rare space junk.

> *"I want to do the right thing — but helping someone might reveal who I really am."*

## Run it

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

## How to play

| Input | Action |
|---|---|
| **WASD / Arrows** | Move (camera-relative) |
| **Mouse** | Rotate camera (click the canvas to capture the mouse) |
| **Shift** | Sprint |
| **Space** | Jump |
| **E** | Interact (pick up / deliver / rest) |
| **Q** | Human disguise (hat + big coat) |
| **F** | Alien pulse (fixes the park lamppost, stuns nearby agents — *very* visible) |
| **C** | Camouflage (6s of invisibility) |
| **Esc** | Pause / release mouse |

## The loop

1. Leave the safehouse (south).
2. Complete the three missions:
   - **Stock the shelves** — carry the crate from behind the shop to the shop front.
   - **Light up the park** — use your pulse on the broken lamppost (west park). Agents who see the pulse get *very* interested.
   - **Granny's groceries** — pick up the basket by the fountain, deliver it to Granny's door on the north street.
3. Manage the SUSPICION meter. Hide behind buildings, use your disguise, vanish with camo.
4. When all three are done, return to the safehouse to win. Get caught and it's the bag for you.

## Tips

- Walking in disguise is nearly invisible; sprinting in the open is not.
- Agents that lose sight of you cool off — break line of sight and wait.
- The pulse stuns nearby agents for a few seconds. Great escape tool, terrible habit.

## Tech

- Vite + TypeScript, no frameworks.
- Three.js for rendering; all models are procedural low-poly geometry (no external assets).
- Simple AABB collision, raycast line-of-sight, and a hand-rolled third-person camera with occlusion handling.
