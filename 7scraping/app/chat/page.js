import React from "react";
import { ArrowLeft, Globe, Send } from "lucide-react";

export default function ChatPage() {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <div className="flex items-center gap-4 px-6 py-4 border-b bg-white">
                <ArrowLeft className="w-5 h-5 text-gray-600 cursor-pointer" />

                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-xl">
                        <Globe className="w-5 h-5 text-purple-600" />
                    </div>

                    <div>
                        <p className="font-medium text-gray-900">

                        </p>
                        <p className="text-sm text-gray-400">

                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 px-6 py-8">
                <div className="flex items-start gap-3 max-w-xl">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mt-2" />

                    <div className="bg-white rounded-2xl shadow px-5 py-4">
                        <p className="font-medium text-gray-900">
                            https://www.mwcbarcelona.com/exhibitors
                        </p>
                        <p className="text-gray-600 mt-1">
                            Posez-moi n'importe quelle question sur cette page !
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-6 pb-6">
                <div className="bg-white rounded-2xl shadow flex items-center p-2">
                    <input
                        type="text"
                        placeholder="Posez une question sur cette page..."
                        className="flex-1 px-4 py-3 outline-none text-gray-600"
                    />

                    <button className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-xl transition">
                        <Send className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-center text-xs text-gray-400 mt-3">
                    L'IA peut faire des erreurs. Vérifiez les informations importantes.
                </p>
            </div>
        </div>
    );
}
