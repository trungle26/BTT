# BTT Web Replica

Standalone web rewrite of the Android MVVM game, preserving the same game-state logic and flow:

- Rules intro (4 pages) -> board -> question/bomb presentation.
- 48-card board, 8 teams, score controls, timer, and effect-card system.
- Reused original Android media assets (effect cards, intro image, explosion video, SFX).

## Run

From project root:

```bash
python3 -m http.server 8080 -d web
```

Then open:

`http://localhost:8080`
