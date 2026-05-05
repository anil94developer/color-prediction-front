export function ballClassForNumber(n) {
  if (n === 0) return "ball-mix-rv";
  if (n === 5) return "ball-mix-gv";
  if ([1, 3, 7, 9].includes(n)) return "ball-green";
  return "ball-red";
}
