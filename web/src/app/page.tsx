export default function Home() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Brainstorm MVP</h1>
      <ul className="list-disc ml-6">
        <li><a className="underline" href="/signin">Sign in</a></li>
        <li><a className="underline" href="/ideas">Manage your ideas</a></li>
      </ul>
    </main>
  );
}
