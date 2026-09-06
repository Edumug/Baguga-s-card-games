import { database } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import * as Buraco from "./jogos/buraco.js";
import { elementoCarta } from "./jogo-base.js";

const params = new URLSearchParams(location.search);
const codigo = params.get("codigo");
const jogadorId = sessionStorage.getItem("jogadorId");

if (codigo && jogadorId) {
    const salaRef = ref(database, `salas/${codigo}`);
    const mao = document.getElementById("minhasCartas");
    const btnBaixar = document.getElementById("btnBaixar");
    const seqAdversario = document.getElementById("sequenciasAdversario");
    const seqPropria = document.getElementById("sequenciasPropria");
    const placar = document.getElementById("listaPlacar");
    let estadoAtual = null;
    let jogadores = {};

    function duplaDe(ids, id) {
        const indice = ids.indexOf(id);
        if (indice < 0) return null;
        return ids.length === 4 ? indice % 2 : indice;
    }

    function nomesDaDupla(ids, dupla) {
        return ids.filter(id => duplaDe(ids, id) === dupla).map(id => jogadores[id]?.nome || "Jogador").join(" e ");
    }

    function indicesSelecionados() {
        if (!mao) return [];
        return [...mao.children].map((el, index) => el.classList.contains("selecionada") ? index : -1).filter(index => index >= 0);
    }

    function renderSequencias() {
        if (!estadoAtual || estadoAtual.tipo !== "buraco" || !seqAdversario || !seqPropria) return;
        seqAdversario.innerHTML = "";
        seqPropria.innerHTML = "";

        /* No Buraco de 4 jogadores, a sua dupla fica sempre à DIREITA
           da mesa (lado esquerdo da dupla adversária). */
        seqPropria.style.right = "-270px";
        seqPropria.style.left = "auto";
        seqAdversario.style.left = "-270px";
        seqAdversario.style.right = "auto";

        const ids = estadoAtual.ids || Object.keys(jogadores);
        const minhaDupla = duplaDe(ids, jogadorId);

        Object.entries(estadoAtual.baixadas || {}).forEach(([chave, lista]) => {
            const dupla = Number(chave.replace("dupla_", ""));
            const propria = dupla === minhaDupla;
            const alvo = propria ? seqPropria : seqAdversario;
            if (!Array.isArray(lista) || !lista.length) return;

            const section = document.createElement("div");
            section.className = `sequencia-grupo ${propria ? "sequencia-propria" : "sequencia-adversaria"}`;

            /* Azul = sua dupla | Vermelho = dupla adversária */
            section.style.border = propria ? "2px solid #2563eb" : "2px solid #ef4444";
            section.style.background = propria ? "#eff6ff" : "#fef2f2";
            section.style.borderRadius = "8px";

            const titulo = document.createElement("div");
            titulo.className = "sequencia-titulo";
            titulo.style.color = propria ? "#2563eb" : "#dc2626";
            titulo.textContent = propria
                ? `Sua dupla${ids.length === 4 ? " — suas sequências" : ""}`
                : `Dupla adversária — ${nomesDaDupla(ids, dupla) || `Dupla ${dupla + 1}`}`;
            section.appendChild(titulo);

            lista.forEach((grupo, grupoIndice) => {
                const jogo = document.createElement("div");
                jogo.className = `jogo-baixado ${propria ? "jogo-proprio" : ""}`;
                jogo.style.border = propria ? "1px solid #60a5fa" : "1px solid #f87171";

                if (propria) {
                    jogo.title = "Clique para encaixar as cartas selecionadas";
                    jogo.addEventListener("click", evento => {
                        evento.stopPropagation();
                        const indices = indicesSelecionados();
                        if (estadoAtual.atual !== jogadorId || estadoAtual.etapa !== "descartar" || !indices.length) return;
                        Buraco.acoesBuraco(salaRef, jogadorId).encaixar(grupoIndice, indices);
                    });
                }

                grupo.forEach(carta => jogo.appendChild(elementoCarta(carta)));
                section.appendChild(jogo);
            });

            alvo.appendChild(section);
        });
    }

    if (mao && btnBaixar) {
        onValue(salaRef, snap => {
            const sala = snap.val();
            estadoAtual = sala?.estado || null;
            jogadores = sala?.jogadores || {};

            const ativo = sala?.jogo === "buraco" && estadoAtual?.atual === jogadorId && estadoAtual?.etapa === "descartar" && !estadoAtual?.fim;
            btnBaixar.classList.toggle("escondido", !ativo);
            btnBaixar.disabled = !ativo;

            if (sala?.jogo === "buraco") {
                requestAnimationFrame(() => {
                    renderSequencias();
                    if (placar) {
                        const ids = estadoAtual?.ids || Object.keys(jogadores);
                        const quantidadeDuplas = ids.length === 4 ? 2 : ids.length;
                        placar.innerHTML = Array.from({ length: quantidadeDuplas }, (_, dupla) => {
                            const pontos = estadoAtual?.pontos?.[`dupla_${dupla}`] || 0;
                            return `<div class="placar-jogador"><span>${nomesDaDupla(ids, dupla) || `Dupla ${dupla + 1}`}</span><strong>${pontos}</strong></div>`;
                        }).join("");
                    }
                });
            }
        });

        btnBaixar.addEventListener("click", () => {
            if (!estadoAtual || estadoAtual.tipo !== "buraco") return;
            const indices = indicesSelecionados();
            if (indices.length < 3) {
                window.alert("Selecione pelo menos 3 cartas para baixar.");
                return;
            }
            Buraco.acoesBuraco(salaRef, jogadorId).baixar(indices);
        });
    }
}
