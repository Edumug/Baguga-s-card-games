import { database } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const params = new URLSearchParams(location.search);
const codigo = params.get("codigo");
const jogadorId = sessionStorage.getItem("jogadorId");

if (codigo && jogadorId) {
    const salaRef = ref(database, `salas/${codigo}`);

    const estilo = document.createElement("style");
    estilo.textContent = `
        .cartas-outro-jogador { position:absolute; display:flex; align-items:center; justify-content:center; z-index:7; pointer-events:none; }
        .cartas-outro-jogador .carta { width:38px!important; height:55px!important; min-width:38px; font-size:0!important; border-radius:5px; margin-left:-22px; background:#111; color:transparent; border:1px solid #000; background-image:repeating-linear-gradient(45deg,#111 0,#111 6px,#292929 6px,#292929 12px); box-shadow:0 2px 5px rgba(0,0,0,.18); }
        .cartas-outro-jogador .carta:first-child { margin-left:0; }
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
        const maos = sala?.estado?.maos || {};

        slots.forEach(slotId => {
            const jogador = document.getElementById(slotId);
            const id = jogador?.dataset.jogadorId;
            if (!jogador || !id || id === jogadorId) return;

            const quantidade = Array.isArray(maos[id]) ? maos[id].length : 0;
            if (!quantidade) return;

            const container = document.createElement("div");
            container.className = "cartas-outro-jogador";
            container.title = `${quantidade} carta${quantidade === 1 ? "" : "s"}`;

            for (let i = 0; i < quantidade; i++) {
                const carta = document.createElement("div");
                carta.className = "carta oculta";
                container.appendChild(carta);
            }
            jogador.appendChild(container);
        });
    }

    onValue(salaRef, snap => {
        if (snap.exists()) desenhar(snap.val());
    });
}
