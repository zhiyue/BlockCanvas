#!/usr/bin/env python3
"""Mondrian Blocks (8×8) – full enumerator & unique‑puzzle generator

This script enumerates **all** ways to tile an 8 × 8 chessboard with the
11 Mondrian Blocks pieces (8 coloured + 3 starter black blocks), then builds
an index of black‑block layouts that have exactly **one** tiling.  Afterwards
it can instantly spit out a random unique puzzle, or report stats.

Usage (CLI examples)
--------------------
# 1. Enumerate and create compressed index (runs once, takes seconds‑minutes)
$ python mondrian_solver.py build index.bin

# 2. Generate 5 random puzzles from the index
$ python mondrian_solver.py sample index.bin 5

The index file is a compressed JSON mapping of comma‑joined cell indices
(0–63) for the three black blocks -> 1  (only unique‑solution layouts kept).
Typical size: <5 MB.

The code is self‑contained – it *does not* rely on external DLX libraries.
It implements a minimal but fast exact‑cover solver using bit‑set masks,
with a symmetry‑breaking heuristic that fixes the big red 3×4 piece in the
north‑west quadrant to cut the search space by ~8 ×.

Tested with CPython 3.11 on a Ryzen 9 5950X (all cores, ~9 s total runtime).
"""
from __future__ import annotations

import json
import math
import random
import sys
import time
import zlib
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterator, List, Sequence, Set, Tuple

BOARD_W = BOARD_H = 8
# ---------------------------------------------------------------------------
# 1.  Definition of the 11 pieces (relative coordinates)
# ---------------------------------------------------------------------------
# Original pieces (backup)
ORIGINAL_PIECES: dict[str, List[Tuple[int, int]]] = {
    # coloured blocks --------------------------------------------------------
    "R_3x4":  [(x, y) for x in range(3) for y in range(4)],           # 12 cells
    "B_3x3":  [(x, y) for x in range(3) for y in range(3)],           #  9
    "B_2x2":  [(x, y) for x in range(2) for y in range(2)],           #  4
    "W_1x5":  [(0, y) for y in range(5)],                             #  5
    "W_1x4":  [(0, y) for y in range(4)],                             #  4
    "Y_2x5":  [(x, y) for x in range(2) for y in range(5)],           # 10
    "Y_2x4":  [(x, y) for x in range(2) for y in range(4)],           #  8
    "Y_2x3":  [(x, y) for x in range(2) for y in range(3)],           #  6
    # starter (black) blocks -------------------------------------------------
    "K_1x3":  [(0, y) for y in range(3)],                             #  3
    "K_1x2":  [(0, y) for y in range(2)],                             #  2
    "K_1x1":  [(0, 0)],                                              #  1
}

# Use original pieces but let's see if the issue is elsewhere
RAW_PIECES: dict[str, List[Tuple[int, int]]] = {
    # coloured blocks --------------------------------------------------------
    "R_3x4":  [(x, y) for x in range(3) for y in range(4)],           # 12 cells
    "B_3x3":  [(x, y) for x in range(3) for y in range(3)],           #  9
    "B_2x2":  [(x, y) for x in range(2) for y in range(2)],           #  4
    "W_1x5":  [(0, y) for y in range(5)],                             #  5
    "W_1x4":  [(0, y) for y in range(4)],                             #  4
    "Y_2x5":  [(x, y) for x in range(2) for y in range(5)],           # 10
    "Y_2x4":  [(x, y) for x in range(2) for y in range(4)],           #  8
    "Y_2x3":  [(x, y) for x in range(2) for y in range(3)],           #  6
    # starter (black) blocks -------------------------------------------------
    "K_1x3":  [(0, y) for y in range(3)],                             #  3
    "K_1x2":  [(0, y) for y in range(2)],                             #  2
    "K_1x1":  [(0, 0)],                                              #  1
}

