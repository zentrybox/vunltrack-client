"use client";

import { useEffect, useState } from "react";

function ThemeDebug() {
  const [htmlClass, setHtmlClass] = useState<string>("");
  useEffect(() => {
    const update = () => setHtmlClass(document.documentElement.className || "(none)");
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mt-4 rounded-lg border border-gray-300 dark:border-gray-700 p-4 text-xs font-mono bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200">
      html.className: {htmlClass}
    </div>
  );
}

export default function TestThemePage() {
  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Theme Diagnostic</h1>
      <p className="text-sm text-gray-700 dark:text-gray-300">Haz clic en los botones para alternar manualmente el modo. Esta página evita lógica adicional para aislar el problema.</p>
      <div className="flex gap-3">
        <button
          onClick={() => { document.documentElement.classList.remove("dark"); localStorage.setItem("theme","light"); }}
          className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-900 text-sm font-semibold"
        >Claro</button>
        <button
          onClick={() => { document.documentElement.classList.add("dark"); localStorage.setItem("theme","dark"); }}
          className="px-4 py-2 rounded-md bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold"
        >Oscuro</button>
        <button
          onClick={() => { document.documentElement.classList.toggle("dark"); const isDark=document.documentElement.classList.contains("dark"); localStorage.setItem("theme", isDark?"dark":"light"); }}
          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
        >Toggle</button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-300 dark:border-gray-700 p-6 bg-white dark:bg-gray-950 shadow">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Card Claro/Oscuro</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">Texto de ejemplo.</p>
        </div>
        <div className="rounded-xl border border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900 shadow">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Card secundaria</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">Verifica contraste.</p>
        </div>
      </div>
      <div className="space-y-3">
        <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" placeholder="Input" />
        <textarea className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" rows={3} placeholder="Textarea" />
      </div>
      <ThemeDebug />
    </main>
  );
}