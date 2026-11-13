// Ändra rubriken här (används i steg 7.1 för att testa hela CI/CD-kedjan).
const HEADING = "TO DO-lista (driftsatt via CI/CD)";

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
