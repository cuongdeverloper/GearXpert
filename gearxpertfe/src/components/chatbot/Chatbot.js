import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "../../service/AxiosCustomize";
import { useNavigate } from "react-router-dom";
import aiLogo from "../../assets/logoXpertUnname_xoavien.png";

/* ───────── helpers (unchanged logic) ───────── */

const formatPrice = (pricePerDay) => {
  if (pricePerDay === null || pricePerDay === undefined) return "Liên hệ";
  const n = Number(pricePerDay);
  if (Number.isNaN(n)) return "Liên hệ";
  return `${n.toLocaleString()}đ/ngày`;
};

/** Parse inline markdown: **bold**, *italic*, [link](url) */
const parseInlineMarkdown = (text, onNavigate, keyPrefix = "") => {
  const tokens = [];
  // Combined regex: **bold** | *italic* | [label](url)
  const re = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIdx = 0;
  let match;

  while ((match = re.exec(text)) !== null) {
    const start = match.index;
    if (start > lastIdx) {
      tokens.push(<span key={`${keyPrefix}t-${lastIdx}`}>{text.slice(lastIdx, start)}</span>);
    }

    if (match[1]) {
      // **bold**
      tokens.push(<strong key={`${keyPrefix}b-${start}`} className="font-bold text-slate-800">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      tokens.push(<em key={`${keyPrefix}i-${start}`} className="italic">{match[4]}</em>);
    } else if (match[5]) {
      // [label](url)
      const label = match[6];
      const href = String(match[7] || "").trim();
      const isInternal = href.startsWith("/") && !href.startsWith("//");
      tokens.push(
        <a
          key={`${keyPrefix}l-${start}`}
          href={href}
          title={href}
          {...(isInternal
            ? {
                onClick: (e) => {
                  e.preventDefault();
                  onNavigate(href);
                },
              }
            : { target: "_blank", rel: "noopener noreferrer" })}
          className="text-primary font-bold underline underline-offset-2 decoration-primary/40 hover:text-indigo-700 hover:decoration-indigo-700 transition-colors"
        >
          {label || href}
        </a>
      );
    }

    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    tokens.push(<span key={`${keyPrefix}t-${lastIdx}`}>{text.slice(lastIdx)}</span>);
  }

  return tokens.length > 0 ? tokens : text;
};

/** Render full markdown text: line-by-line with list support + inline formatting */
const renderTextWithLinks = (text, onNavigate) => {
  const s = String(text ?? "");
  const lines = s.split("\n");
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-1.5 pl-1">
          {listItems.map((item, i) => (
            <li key={i} className="text-slate-700 leading-relaxed">{item}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // List items: - text or * text or • text or 1) text or 1. text
    const listMatch = trimmed.match(/^(?:[-*•]|\d+[).])\s+(.+)/);
    if (listMatch) {
      listItems.push(parseInlineMarkdown(listMatch[1], onNavigate, `li-${idx}-`));
      return;
    }

    // Non-list line — flush any pending list first
    flushList();

    if (trimmed === "") {
      elements.push(<br key={`br-${idx}`} />);
    } else {
      elements.push(
        <span key={`p-${idx}`} className="block">
          {parseInlineMarkdown(trimmed, onNavigate, `ln-${idx}-`)}
        </span>
      );
    }
  });

  // Flush remaining list items
  flushList();

  return elements;
};

/* ───────── main component ───────── */

const Chatbot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Xin chào! 👋 Tôi là AI GearXpert. Bạn cần tư vấn gear gì hôm nay?",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const canSend = useMemo(() => !isLoading && !!input.trim(), [input, isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const sendMessage = useCallback(
    async (text) => {
      const clean = String(text || "").trim();
      if (!clean || isLoading) return;

      const userMessage = { role: "user", text: clean, ts: Date.now() };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const response = await axios.post("/api/ai-chat", {
          message: userMessage.text,
        });

        if (response?.success) {
          setMessages((prev) => [
            ...prev,
            {
              role: "bot",
              text: response.reply,
              recommendations: Array.isArray(response.recommendations)
                ? response.recommendations
                : [],
              ts: Date.now(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "bot",
              text: "Mình chưa xử lý được yêu cầu này. Bạn thử lại giúp mình nhé.",
              ts: Date.now(),
            },
          ]);
        }
      } catch (error) {
        console.error(error);
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: "Lỗi kết nối Server! Vui lòng kiểm tra lại Backend. 😭",
            ts: Date.now(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  // When user searches on ProductsPage, open and auto-send to AI
  useEffect(() => {
    const handler = (e) => {
      const query = e?.detail?.query;
      const q = String(query || "").trim();
      if (!q) return;

      setIsOpen(true);
      sendMessage(`Tìm sản phẩm: ${q}`);
    };

    window.addEventListener("gearxpert:product-search", handler);
    return () => window.removeEventListener("gearxpert:product-search", handler);
  }, [sendMessage]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage(input);
  };

  /* ───────── render ───────── */

  return (
    <div className="fixed bottom-5 right-5 z-[9999] font-sans">

      {/* ── Floating Action Button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 text-white shadow-xl shadow-indigo-500/20 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-300 flex items-center justify-center overflow-hidden animate-bounce"
        >
          {/* Animated glow ring */}
          <span className="absolute inset-0 rounded-2xl ring-2 ring-indigo-400/30 group-hover:ring-primary/50 transition-all" />
          <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          <img src={aiLogo} alt="AI" className="w-10 h-10 object-contain relative z-10 group-hover:scale-110 transition-transform" />
          
          {/* Pulse indicator */}
          <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 z-20">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
          </span>
        </button>
      )}

      {/* ── Chat Window ── */}
      {isOpen && (
        <div 
          className="w-[360px] sm:w-[400px] h-[560px] rounded-[24px] shadow-2xl shadow-slate-900/30 flex flex-col overflow-hidden border border-slate-200/80 bg-white"
          style={{ 
            animation: 'chatSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {/* ── Header ── */}
          <div className="relative px-5 py-4 flex justify-between items-center bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-8 -right-8 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-cyan-400/15 rounded-full blur-xl" />
            
            <div className="relative z-10 flex items-center gap-3">
              {/* AI Avatar */}
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-lg p-1">
                <img src={aiLogo} alt="AI" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-white text-[15px] tracking-tight font-display">GearXpert AI</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full shadow-sm shadow-emerald-400/50">
                    <span className="block w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-40" />
                  </span>
                  <span className="text-[11px] text-white/60 font-medium">Trực tuyến</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsOpen(false)} 
              className="relative z-10 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors group"
            >
              <span className="material-symbols-outlined text-white/70 group-hover:text-white text-[20px] transition-colors">close</span>
            </button>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white space-y-3 custom-scrollbar">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                  
                  {/* Bot avatar + bubble */}
                  {msg.role === "bot" && (
                    <div className="flex items-end gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm p-0.5 border border-slate-100">
                        <img src={aiLogo} alt="AI" className="w-full h-full object-contain" />
                      </div>
                      <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-md px-4 py-3 text-[13px] leading-relaxed text-slate-700 shadow-sm whitespace-pre-wrap">
                        {renderTextWithLinks(msg.text, navigate)}
                      </div>
                    </div>
                  )}

                  {/* User bubble */}
                  {msg.role === "user" && (
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-2xl rounded-br-md px-4 py-3 text-[13px] leading-relaxed shadow-md shadow-indigo-500/20 whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  )}

                  {/* ── Product Recommendations ── */}
                  {msg.role === "bot" &&
                    Array.isArray(msg.recommendations) &&
                    msg.recommendations.length > 0 && (
                      <div className="ml-9 space-y-2 w-full">
                        {msg.recommendations.slice(0, 5).map((r) => (
                          <div
                            key={r.id}
                            className="group bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200/60 transition-all duration-300"
                          >
                            <div className="flex gap-3 p-3">
                              {/* Product Image */}
                              <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 ring-1 ring-slate-200/60">
                                {r.image ? (
                                  <img
                                    src={r.image}
                                    alt={r.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-300 text-[24px]">devices</span>
                                  </div>
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-800 text-[13px] truncate leading-tight">
                                  {r.name}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                                  <span className="text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
                                    {formatPrice(r.pricePerDay)}
                                  </span>
                                  {typeof r.availableQuantity === "number" && (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      Còn {r.availableQuantity}
                                    </span>
                                  )}
                                </div>
                                {r.seller?.name && (
                                  <div className="text-[11px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">storefront</span>
                                    {r.seller.name}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="px-3 pb-3 flex gap-2">
                              <button
                                onClick={() => navigate(r.deviceUrl)}
                                className="flex-1 text-[11px] font-bold px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                Xem sản phẩm
                              </button>
                              {r.seller?.url ? (
                                <button
                                  onClick={() => navigate(r.seller.url)}
                                  className="flex-1 text-[11px] font-bold px-3 py-2 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[14px]">storefront</span>
                                  Nhà cung cấp
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="flex-1 text-[11px] font-bold px-3 py-2 rounded-xl bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed"
                                >
                                  Nhà cung cấp
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}
            
            {/* Loading effect */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm p-0.5 border border-slate-100">
                    <img src={aiLogo} alt="AI" className="w-full h-full object-contain animate-pulse" />
                  </div>
                  <div className="bg-white border border-slate-200/80 px-5 py-3 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Quick suggestions (only when few messages) ── */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {["Gợi ý camera", "Thiết bị ánh sáng", "Gimbal quay phim"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* ── Footer Input ── */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
            <div className="flex-1 bg-slate-100/80 rounded-2xl flex items-center px-4 py-2.5 min-h-[44px] focus-within:ring-2 focus-within:ring-indigo-300/50 focus-within:bg-white focus-within:border-slate-200 border border-transparent transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Hỏi về thiết bị, giá thuê..."
                className="w-full bg-transparent text-sm focus:outline-none text-slate-700 placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!canSend}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Animation keyframes ── */}
      <style>{`
        @keyframes chatSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default Chatbot;