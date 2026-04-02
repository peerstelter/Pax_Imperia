export default function MenuPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <h1 className="text-5xl font-bold tracking-widest text-amber-400">
        PAX IMPERIA
      </h1>
      <p className="text-stone-400 italic">
        There is no peace, only the illusion of it.
      </p>
      <button
        className="px-8 py-3 bg-amber-700 hover:bg-amber-600 text-white rounded border border-amber-500 transition-colors"
        onClick={() => alert('Game creation coming in Task 64')}
      >
        New Game
      </button>
    </div>
  );
}
