// Ändra rubriken här (används i steg 7.1 för att testa hela CI/CD-kedjan).
const HEADING = "TO DO-lista (driftsatt via CI/CD)";

// MEDVETET FEL för steg 7.3: en sträng tilldelas en variabel av typen number.
const medvetetFel: number = "det här är inte ett tal";

export default function Home() {
  return (
    <>
      <h1>{HEADING}</h1>
      <p>
        Det här är en enkel Next.js-app. Fokus ligger på driftsättning med Docker,
        GitHub Actions och Render.
      </p>
    </>
  );
}
