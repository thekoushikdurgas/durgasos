# Road Rash assets

Copy art from the reference repos under `docs/docs/ideas/roadrash/`:

| File                     | Source (if present in clone)                                    |
| ------------------------ | --------------------------------------------------------------- |
| `images/background.png`  | `Road-Rash-master/images/background.png` — sky layers           |
| `images/sprites.png`     | `Road-Rash-master/images/sprites.png` — bikes, cars, billboards |
| `images/roadrash.png`    | `Road-Rash-master/images/roadrash.png` — menu backdrop          |
| `music/bike_forward.mp3` | `Road-Rash-master/music/`                                       |
| `music/kick.mp3`         | `Road-Rash-master/music/`                                       |
| `music/bike_crash.mp3`   | `Road-Rash-master/music/`                                       |

RoadRashJs-master (`img/mainbike.png`, `background2.jpg`) can supplement 2D UI mockups.

Until images are added, the game uses **procedural skyscapes** (`lib/roadrash-sky-render.ts`) and vector roadside objects.

`Road-Rash-lane-detection-master` is OpenCV/Python only — not used in the browser build.
