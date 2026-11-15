// Select every remaining apple whose centre is inside the dragged rectangle.
function selectAppleRectangle(cells, from, to, values) {
  const left = Math.min(from.x, to.x),
    top = Math.min(from.y, to.y);
  const right = Math.max(from.x, to.x),
    bottom = Math.max(from.y, to.y);
  const indices = cells
    .filter(
      (cell) =>
        values[cell.index] > 0 &&
        cell.x >= left &&
        cell.x <= right &&
        cell.y >= top &&
        cell.y <= bottom,
    )
    .map((cell) => cell.index);
  return {
    indices,
    sum: indices.reduce((sum, index) => sum + values[index], 0),
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}
