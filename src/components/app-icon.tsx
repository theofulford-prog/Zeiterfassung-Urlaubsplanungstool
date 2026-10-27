// Gemeinsame Grafik für Favicon und Homescreen-Symbol (wird von next/og als PNG gerendert).
export function AppIconArt({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #1597a3 0%, #0b5860 100%)", color: "white",
        fontSize: size * 0.56, fontWeight: 700, fontFamily: "sans-serif",
      }}
    >
      T
    </div>
  );
}
