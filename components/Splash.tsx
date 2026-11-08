import Mascot from "./Mascot";

export default function Splash() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Mascot mood="sleeping" size={120} />
    </div>
  );
}
