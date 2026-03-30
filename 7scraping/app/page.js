import React from "react";
import { Sparkles, Globe } from "lucide-react";

export default function Home() {
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
                placeholder="Collez une URL ici..."
                className="flex-1 outline-none px-2 py-3 text-gray-700"
            />

            <button className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-medium transition">
              Analyser →
            </button>
          </div>

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
