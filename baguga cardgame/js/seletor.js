import { database } from "./firebase-config.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const params = new URLSearchParams(window.location.search);
const codigo = params.get("codigo");
const jogadorId = sessionStorage.getItem("jogadorId");

if (!codigo || !jogadorId) {
    window.location.href = "index.html";
    throw new Error("Dados ausentes.");
}

const salaRef = ref(database, `salas/${codigo}`);
const codigoSala = document.getElementById("codigoSala");
const cards = document.querySelectorAll(".jogo-card");
const variacao = document.getElementById("seletorVariacao");
const mensagem = document.getElementById("mensagem");
const btnConfirmar = document.getElementById("btnConfirmar");
const btnVoltar = document.getElementById("btnVoltar");

codigoSala.textContent = codigo;

const variacoes = {
    truco: [["padrao", "Truco Padrão"], ["paulista", "Truco Paulista"], ["mineiro", "Truco Mineiro"]],
    blackjack: [["padrao", "Blackjack Clássico"]],
    pife: [["padrao", "Pife Tradicional"]],
    buraco: [["aberto", "Buraco Aberto"], ["fechado", "Buraco Fechado"], ["stbl", "Buraco Fechado STBL"]],
    poker: [["texas", "Texas Hold'em"]]
};

let jogoSelecionado = null;

function atualizarVariacoes() {
    variacao.innerHTML = "";
    const lista = variacoes[jogoSelecionado] || [];
    lista.forEach(([valor, texto]) => {
        const option = document.createElement("option");
        option.value = valor;
        option.textContent = texto;
        variacao.appendChild(option);
    });
}

cards.forEach(card => {
    card.addEventListener("click", () => {
        cards.forEach(outro => outro.classList.remove("selecionado"));
        card.classList.add("selecionado");
        jogoSelecionado = card.dataset.jogo;
        atualizarVariacoes();
        btnConfirmar.disabled = false;
    });
});

btnConfirmar.addEventListener("click", async () => {
    if (!jogoSelecionado) return;

    btnConfirmar.disabled = true;
    mensagem.textContent = "Iniciando partida...";

    try {
        const snapshot = await get(salaRef);
        if (!snapshot.exists()) {
            mensagem.textContent = "Sala não encontrada.";
            return;
        }

        const sala = snapshot.val();
        sala.jogadores ??= {};

        // Garante que o jogador existe
        if (!sala.jogadores[jogadorId]) {
            const ordens = Object.values(sala.jogadores).map(j => j.ordem || 0);
            const jogadorRestaurado = {
                nome: sessionStorage.getItem("nomeJogador") || "Jogador",
                tipo: "humano",
                dono: sala.dono === jogadorId,
                pontos: 0,
                ordem: sala.dono === jogadorId ? 0 : Math.max(...ordens, 0) + 1
            };
            await update(ref(database, `salas/${codigo}/jogadores/${jogadorId}`), jogadorRestaurado);
            sala.jogadores[jogadorId] = jogadorRestaurado;
        }

        const jogador = sala.jogadores[jogadorId];
        const souDono = jogador?.dono === true || sala.dono === jogadorId;

        if (!souDono) {
            mensagem.textContent = "Somente o dono pode iniciar.";
            btnConfirmar.disabled = false;
            return;
        }

        const quantidade = Object.keys(sala.jogadores || {}).length;
        const limites = {
            truco: [4, 4],
            buraco: [2, 4],
            poker: [2, 8],
            blackjack: [1, 7],
            pife: [2, 4]
        };
        const [minimo, maximo] = limites[jogoSelecionado] || [2, 4];

        if (quantidade < minimo || quantidade > maximo) {
            mensagem.textContent = `${jogoSelecionado === "blackjack" ? "Blackjack" : "Este jogo"} aceita ${minimo === maximo ? minimo : `${minimo} a ${maximo}`} jogador${maximo === 1 ? "" : "es"}.`;
            btnConfirmar.disabled = false;
            return;
        }

        await update(salaRef, {
            [`jogadores/${jogadorId}`]: jogador,
            jogo: jogoSelecionado,
            variacao: variacao.value,
            estado: null,
            status: "jogando"
        });

        window.location.href = `jogo.html?codigo=${codigo}`;
    } catch (erro) {
        console.error(erro);
        mensagem.textContent = "Erro ao iniciar a partida.";
        btnConfirmar.disabled = false;
    }
});

btnVoltar.addEventListener("click", () => {
    window.location.href = `sala.html?codigo=${codigo}`;
});