import { database } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import * as Buraco from "./jogos/buraco.js";

const params = new URLSearchParams(location.search);
const codigo = params.get("codigo");
const jogadorId = sessionStorage.getItem("jogadorId");

if (codigo && jogadorId) {
    const salaRef = ref(database, `salas/${codigo}`);
    const mao = document.getElementById("minhasCartas");
    const btnBaixar = document.getElementById("btnBaixar");
    let estadoAtual = null;

    if (mao && btnBaixar) {
        onValue(salaRef, snap => {
            const sala = snap.val();
            estadoAtual = sala?.estado || null;
            const ativo = sala?.jogo === "buraco" && estadoAtual?.atual === jogadorId && estadoAtual?.etapa === "descartar" && !estadoAtual?.fim;
            btnBaixar.classList.toggle("escondido", !ativo);
            btnBaixar.disabled = !ativo;
        });

        function indicesSelecionados() {
            return [...mao.children]
                .map((el, index) => el.classList.contains("selecionada") ? index : -1)
                .filter(index => index >= 0);
        }

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
