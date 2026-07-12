"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!email || !email.includes("@")) return;
    setSubmitted(true);
  }

  return (
    <div
      className="min-h-screen bg-[#0D0D0F] text-[#E8E8F0] font-sans overflow-x-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap');

        .font-syne { font-family: 'Syne', sans-serif; }

        .accent { color: #7C6AF7; }
        .accent-bg { background-color: #7C6AF7; }

        .mosaic {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          grid-template-rows: repeat(4, 1fr);
          gap: 2px;
          opacity: 0.07;
          filter: blur(1px) saturate(0.6);
          pointer-events: none;
        }

        .mosaic-item {
          background: linear-gradient(135deg, #2a2a3e, #1a1a2a, #3a2a4e, #1e1e2e, #2e2a3e, #1a2a3e);
          border-radius: 2px;
        }

        .mosaic-item:nth-child(odd) { background: linear-gradient(135deg, #3a2a5e, #1a1a2a); }
        .mosaic-item:nth-child(3n) { background: linear-gradient(135deg, #2a3a5e, #0d1a2a); }
        .mosaic-item:nth-child(5n) { background: linear-gradient(135deg, #4a2a4e, #1a0d2a); }

        .glow-ring {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,106,247,0.12) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .feature-card {
          background: #1A1A22;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 28px;
          transition: border-color 0.2s ease;
        }
        .feature-card:hover { border-color: rgba(124,106,247,0.3); }

        .input-field {
          background: #1A1A22;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          color: #E8E8F0;
          padding: 12px 16px;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s ease;
          font-family: 'Inter', sans-serif;
        }
        .input-field::placeholder { color: #5A5A72; }
        .input-field:focus { border-color: rgba(124,106,247,0.6); }

        .btn-primary {
          background: #7C6AF7;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.1s ease;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }
        .btn-primary:hover { background: #8F7FFF; }
        .btn-primary:active { transform: scale(0.98); }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(124,106,247,0.12);
          border: 1px solid rgba(124,106,247,0.25);
          border-radius: 100px;
          padding: 6px 14px;
          font-size: 13px;
          color: #A89BFF;
          letter-spacing: 0.02em;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #7C6AF7;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.06);
          margin: 0;
        }

        .icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(124,106,247,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          font-size: 18px;
        }

        .comparison-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
        }
        .comparison-item + .comparison-item {
          border-top: 1px solid rgba(255,255,255,0.04);
        }

        .check { color: #7C6AF7; font-size: 16px; flex-shrink: 0; margin-top: 2px; }
        .text-muted { color: #5A5A72; }
        .text-secondary { color: #9090A8; }
      `}</style>

      {/* NAV */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="uloggd logo"
            width={32}
            height={32}
            className="rounded-md"
          />
          <span className="font-syne font-700 text-lg tracking-tight text-[#E8E8F0]">
            uloggd
          </span>
        </div>
        <a
          href="https://backloggd.com"
          className="text-sm text-secondary hover:text-[#E8E8F0] transition-colors"
          style={{ textDecoration: "none" }}
        >
          o que é isso? →
        </a>
      </nav>

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-16 pb-32 min-h-[calc(100vh-88px)]">
        {/* Mosaic background */}
        <div className="mosaic">
          {Array.from({ length: 32 }).map((_, i) => (
            <div key={i} className="mosaic-item" />
          ))}
        </div>

        {/* Glow */}
        <div className="glow-ring" />

        <div className="relative z-10 flex flex-col items-center gap-8 max-w-2xl">
          <div className="status-badge">
            <div className="status-dot" />
            em desenvolvimento
          </div>

          <h1
            className="font-syne text-5xl sm:text-6xl md:text-7xl font-800 leading-none tracking-tighter"
            style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
          >
            sua biblioteca
            <br />
            de games,{" "}
            <span className="accent">do jeito certo</span>
          </h1>

          <p
            className="text-lg leading-relaxed max-w-md"
            style={{ color: "#9090A8" }}
          >
            uloggd é tudo que o Backloggd deveria ser — sem as limitações, sem
            a interface travada, sem os bugs que você aprendeu a ignorar.
          </p>

          {/* Waitlist */}
          {submitted ? (
            <div
              className="flex items-center gap-3 px-6 py-4 rounded-xl"
              style={{
                background: "rgba(124,106,247,0.1)",
                border: "1px solid rgba(124,106,247,0.25)",
              }}
            >
              <span style={{ fontSize: "20px" }}>✓</span>
              <div className="text-left">
                <p className="font-medium text-[#A89BFF]">
                  você está na lista
                </p>
                <p className="text-sm text-secondary">
                  a gente avisa quando estiver pronto.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <input
                type="email"
                placeholder="seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="input-field flex-1"
              />
              <button className="btn-primary" onClick={handleSubmit}>
                entrar na lista
              </button>
            </div>
          )}

          <p className="text-xs" style={{ color: "#5A5A72" }}>
            sem spam. sem newsletter. só um aviso quando lançar.
          </p>
        </div>
      </section>

      <hr className="divider" />

      {/* FEATURES */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="mb-14">
          <p className="text-sm font-medium tracking-widest uppercase mb-3" style={{ color: "#5A5A72" }}>
            por que trocar
          </p>
          <h2
            className="font-syne text-3xl md:text-4xl font-700 leading-tight"
            style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}
          >
            tudo que você esperava
            <br />
            de um tracker de games
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="feature-card">
            <div className="icon-wrapper">📚</div>
            <h3 className="font-syne font-700 text-lg mb-2" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
              backlog de verdade
            </h3>
            <p className="text-sm leading-relaxed text-secondary">
              organize jogado, zerado, largado, querendo jogar — com filtros que
              funcionam e edição em massa sem dor.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon-wrapper">⭐</div>
            <h3 className="font-syne font-700 text-lg mb-2" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
              avaliações com contexto
            </h3>
            <p className="text-sm leading-relaxed text-secondary">
              nota, review, quando você jogou, em qual plataforma. tudo no lugar
              certo, sem campos escondidos.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon-wrapper">👥</div>
            <h3 className="font-syne font-700 text-lg mb-2" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
              comunidade que faz sentido
            </h3>
            <p className="text-sm leading-relaxed text-secondary">
              veja o que seus amigos estão jogando, descubra jogos por gente com
              gosto parecido com o seu.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon-wrapper">🎮</div>
            <h3 className="font-syne font-700 text-lg mb-2" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
              catálogo completo
            </h3>
            <p className="text-sm leading-relaxed text-secondary">
              do Atari ao Steam Deck, de RPG a visual novel. não queremos que
              você mude de site pra registrar jogo nenhum.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon-wrapper">📊</div>
            <h3 className="font-syne font-700 text-lg mb-2" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
              seus dados, seu jeito
            </h3>
            <p className="text-sm leading-relaxed text-secondary">
              estatísticas reais do seu histórico. quantas horas, quais gêneros,
              como seu gosto mudou com o tempo.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon-wrapper">⚡</div>
            <h3 className="font-syne font-700 text-lg mb-2" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
              rápido e estável
            </h3>
            <p className="text-sm leading-relaxed text-secondary">
              sem carregamento infinito, sem timeout aleatório, sem "tente
              novamente mais tarde". simplesmente funciona.
            </p>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* COMPARISON */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-sm font-medium tracking-widest uppercase mb-3" style={{ color: "#5A5A72" }}>
              a diferença
            </p>
            <h2
              className="font-syne text-3xl md:text-4xl font-700 leading-tight mb-6"
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}
            >
              o que muda
              <br />
              na prática
            </h2>
            <p className="text-secondary text-sm leading-relaxed">
              o Backloggd tem o conceito certo. a execução é que deixa a
              desejar. uloggd parte daí e reconstrói do zero com o que deveria
              ter sido desde o começo.
            </p>
          </div>

          <div
            className="rounded-xl p-6"
            style={{ background: "#1A1A22", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            {[
              { text: "importar seu backlog do Backloggd com um clique" },
              { text: "interface sem anúncio, sem bloqueio de conta free" },
              { text: "busca que acha o jogo na primeira tentativa" },
              { text: "editar múltiplos jogos ao mesmo tempo" },
              { text: "listas públicas com layout decente" },
              { text: "sem limite de reviews ou entradas por mês" },
            ].map((item, i) => (
              <div key={i} className="comparison-item">
                <span className="check">✦</span>
                <p className="text-sm leading-relaxed" style={{ color: "#C8C8D8" }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* BOTTOM CTA */}
      <section className="flex flex-col items-center text-center px-6 py-24 gap-8">
        <div
          className="inline-block px-4 py-2 rounded-full text-xs font-medium tracking-widest uppercase"
          style={{
            background: "rgba(124,106,247,0.1)",
            border: "1px solid rgba(124,106,247,0.2)",
            color: "#A89BFF",
          }}
        >
          chegando em breve
        </div>

        <h2
          className="font-syne text-4xl md:text-5xl font-800 leading-tight max-w-lg"
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
        >
          seja o primeiro a saber quando abrir
        </h2>

        <p className="text-secondary max-w-sm leading-relaxed">
          a lista é pequena de propósito. quando estiver pronto, você vai ser um
          dos primeiros a entrar.
        </p>

        {submitted ? (
          <div
            className="flex items-center gap-3 px-6 py-4 rounded-xl"
            style={{
              background: "rgba(124,106,247,0.1)",
              border: "1px solid rgba(124,106,247,0.25)",
            }}
          >
            <span style={{ fontSize: "20px" }}>✓</span>
            <p className="font-medium" style={{ color: "#A89BFF" }}>
              você está na lista — a gente avisa quando estiver pronto.
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <input
              type="email"
              placeholder="seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="input-field flex-1"
            />
            <button className="btn-primary" onClick={handleSubmit}>
              entrar
            </button>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.jpg"
              alt="uloggd"
              width={20}
              height={20}
              className="rounded"
            />
            <span className="text-sm font-syne font-600" style={{ fontFamily: "'Syne', sans-serif", color: "#5A5A72" }}>
              uloggd
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
