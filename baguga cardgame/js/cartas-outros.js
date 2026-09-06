import { database } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { elementoCarta } from "./jogo-base.js";

const params = new URLSearchParams(location.search);
const codigo = params.get("codigo");
const jogadorId = sessionStorage.getItem("jogadorId");

if (codigo && jogadorId) {
    const salaRef = ref(database, `salas/${codigo}`);

    const estilo = document.createElement("style");
    estilo.textContent = `
        .cartas-outro-jogador { position:absolute; display:flex; align-items:center; justify-content:center; z-index:7; pointer-events:none; }
        .cartas-outro-jogador .carta { width:38px!important; height:55px!important; min-width:38px; border-radius:5px; margin-left:-22px; box-shadow:0 2px 5px rgba(0,0,0,.18); }
        .cartas-outro-jogador .carta:first-child { margin-left:0; }
        .cartas-outro-jogador.cartas-escondidas .carta { font-size:0!important; background:#111; color:transparent; border:1px solid #000; background-image:repeating-linear-gradient(45deg,#111 0,#111 6px,#292929 6px,#292929 12px); }
        .jogador-superior .cartas-outro-jogador { left:50%; top:calc(100% + 5px); transform:translateX(-50%); }
        .jogador-esquerda .cartas-outro-jogador { left:calc(100% + 5px); top:50%; transform:translateY(-50%); }
        .jogador-direita .cartas-outro-jogador { right:calc(100% + 5px); top:50%; transform:translateY(-50%); }
        .jogador-esquerda .cartas-outro-jogador .carta,
        .jogador-direita .cartas-outro-jogador .carta { margin-left:-27px; }
    `;
    document.head.appendChild(estilo);

    const slots = ["jogadorSuperior", "jogadorEsquerda", "jogadorDireita"];

    function desenhar(sala) {
        document.querySelectorAll(".cartas-outro-jogador").forEach(el => el.remove());
        const estado = sala?.estado;
        const maos = estado?.maos || {};
        const blackjack = sala?.jogo === "blackjack";

        slots.forEach(slotId => {
            const jogador = document.getElementById(slotId);
            const id = jogador?.dataset.jogadorId;
            if (!jogador || !id || id === jogadorId) return;

            const mao = Array.isArray(maos[id]) ? maos[id] : [];
            if (!mao.length) return;

            const container = document.createElement("div");
            container.className = `cartas-outro-jogador ${blackjack ? "cartas-visiveis" : "cartas-escondidas"}`;
            container.title = `${mao.length} carta${mao.length === 1 ? "" : "s"}`;

            mao.forEach(cartaDados => {
                if (blackjack) {
                    container.appendChild(elementoCarta(cartaDados));
                } else {
                    const carta = document.createElement("div");
                    carta.className = "carta oculta";
                    container.appendChild(carta);
                }
            });

            jogador.appendChild(container);
        });
    }

    onValue(salaRef, snap => {
        if (snap.exists()) desenhar(snap.val());
    });
}
