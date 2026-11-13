import Link from "next/link";

// Visas för sidor som inte finns (404).
export default function NotFound() {
  return (
    <div>
      <h1>Sidan hittades inte</h1>
      <p>Sidan du letar efter finns inte.</p>
      <Link href="/">Tillbaka till startsidan</Link>
    </div>
  );
}
