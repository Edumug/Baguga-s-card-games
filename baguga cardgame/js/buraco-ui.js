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

    function posicionarSequencias() {
        if (!seqPropria) return;

        // O primeiro jogador que baixar define o lado das sequências.
        // A posição é relativa à mesa, considerando a ordem dos jogadores:
        // 0 = baixo, 1 = esquerda, 2 = cima, 3 = direita.
        const ids = estadoAtual?.ids || Object.keys(jogadores);
        const primeiro = estadoAtual?.primeiroBaixador;
        const indice = ids.indexOf(primeiro);

        seqPropria.style.left = "auto";
        seqPropria.style.right = "auto";
        seqPropria.style.top = "38px";
        seqPropria.style.bottom = "38px";
        seqPropria.style.transform = "none";

        if (indice === 0) {
            // Jogador de baixo: a direita dele é o lado esquerdo da tela.
            seqPropria.style.left = "-270px";
        } else if (indice === 2) {
            // Jogador de cima: a direita dele é o lado direito da tela.
            seqPropria.style.right = "-270px";
        } else if (indice === 1) {
            // Jogador da esquerda: a direita dele fica acima da mesa.
            seqPropria.style.top = "-190px";
            seqPropria.style.bottom = "auto";
            seqPropria.style.left = "50%";
            seqPropria.style.transform = "translateX(-50%)";
            seqPropria.style.width = "min(520px, 48vw)";
            seqPropria.style.height = "150px";
        } else if (indice === 3) {
            // Jogador da direita: a direita dele fica abaixo da mesa.
            seqPropria.style.top = "auto";
            seqPropria.style.bottom = "-190px";
            seqPropria.style.left = "50%";
            seqPropria.style.transform = "translateX(-50%)";
            seqPropria.style.width = "min(520px, 48vw)";
            seqPropria.style.height = "150px";
        } else {
            // Compatibilidade com salas antigas sem primeiroBaixador.
            seqPropria.style.left = "-270px";
        }

        seqPropria.style.borderLeft = "2px solid #2563eb";
        seqPropria.style.borderRight = "1px solid #ddd";
    }

    function renderSequencias() {
        if (!estadoAtual || estadoAtual.tipo !== "buraco" || !seqPropria) return;

        // Todas as sequências ficam juntas no lado definido pelo primeiro jogador.
        seqPropria.innerHTML = "";
        if (seqAdversario) {
            seqAdversario.innerHTML = "";
            seqAdversario.style.display = "none";
        }
        seqPropria.style.display = "flex";
        posicionarSequencias();

        const ids = estadoAtual.ids || Object.keys(jogadores);
        const ordem = Array.isArray(estadoAtual.ordemBaixadas) ? estadoAtual.ordemBaixadas : [];

        // Estados antigos não possuem ordemBaixadas: montamos uma ordem de compatibilidade.
        const itens = ordem.length
            ? ordem
            : Object.entries(estadoAtual.baixadas || {}).flatMap(([dupla, lista]) =>
                (Array.isArray(lista) ? lista : []).map((_, grupo) => ({ dupla, grupo }))
            );

        itens.forEach((item, ordemIndex) => {
            const dupla = typeof item.dupla === "string"
                ? Number(item.dupla.replace("dupla_", ""))
                : Number(item.dupla);
            const grupoIndice = Number(item.grupo);
            const lista = estadoAtual.baixadas?.[`dupla_${dupla}`] || [];
            const grupo = lista[grupoIndice];
            if (!Array.isArray(grupo) || !grupo.length) return;

            const propria = dupla === duplaDe(ids, jogadorId);
            const section = document.createElement("div");
            section.className = `sequencia-grupo ${propria ? "sequencia-propria" : "sequencia-adversaria"}`;
            section.style.border = propria ? "2px solid #2563eb" : "2px solid #ef4444";
            section.style.background = propria ? "#eff6ff" : "#fef2f2";
            section.style.borderRadius = "8px";

            const titulo = document.createElement("div");
            titulo.className = "sequencia-titulo";
            titulo.style.color = propria ? "#2563eb" : "#dc2626";
            titulo.textContent = propria
                ? `Sequência da sua dupla`
                : `Sequência da dupla adversária`;
            section.appendChild(titulo);

            const jogo = document.createElement("div");
            jogo.className = `jogo-baixado ${propria ? "jogo-proprio" : ""}`;
            jogo.style.border = propria ? "1px solid #60a5fa" : "1px solid #f87171";
            jogo.dataset.ordem = ordemIndex;

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
            seqPropria.appendChild(section);
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
