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
btnConfirmar.textContent = "Escolher jogo";

const variacoes = {
    truco: [["padrao", "Truco Padrão"], ["paulista", "Truco Paulista"], ["mineiro", "Truco Mineiro"]],
    blackjack: [["padrao", "Blackjack Clássico"]],
    pife: [["padrao", "Pife Tradicional"]],
    buraco: [["aberto", "Buraco Aberto"], ["fechado", "Buraco Fechado"], ["stbl", "Buraco Fechado STBL"]],
    poker: [["texas", "Texas Hold'em"]]
};

const limites = {
    truco: [2, 4],
    blackjack: [1, 7],
    pife: [2, 4],
    buraco: [2, 4],
    poker: [2, 8]
};

const textosJogadores = {
    truco: "2 jogadores (mano a mano) ou 4 (duplas)",
    blackjack: "1 a 7 jogadores + dealer",
    pife: "2 a 4 jogadores",
    buraco: "2 (mano a mano) ou 4 (duplas)",
    poker: "2 a 8 jogadores"
};

let jogoSelecionado = null;

function atualizarVariacoes() {
    variacao.innerHTML = "";
    (variacoes[jogoSelecionado] || []).forEach(([valor, texto]) => {
        const option = document.createElement("option");
        option.value = valor;
        option.textContent = texto;
        variacao.appendChild(option);
    });
}

function selecionarCard(card, variacaoAnterior = null) {
    cards.forEach(outro => outro.classList.remove("selecionado"));
    card.classList.add("selecionado");
    jogoSelecionado = card.dataset.jogo;
    atualizarVariacoes();

    if (variacaoAnterior && [...variacao.options].some(o => o.value === variacaoAnterior)) {
        variacao.value = variacaoAnterior;
    }

    btnConfirmar.disabled = false;
    const jogadoresTexto = card.querySelector(".jogadores");
    if (jogadoresTexto) jogadoresTexto.textContent = textosJogadores[jogoSelecionado] || "";
}

cards.forEach(card => {
    const texto = card.querySelector(".jogadores");
    if (texto) texto.textContent = textosJogadores[card.dataset.jogo] || "";
    card.addEventListener("click", () => selecionarCard(card));
});

async function carregarSala() {
    try {
        const snapshot = await get(salaRef);
        if (!snapshot.exists()) {
            mensagem.textContent = "Sala não encontrada.";
            return;
        }

        const sala = snapshot.val();
        const jogador = sala.jogadores?.[jogadorId];
        const souDono = jogador?.dono === true || sala.dono === jogadorId;

        if (!souDono) {
            mensagem.textContent = "Somente o dono da sala pode escolher o jogo.";
            btnConfirmar.disabled = true;
            cards.forEach(card => card.disabled = true);
            return;
        }

        if (sala.status === "jogando") {
            window.location.href = `jogo.html?codigo=${codigo}`;
            return;
        }

        if (sala.jogo) {
            const cardAtual = [...cards].find(card => card.dataset.jogo === sala.jogo);
            if (cardAtual) selecionarCard(cardAtual, sala.variacao);
            mensagem.textContent = "Você pode trocar o jogo antes de iniciar a partida.";
        }
    } catch (erro) {
        console.error(erro);
        mensagem.textContent = "Erro ao carregar a sala.";
    }
}

btnConfirmar.addEventListener("click", async () => {
    if (!jogoSelecionado) return;

    btnConfirmar.disabled = true;
    mensagem.textContent = "Salvando escolha...";

    try {
        const snapshot = await get(salaRef);
        if (!snapshot.exists()) {
            mensagem.textContent = "Sala não encontrada.";
            btnConfirmar.disabled = false;
            return;
        }

        const sala = snapshot.val();
        const jogador = sala.jogadores?.[jogadorId];
        const souDono = jogador?.dono === true || sala.dono === jogadorId;

        if (!souDono) {
            mensagem.textContent = "Somente o dono pode escolher o jogo.";
            btnConfirmar.disabled = false;
            return;
        }

        if (sala.status === "jogando") {
            window.location.href = `jogo.html?codigo=${codigo}`;
            return;
        }

        const quantidade = Object.keys(sala.jogadores || {}).length;
        const [minimo, maximo] = limites[jogoSelecionado];

        if (quantidade < minimo || quantidade > maximo) {
            mensagem.textContent = `${jogoSelecionado === "blackjack" ? "Blackjack" : jogoSelecionado[0].toUpperCase() + jogoSelecionado.slice(1)} aceita ${minimo === maximo ? minimo : `${minimo} a ${maximo}`} jogador${maximo === 1 ? "" : "es"}. Há ${quantidade} na sala.`;
            btnConfirmar.disabled = false;
            return;
        }

        // Escolher o jogo NÃO inicia a partida. O status continua aguardando.
        await update(salaRef, {
            jogo: jogoSelecionado,
            variacao: variacao.value,
            estado: null,
            status: sala.status === "jogando" ? "jogando" : "aguardando"
        });

        window.location.href = `sala.html?codigo=${codigo}`;
    } catch (erro) {
        console.error(erro);
        mensagem.textContent = "Erro ao salvar a escolha.";
        btnConfirmar.disabled = false;
    }
});

btnVoltar.addEventListener("click", () => {
    window.location.href = `sala.html?codigo=${codigo}`;
});

carregarSala();