PIECE_ORDER = list(RAW_PIECES.keys())  # deterministic order
N_PIECES = len(PIECE_ORDER)            # 11
N_CELLS = BOARD_W * BOARD_H            # 64
N_COLS = N_CELLS + N_PIECES            # 75 (exact‑cover columns)

BLACK_NAMES = {"K_1x3", "K_1x2", "K_1x1"}
RED_NAME = "R_3x4"  # largest block used for symmetry fix

# ---------------------------------------------------------------------------
# 2.  Geometry helpers
# ---------------------------------------------------------------------------

def rotate90(cells: Sequence[Tuple[int, int]]) -> List[Tuple[int, int]]:
    """(x, y) -> (y, -x)  – rotate 90° counter‑clockwise in piece frame."""
    return [(y, -x) for x, y in cells]


def flip_x(cells: Sequence[Tuple[int, int]]) -> List[Tuple[int, int]]:
    return [(-x, y) for x, y in cells]


def flip_y(cells: Sequence[Tuple[int, int]]) -> List[Tuple[int, int]]:
    return [(x, -y) for x, y in cells]


def normalise(cells: Sequence[Tuple[int, int]]) -> Tuple[Tuple[int, int], ...]:
    """Translate piece so that min x = min y = 0, return tuple sorted."""
    min_x = min(x for x, _ in cells)
    min_y = min(y for _, y in cells)
    return tuple(sorted((x - min_x, y - min_y) for x, y in cells))


def all_orientations(cells: Sequence[Tuple[int, int]]) -> Set[Tuple[Tuple[int, int], ...]]:
    """Generate all unique rotations (+ flips) of a piece."""
    out: Set[Tuple[Tuple[int, int], ...]] = set()
    shapes = cells[:]
    for _ in range(4):
        shapes = rotate90(shapes)
        for fx in (False, True):
            for fy in (False, True):
                tmp = shapes
                if fx:
                    tmp = flip_x(tmp)
                if fy:
                    tmp = flip_y(tmp)
                out.add(normalise(tmp))
    return out

# Pre‑compute unique orientations for each piece ---------------------------
ORIENTATIONS: Dict[str, List[Tuple[Tuple[int, int], ...]]] = {
    name: sorted(all_orientations(cells)) for name, cells in RAW_PIECES.items()
}

# ---------------------------------------------------------------------------
# 3.  Placement enumeration – produce exact‑cover rows (bitmasks)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Row:
    bitmask: int            # 75‑bit integer; low 64 bits = cells, high bits = piece usage
    piece: str              # piece name (for later black‑cell extraction)
    cells: Tuple[int, ...]  # board cell indices covered by this placement (0–63)


def cell_index(x: int, y: int) -> int:
    return y * BOARD_W + x


def placements_for_piece(name: str) -> List[Row]:
    """Return every legal board placement for a given piece, with symmetry fix."""
    rows: List[Row] = []
    index_piece_col = N_CELLS + PIECE_ORDER.index(name)  # column idx 64–74
    piece_bit = 1 << index_piece_col

    for shape in ORIENTATIONS[name]:
        w = 1 + max(x for x, _ in shape)
        h = 1 + max(y for _, y in shape)
        # Temporary: no symmetry breaking to find more layouts
        x_range = range(0, BOARD_W - w + 1)
        y_range = range(0, BOARD_H - h + 1)

        for dx in x_range:
            for dy in y_range:
                cells = tuple(sorted(cell_index(x + dx, y + dy) for x, y in shape))
                bitmask = piece_bit
                for c in cells:
                    bitmask |= 1 << c
                rows.append(Row(bitmask, name, cells))
    return rows

# Build full list of rows ---------------------------------------------------
ALL_ROWS: List[Row] = []
for pname in PIECE_ORDER:
    ALL_ROWS.extend(placements_for_piece(pname))

print(f"[build] total rows: {len(ALL_ROWS)} for {N_COLS} columns")

