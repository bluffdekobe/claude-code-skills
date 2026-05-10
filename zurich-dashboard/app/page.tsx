"use client";

import { useState, useRef } from "react";
import { Search, Phone, MapPin, Tag, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import PromptModal from "@/components/PromptModal";
import { Business, PipelineEvent } from "@/lib/types";

type Stage = "idle" | "running" | "done" | "error";

export default function Dashboard() {
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [selected, setSelected] = useState<Business | null>(null);
  const [filter, setFilter] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const log = (msg: string) =>
    setStatusLog((prev) => [msg, ...prev].slice(0, 50));

  const start = async () => {
    if (!googleApiKey.trim()) {
      alert("Please enter your Google Places API key.");
      return;
    }

    setBusinesses([]);
    setStatusLog([]);
    setStage("running");
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleApiKey: googleApiKey.trim() }),
        signal: abortRef.current.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const chunk of lines) {
          const dataLine = chunk.replace(/^data: /, "").trim();
          if (!dataLine) continue;
          const event: PipelineEvent = JSON.parse(dataLine);

          if (event.type === "status") {
            log(event.message);
          } else if (event.type === "business") {
            setBusinesses((prev) => [...prev, event.data]);
          } else if (event.type === "done") {
            log(`Pipeline complete — ${event.total} businesses found.`);
            setStage("done");
          } else if (event.type === "error") {
            log(`Error: ${event.message}`);
            setStage("error");
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        log(`Connection error: ${String(err)}`);
        setStage("error");
      }
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setStage("idle");
  };

  const filtered = businesses.filter(
    (b) =>
      !filter ||
      b.name.toLowerCase().includes(filter.toLowerCase()) ||
      b.category.toLowerCase().includes(filter.toLowerCase()) ||
      b.address.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-indigo-700">Zurich · No Website Finder</h1>
            <p className="text-xs text-gray-500">
              Multi-agent pipeline · Google Places + Claude
            </p>
          </div>

          {/* API key input + run button */}
          <div className="flex items-center gap-3">
            <input
              type="password"
              placeholder="Google Places API key"
              value={googleApiKey}
              onChange={(e) => setGoogleApiKey(e.target.value)}
              className="w-64 rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {stage === "running" ? (
              <button
                onClick={stop}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={start}
                disabled={!googleApiKey.trim()}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                <Search size={15} />
                Run pipeline
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Status log */}
        {statusLog.length > 0 && (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              {stage === "running" && (
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
              )}
              {stage === "done" && <CheckCircle2 size={16} className="text-green-500" />}
              {stage === "error" && <AlertCircle size={16} className="text-red-500" />}
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Agent log
              </span>
            </div>
            <ul className="max-h-32 overflow-y-auto space-y-0.5">
              {statusLog.map((msg, i) => (
                <li key={i} className="text-xs text-gray-600">
                  {msg}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stats + filter */}
        {businesses.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-indigo-700">{businesses.length}</span> businesses found without a website
            </p>
            <input
              type="text"
              placeholder="Filter by name, category, address…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-72 rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        )}

        {/* Business table */}
        {filtered.length > 0 && (
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3">Business</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Prompt</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((b) => (
                  <tr key={b.placeId} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{b.name}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                        <Tag size={10} />
                        {b.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="shrink-0" />
                        {b.address}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {b.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {b.phone}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setSelected(b)}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        <Sparkles size={12} />
                        View prompt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {stage === "idle" && businesses.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
            <Search size={36} className="mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">Ready to search</p>
            <p className="mt-1 text-sm text-gray-400">
              Enter your Google Places API key and click <strong>Run pipeline</strong>
            </p>
          </div>
        )}
      </main>

      {/* Prompt modal */}
      {selected && (
        <PromptModal business={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
