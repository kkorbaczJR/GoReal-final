import type { Background, Face, Outfit } from "@/lib/shop";
import Mascot, { type Mood } from "./Mascot";
import PixelScene from "./PixelScene";
import styles from "./RiloStage.module.css";

/** Rilo standing in a rounded card, in front of his pixel background (if any). */
export default function RiloStage({
  outfit,
  face,
  background,
  mood = "happy",
  size = 130,
  height = 190,
  still = false,
}: {
  outfit: Outfit | null;
  face: Face | null;
  background: Background | null;
  mood?: Mood;
  size?: number;
  height?: number;
  still?: boolean;
}) {
  return (
    <div className={`${styles.stage} ${background ? "" : styles.plain}`} style={{ height }}>
      {background && <PixelScene scene={background} className={styles.scene} />}
      <div className={styles.rilo}>
        <Mascot mood={mood} size={size} outfit={outfit} face={face} still={still} />
      </div>
    </div>
  );
}