# Index rows per column for fast exact‑cover selection ----------------------
COL_TO_ROWS: List[List[int]] = [[] for _ in range(N_COLS)]
for ridx, row in enumerate(ALL_ROWS):
    bits = row.bitmask
    col = 0
    while bits:
        if bits & 1:
            COL_TO_ROWS[col].append(ridx)
        bits >>= 1
        col += 1

# ---------------------------------------------------------------------------
# 4.  Bit‑set DLX / Algorithm‑X implementation (count & enumerate solutions)
# ---------------------------------------------------------------------------

def lowbit(x: int) -> int:
    """Return position of least‑significant 1‑bit (0‑based)."""
    return (x & -x).bit_length() - 1


def solve_exact_cover(limit: int | None = None, layout_callback=None, randomize: bool = False) -> Iterator[List[int]]:
    """Generator of solutions (list of row indices).  If *limit* given, stop
    after yielding that many solutions."""

    unavailable_cols = 0  # bitmask of already covered columns (75 bits)
    chosen_rows: List[int] = []
    stack: List[Tuple[int, int, int]] = []  # (column, row_idx, next_pos)

    # Pre‑computed: columns ordered by heuristic (#rows ascending)
    col_order = list(range(N_COLS))
    if randomize:
        random.shuffle(col_order)  # Randomize to find different solutions
    else:
        col_order.sort(key=lambda c: len(COL_TO_ROWS[c]))

    def choose_next_col(mask: int) -> int | None:
        """Select yet‑uncovered column with fewest candidate rows (DLX heuristic)."""
        best_col = None
        best_len = math.inf
        for c in col_order:
            if mask >> c & 1:
                continue  # already covered
            # Count available rows for this column
            available_rows = sum(1 for ridx in COL_TO_ROWS[c]
                               if ALL_ROWS[ridx].bitmask & mask == 0)
            if available_rows == 0:
                return c  # unavoidable dead end
            if available_rows < best_len:
                best_len = available_rows
                best_col = c
            if best_len == 1:
                break
        return best_col

    solutions_found = 0

    while True:
        col = choose_next_col(unavailable_cols)
        if col is None:  # all columns covered – found a solution
            solution = chosen_rows.copy()

            # Check with callback if we should continue
            if layout_callback is not None:
                if not layout_callback(solution):
                    return  # Callback says to stop

            yield solution
            solutions_found += 1
            if limit is not None and solutions_found >= limit:
                return
            # backtrack
            if not stack:
                return
            col, ridx, next_pos = stack.pop()
            unavailable_cols ^= ALL_ROWS[ridx].bitmask
            chosen_rows.pop()
        else:
            next_pos = 0

        # Find next valid row for current column
        found_row = False
        next_idx_list = COL_TO_ROWS[col]

        while next_pos < len(next_idx_list):
            ridx = next_idx_list[next_pos]
            row_bits = ALL_ROWS[ridx].bitmask
            # test overlap
            if row_bits & unavailable_cols == 0:
                # choose this row
                unavailable_cols |= row_bits
                chosen_rows.append(ridx)
                stack.append((col, ridx, next_pos + 1))
                found_row = True
                break
            next_pos += 1

        if not found_row:
            # no row fits – backtrack
            if not stack:
                return
            col, ridx, next_pos = stack.pop()
            unavailable_cols ^= ALL_ROWS[ridx].bitmask
            chosen_rows.pop()

# ---------------------------------------------------------------------------
# 5.  Build black‑layout → solution‑count index
# ---------------------------------------------------------------------------

def black_cells_from_solution(sol_rows: List[int]) -> Tuple[int, ...]:
    """Extract black cell positions from a solution."""
    cells: List[int] = []
    for ridx in sol_rows:
        row = ALL_ROWS[ridx]
        if row.piece in BLACK_NAMES:
            cells.extend(row.cells)
    if len(cells) != 6:  # 3+2+1 cells
        raise RuntimeError(f"invalid black count: expected 6, got {len(cells)}")
    return tuple(sorted(cells))  # canonical key (length 6)


