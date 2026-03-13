import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "../../service/AxiosCustomize";
import { useNavigate } from "react-router-dom";

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.159 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

const formatPrice = (pricePerDay) => {
  if (pricePerDay === null || pricePerDay === undefined) return "Liên hệ";
  const n = Number(pricePerDay);
  if (Number.isNaN(n)) return "Liên hệ";
  return `${n.toLocaleString()}đ/ngày`;
};

const renderTextWithLinks = (text, onNavigate) => {
  const s = String(text ?? "");
  const nodes = [];
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;

  let lastIdx = 0;
  let match;
  while ((match = linkRe.exec(s)) !== null) {
    const [full, label, hrefRaw] = match;
    const start = match.index;
    const end = start + full.length;

    if (start > lastIdx) {
      nodes.push(s.slice(lastIdx, start));
    }

    const href = String(hrefRaw || "").trim();
    const isInternal = href.startsWith("/") && !href.startsWith("//");

    if (isInternal) {
      nodes.push(
        <a
          key={`l-${start}`}
          href={href}
          title={href}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(href);
          }}
          className="text-blue-700 font-bold underline underline-offset-2 hover:text-blue-800"
        >
          {label || href}
        </a>
      );
    } else {
      nodes.push(
        <a
          key={`l-${start}`}
          href={href}
          title={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 font-bold underline underline-offset-2 hover:text-blue-800"
        >
          {label || href}
        </a>
      );
    }

    lastIdx = end;
  }

  if (lastIdx < s.length) {
    nodes.push(s.slice(lastIdx));
  }

  return nodes;
};

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

  return (
    <div className="fixed bottom-5 right-5 z-[9999] font-sans">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center animate-bounce"
        >
          <ChatIcon />
        </button>
      )}

      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 flex justify-between items-center text-white shadow-md">
            <div>
              <h3 className="font-bold text-lg">GearXpert AI</h3>
              <div className="flex items-center gap-1 text-xs opacity-90">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Online
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded">
              <CloseIcon />
            </button>
          </div>

          {/* Body List tin nhắn */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-3">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[88%] space-y-2">
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                    }`}
                  >
                    {renderTextWithLinks(msg.text, navigate)}
                  </div>

                  {msg.role === "bot" &&
                    Array.isArray(msg.recommendations) &&
                    msg.recommendations.length > 0 && (
                      <div className="grid grid-cols-1 gap-2">
                        {msg.recommendations.slice(0, 5).map((r) => (
                          <div
                            key={r.id}
                            className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex gap-3 p-3">
                              <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                                {r.image ? (
                                  <img
                                    src={r.image}
                                    alt={r.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                                    Gear
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-gray-900 text-sm truncate">
                                  {r.name}
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5 flex flex-wrap gap-x-2 gap-y-1">
                                  <span className="font-semibold text-blue-600">
                                    {formatPrice(r.pricePerDay)}
                                  </span>
                                  {typeof r.availableQuantity === "number" && (
                                    <span className="text-gray-500">
                                      Còn {r.availableQuantity}
                                    </span>
                                  )}
                                  {r.city && (
                                    <span className="text-gray-500">
                                      {r.city}
                                    </span>
                                  )}
                                </div>
                                {r.seller?.name && (
                                  <div className="text-[11px] text-gray-500 mt-1 truncate">
                                    Người bán:{" "}
                                    <span className="font-semibold text-gray-700">
                                      {r.seller.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="px-3 pb-3 flex gap-2">
                              <button
                                onClick={() => navigate(r.deviceUrl)}
                                className="flex-1 text-xs font-bold px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                              >
                                Xem sản phẩm
                              </button>
                              {r.seller?.url ? (
                                <button
                                  onClick={() => navigate(r.seller.url)}
                                  className="flex-1 text-xs font-bold px-3 py-2 rounded-xl bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                  Xem người bán
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="flex-1 text-xs font-bold px-3 py-2 rounded-xl bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                >
                                  Người bán
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
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Nhập câu hỏi..."
              className="flex-1 bg-gray-100 border-none outline-none px-4 py-2 rounded-full text-sm focus:ring-2 focus:ring-blue-300 transition-all"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!canSend}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full disabled:bg-gray-400 transition-colors"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
