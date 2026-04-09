# BTT Web Replica

Standalone web rewrite of the Android MVVM game, preserving the same game-state logic and flow:

- Rules intro (4 pages) -> board -> question/bomb presentation.
- 48-card board, 8 teams, score controls, timer, and effect-card system.
- Reused original Android media assets (effect cards, intro image, explosion video, SFX).
- Board data can be loaded from an editable spreadsheet file without randomizing question order.

## Run

From project root:

```bash
python3 -m http.server 8080 -d web
```

Then open:

`http://localhost:8080`

## Spreadsheet Data

The web app loads board data from:

- `web/data/questions.xlsx` if present
- otherwise `web/data/questions.csv`

You can edit `questions.csv` directly in Excel, or save an `.xlsx` file with the same columns.

Required columns:

- `id`
- `type`
- `text`
- `choiceA`
- `choiceB`
- `choiceC`
- `choiceD`
- `correctChoiceIndex`
- `correctAnswerText`

Supported `type` values:

- `MULTIPLE_CHOICE`
- `ESSAY`
- `REAL_WORLD_CHALLENGE`
- `BOMB`

Notes:

- The board order follows the row order exactly. There is no question randomization when spreadsheet data is used.
- The file must contain exactly `48` rows total for the board.
- For `correctChoiceIndex`, you can use `A-D`, `1-4`, or `0-3`.
