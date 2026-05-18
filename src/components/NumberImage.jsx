import img0 from "../assets/number/0.png";
import img1 from "../assets/number/1.png";
import img2 from "../assets/number/2.png";
import img3 from "../assets/number/3.png";
import img4 from "../assets/number/4.png";
import img5 from "../assets/number/5.png";
import img6 from "../assets/number/6.png";
import img7 from "../assets/number/7.png";
import img8 from "../assets/number/8.png";
import img9 from "../assets/number/9.png";

export const NUMBER_IMAGES = {
  0: img0,
  1: img1,
  2: img2,
  3: img3,
  4: img4,
  5: img5,
  6: img6,
  7: img7,
  8: img8,
  9: img9,
};

/** Renders 0–9 using assets/number/*.png */
export default function NumberImage({ value, className = "", alt }) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 9) return null;
  return (
    <img
      src={NUMBER_IMAGES[n]}
      alt={alt ?? `Number ${n}`}
      className={["number-img", className].filter(Boolean).join(" ")}
      draggable={false}
    />
  );
}
