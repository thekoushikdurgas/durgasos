# DurgasOS motion (react-motion)

DurgasOS uses [react-motion](https://github.com/chenglou/react-motion) (`^0.5.2`) for spring-based UI animation. Reference demos live in `docs/packages&modulars/react-motion-master/demos/`.

## Imports

Application code should **not** import `react-motion` directly. Use adapters:

| Adapter                    | Path                                          |
| -------------------------- | --------------------------------------------- |
| `SpringBox`                | `@/components/motion/SpringBox`               |
| `Presence`, `PresenceList` | `@/components/motion/PresenceList`            |
| `StaggerList`              | `@/components/motion/StaggerList`             |
| `SpringTabIndicator`       | `@/components/motion/SpringTabIndicator`      |
| `usePointerDragSpring`     | `@/components/motion/use-pointer-drag-spring` |
| `useReducedMotionStyle`    | `@/lib/motion/use-reduced-motion-style`       |
| Presets                    | `@/lib/motion/spring-presets`                 |

## Reduced motion

Use `usePrefersReducedMotion()` from `@/lib/use-prefers-reduced-motion`. `useReducedMotionStyle` returns plain numbers instead of `spring()` when reduced motion is enabled.

## Spring tuning

Adjust `stiffness`, `damping`, and `precision` in `lib/motion/spring-presets.ts`. Use demo5 in react-motion-master as a interactive chooser reference.

## Dev smoke test

`npm run dev` → `/dev/react-motion-smoke` — verifies `Motion`, `TransitionMotion`, and `StaggeredMotion` on React 19.

## Graph apps

`@xyflow/react` handles node drag/layout in Agent/Workflow apps. react-motion applies to surrounding panels and chrome only.
