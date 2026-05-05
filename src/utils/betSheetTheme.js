import { ballClassForNumber } from "./balls.js";

/**
 * Maps selected bet to a CSS modifier on `.bet-sheet` for themed dialog chrome.
 */
export function betSheetThemeClass(betType, numberSel) {
  if (!betType) return "";

  if (betType === "color_green") return "bet-sheet--green";
  if (betType === "color_red") return "bet-sheet--red";
  if (betType === "color_violet") return "bet-sheet--violet";
  if (betType === "big") return "bet-sheet--big";
  if (betType === "small") return "bet-sheet--small";

  if (betType === "number") {
    const n = Number(numberSel);
    if (!Number.isInteger(n) || n < 0 || n > 9) return "";
    const ball = ballClassForNumber(n);
    if (ball === "ball-green") return "bet-sheet--green";
    if (ball === "ball-red") return "bet-sheet--red";
    if (ball === "ball-mix-rv") return "bet-sheet--mix-rv";
    if (ball === "ball-mix-gv") return "bet-sheet--mix-gv";
  }

  return "";
}
