"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Globe, Send } from "lucide-react";

const envApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = (envApiBaseUrl || "http://localhost:3001").replace(/\/api\/(scrape|chat|sessions|exhibitors|chat\/history)?$/, "").replace(/\/+$/, "");

export default function ChatPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams?.get("session_id");
    const sourceUrl = searchParams?.get("url");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [sessionInfo, setSessionInfo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const fetchSessionAndHistory = async () => {
        if (!sessionId) return;

        setLoading(true);
        setError("");

        try {
            const [sessionRes, historyRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/sessions/${encodeURIComponent(sessionId)}`),
                fetch(`${API_BASE_URL}/api/chat/history/${encodeURIComponent(sessionId)}`),
            ]);

            if (!sessionRes.ok) {
                const err = await sessionRes.json();
                throw new Error(err.error || "Session introuvable");
            }

            const sessionData = await sessionRes.json();
            const historyData = await historyRes.json();

            setSessionInfo(sessionData);
            setMessages(historyData.messages || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessionAndHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    const handleSend = async () => {
        if (!message.trim()) return;
        if (!sessionId) {
            setError("Session introuvable. Retournez à l'accueil.");
            return;
        }

        setSending(true);
        setError("");

        const userMsg = { role: 'user', content: message.trim(), created_at: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);

        try {
            const res = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, message: message.trim() }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de l\'envoi du message');
            }

            const botMsg = { role: 'assistant', content: data.response, created_at: new Date().toISOString() };
            setMessages(prev => [...prev, botMsg]);
            setMessage("");
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    if (!sessionId) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
                <div className="max-w-lg bg-white rounded-2xl shadow p-6 text-center">
                    <p className="text-gray-800 mb-4">Aucune session sélectionnée.</p>
                    <button
                        onClick={() => router.push("/")}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
                    >
                        Retour à l&apos;accueil
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <div className="flex items-center gap-4 px-6 py-4 border-b bg-white">
                <button onClick={() => router.push("/")}>
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-xl">
                        <Globe className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">Session : {sessionId}</p>
                        <p className="text-sm text-gray-400">URL : {sourceUrl || sessionInfo?.url || 'Non fournie'}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 px-6 py-4 overflow-auto">
                {loading ? (
                    <p className="text-gray-500">Chargement des données...</p>
                ) : error ? (
                    <p className="text-red-600">{error}</p>
                ) : (
                    <>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600">
                                Statut de session : <strong>{sessionInfo?.status || 'indisponible'}</strong>
                            </p>
                            <p className="text-sm text-gray-600">
                                Exposants : <strong>{sessionInfo?.exhibitors_count ?? '—'}</strong>
                            </p>
                        </div>

                        <div className="space-y-3">
                            {messages.length === 0 ? (
                                <p className="text-gray-500">Aucun message, commencez par une question.</p>
                            ) : (
                                messages.map((item, index) => (
                                    <div
                                        key={index}
                                        className={`p-3 rounded-xl ${item.role === 'user' ? 'bg-purple-50 self-end text-right' : 'bg-white'} `}
                                    >
                                        <p className="text-sm text-gray-800">{item.content}</p>
                                        <p className="text-xs text-gray-400 mt-1">{item.role}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="px-6 pb-6 bg-white">
                <div className="bg-gray-50 rounded-2xl shadow-sm flex items-center p-2 gap-2">
                    <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        type="text"
                        placeholder="Posez une question sur cette page..."
                        className="flex-1 px-4 py-3 outline-none text-gray-600 bg-transparent"
                    />
                    <button
                        onClick={handleSend}
                        disabled={sending || !message.trim()}
                        className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-center text-xs text-gray-400 mt-3">
                    L&apos;IA peut faire des erreurs. Vérifiez les informations importantes.
                </p>
            </div>
        </div>
    );
}