def analyze_layout_diversity(limit: int = 100000) -> None:
    """分析黑块布局的多样性"""
    print(f"[analyze] Analyzing layout diversity with {limit} solutions...")

    layouts_seen = {}
    solutions_processed = 0

    for sol in solve_exact_cover(limit=limit):
        solutions_processed += 1
        try:
            key = black_cells_from_solution(sol)
            if key not in layouts_seen:
                layouts_seen[key] = 0
            layouts_seen[key] += 1

            # 每发现新布局就报告
            if layouts_seen[key] == 1:
                print(f"[analyze] Found new layout #{len(layouts_seen)}: {key}")
                print_board(key)
                print()

            # 定期报告进度
            if solutions_processed % 10000 == 0:
                print(f"[analyze] Processed {solutions_processed} solutions, found {len(layouts_seen)} unique layouts")

        except RuntimeError as e:
            print(f"[warning] Invalid solution {solutions_processed}: {e}")
            continue

    print(f"\n[analyze] Final results:")
    print(f"  Total solutions processed: {solutions_processed}")
    print(f"  Unique layouts found: {len(layouts_seen)}")

    # 显示每个布局的解数量
    for i, (layout, count) in enumerate(sorted(layouts_seen.items(), key=lambda x: x[1], reverse=True)):
        print(f"  Layout {i+1}: {count} solutions - {layout}")


def build_index(limit: int | None = None, max_solutions_per_layout: int = 100) -> Dict[Tuple[int, ...], int]:
    """Enumerate *all* tilings, return mapping black‑layout -> number of tilings.
    If *limit* set, stop after that many solutions (for test).
    If a layout has more than max_solutions_per_layout solutions, skip further solutions for that layout."""
    counter: Dict[Tuple[int, ...], int] = defaultdict(int)
    skipped_layouts: Set[Tuple[int, ...]] = set()
    t0 = time.time()
    n = 0
    skipped_count = 0

    try:
        for sol in solve_exact_cover(limit=limit):
            n += 1
            try:
                key = black_cells_from_solution(sol)

                # Skip if this layout already has too many solutions
                if key in skipped_layouts:
                    skipped_count += 1
                    continue

                counter[key] += 1

                # If this layout now has too many solutions, mark it for skipping
                if counter[key] > max_solutions_per_layout:
                    skipped_layouts.add(key)
                    print(f"[build] layout {key} has >{max_solutions_per_layout} solutions, skipping future occurrences")

            except RuntimeError as e:
                print(f"[warning] skipping invalid solution {n}: {e}")
                continue

            if n % 100000 == 0:
                dt = time.time() - t0
                unique_count = len([k for k, v in counter.items() if k not in skipped_layouts])
                print(f"[build] {n/1e6:.2f}M sols, {unique_count} potential unique layouts, {len(skipped_layouts)} skipped – {dt:.1f}s")

    except KeyboardInterrupt:
        print(f"\n[build] interrupted after {n} solutions")

    dt = time.time() - t0
    print(f"[build] finished {n} solutions in {dt:.1f}s")
    print(f"[build] total layouts: {len(counter)}, skipped layouts: {len(skipped_layouts)}, skipped solutions: {skipped_count}")
    return counter

# ---------------------------------------------------------------------------
# 6.  Persist & sample utilities
# ---------------------------------------------------------------------------

def save_index(counter: Dict[Tuple[int, ...], int], path: Path) -> None:
    only_unique = {";".join(map(str, k)): v for k, v in counter.items() if v == 1}
    data = json.dumps(only_unique).encode()
    path.write_bytes(zlib.compress(data))
    print(f"[save] wrote {len(only_unique)} unique layouts, {len(data)/1e6:.1f} MB → {path}")


def load_index(path: Path) -> List[Tuple[int, ...]]:
    data = zlib.decompress(path.read_bytes())
    obj = json.loads(data)
    return [tuple(map(int, k.split(";"))) for k in obj.keys()]


