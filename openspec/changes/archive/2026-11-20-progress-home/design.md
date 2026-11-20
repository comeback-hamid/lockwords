## Decisions
- **The meadow is a port of `drawForest` from `docs/design/pixel-meadow.html`.** The numbers (tree shapes, slot, shrink, rise) are copied into `src/progress/meadow.ts` as one `SPEC`. A pure function returns the list of blocks (x, y, size, color, opacity); the component only draws them with `react-native-svg`. So the layout is tested without a screen.
- **A tree's leaves are its deck's words that were met** (stage 1 or higher, or known), highest level first. A deck with no met word is a bare sprout stem. A deck has up to 30 leaf blocks; a longer deck fills the tree.
- **The grid** draws `goal` squares in rows of 20: first the `grid` levels from the server, then dark squares. It is plain views, no SVG.
- **The date** is shown as "BY DEC 29" (month and day, in English like the rest of the screen).
- **Kai on the ground strip** is the live `Kai` component above one row of ground blocks.
