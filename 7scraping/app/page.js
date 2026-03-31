"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Globe } from "lucide-react";

const envApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = (envApiBaseUrl || "http://localhost:3001").replace(/\/+$/, "");
const SCRAPE_ENDPOINT = API_BASE_URL.endsWith("/api/scrape") ? API_BASE_URL : `${API_BASE_URL}/api/scrape`;

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleAnalyze = async () => {
    setError("");
    setInfo("");

    if (!url || !url.startsWith("http")) {
      setError("Veuillez saisir une URL complète (par exemple https://www.example.com)");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(SCRAPE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!res.ok) {
        setError(
          data?.error ||
            `Erreur API ${res.status} (${SCRAPE_ENDPOINT}) : ${text}`
        );
        setLoading(false);
        return;
      }

      setInfo(`Session lancée : ${data.session_id}. Redirection vers le chat...`);
      router.push(`/chat?session_id=${encodeURIComponent(data.session_id)}&url=${encodeURIComponent(url)}`);
    } catch (err) {
      setError(`Erreur réseau : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-purple-100 p-4 rounded-2xl shadow">
              <Sparkles className="text-purple-600 w-6 h-6" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Discutez avec n’importe
            <br />
            <span className="text-purple-600">quel site web</span>
          </h1>

          <p className="mt-6 text-gray-500 text-lg">
            Entrez une URL et commencez une conversation intelligente sur son
            contenu avec notre IA.
          </p>

          <div className="mt-10 bg-white rounded-2xl shadow-md flex items-center p-2">
            <div className="flex items-center px-4 text-gray-400">
              <Globe className="w-5 h-5" />
            </div>

            <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Collez une URL ici..."
                className="flex-1 outline-none px-2 py-3 text-gray-700"
            />

            <button
                onClick={handleAnalyze}
                disabled={loading}
                className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition"
            >
              {loading ? 'Analyse en cours...' : 'Analyser →'}
            </button>
          </div>

          {error && <p className="mt-4 text-red-600 font-medium">{error}</p>}
          {info && <p className="mt-4 text-green-600 font-medium">{info}</p>}

          <div className="mt-6 text-gray-400 text-sm flex justify-center items-center gap-2 flex-wrap">
            <span>Essayez :</span>
            {[
              "mwcbarcelona.com",
              "vivatech.com",
              "vancouver.websummit.com",
            ].map((site) => (
                <span
                    key={site}
                    className="bg-gray-200 px-3 py-1 rounded-full text-gray-600"
                >
              {site}
            </span>
            ))}
          </div>
        </div>
      </div>
  );
}