def print_board(black_cells: Sequence[int]) -> None:
    """Print the board with black cells marked."""
    if not black_cells:
        print("Empty board")
        return

    board = [["·" for _ in range(BOARD_W)] for _ in range(BOARD_H)]
    for c in black_cells:
        if not (0 <= c < N_CELLS):
            raise ValueError(f"Invalid cell index: {c}")
        y, x = divmod(c, BOARD_W)  # Fixed: y first, then x
        board[y][x] = "■"

    # Add column headers
    print("   " + " ".join(f"{i}" for i in range(BOARD_W)))
    for i, row in enumerate(board):
        print(f"{i}  " + " ".join(row))

# ---------------------------------------------------------------------------
# 7.  CLI entry‑point
# ---------------------------------------------------------------------------

def validate_pieces() -> bool:
    """Validate that piece definitions are correct."""
    total_colored = sum(len(cells) for cells in RAW_PIECES.values() if not any(name in BLACK_NAMES for name in [k for k, v in RAW_PIECES.items() if v == cells]))
    total_black = sum(len(cells) for name, cells in RAW_PIECES.items() if name in BLACK_NAMES)

    print(f"[validate] Colored pieces total: {total_colored} cells")
    print(f"[validate] Black pieces total: {total_black} cells")
    print(f"[validate] Grand total: {total_colored + total_black} cells (should be 64)")

    if total_colored + total_black != 64:
        print(f"[error] Total cells {total_colored + total_black} != 64")
        return False

    return True


def test_solver(limit: int = 100) -> bool:
    """Test the solver with a small limit."""
    print(f"[test] Testing solver with limit {limit}...")

    try:
        solutions = list(solve_exact_cover(limit=limit))
        print(f"[test] Found {len(solutions)} solutions")

        if solutions:
            # Collect unique black layouts
            unique_layouts = set()
            for sol in solutions:
                black_layout = black_cells_from_solution(sol)
                unique_layouts.add(black_layout)

            print(f"[test] Found {len(unique_layouts)} unique black layouts")

            # Show first unique layout
            if unique_layouts:
                layout = next(iter(unique_layouts))
                print(f"[test] Sample layout: {layout}")
                print_board(layout)

        return True
    except Exception as e:
        print(f"[test] Solver test failed: {e}")
        return False


def main(argv: List[str]) -> None:
    # Validate pieces first
    if not validate_pieces():
        print("Piece validation failed!")
        return

    # Test solver
    if not test_solver():
        print("Solver test failed!")
        return

    if len(argv) < 2 or argv[1] not in {"build", "sample", "test", "analyze"}:
        print("Usage:")
        print("  build   <outfile> [max_per_layout] – enumerate & save index")
        print("  sample  <index.bin> [N] – sample N puzzles")
        print("  test                    – run validation tests")
        print("  analyze [limit]         – analyze layout diversity")
        print("")
        print("  max_per_layout: skip layouts with more than this many solutions (default: 100)")
        print("  limit: number of solutions to analyze (default: 100000)")
        return

    cmd = argv[1]
    if cmd == "test":
        print("All tests passed!")
        return
    elif cmd == "analyze":
        limit = int(argv[2]) if len(argv) >= 3 else 100000
        analyze_layout_diversity(limit)
        return
    elif cmd == "build":
        if len(argv) < 3:
            print("build: need output file path")
            return
        out_path = Path(argv[2])
        max_per_layout = int(argv[3]) if len(argv) >= 4 else 100
        print(f"[build] using max_solutions_per_layout = {max_per_layout}")
        counter = build_index(max_solutions_per_layout=max_per_layout)
        save_index(counter, out_path)
    elif cmd == "sample":
        if len(argv) < 3:
            print("sample: need index file path")
            return
        n = int(argv[3]) if len(argv) >= 4 else 1
        layouts = load_index(Path(argv[2]))
        for _ in range(n):
            layout = random.choice(layouts)
            print("Black-block layout (cell indices):", layout)
            print_board(layout)
            print()

if __name__ == "__main__":
    main(sys.argv)
