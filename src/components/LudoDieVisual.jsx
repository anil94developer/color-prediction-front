/**
 * Red glossy die photo + optional result overlay. Tumbling animation when rolling.
 */
export default function LudoDieVisual({ rolling, faceValue, size = "sm", className = "" }) {
  const showNum = !rolling && faceValue != null && faceValue >= 1 && faceValue <= 6;

  return (
    <div
      className={`ludo-die-visual ludo-die-visual--${size} ${rolling ? "ludo-die-visual--rolling" : ""} ${className}`.trim()}
    >
      <div className="ludo-die-visual__inner">
        <img src="/ludo-dice-red.png" alt="" className="ludo-die-visual__img" draggable={false} />
        {showNum ? (
          <span className="ludo-die-visual__result">{faceValue}</span>
        ) : !rolling && faceValue == null && size === "sm" ? (
          <span className="ludo-die-visual__placeholder">?</span>
        ) : null}
      </div>
    </div>
  );
}
