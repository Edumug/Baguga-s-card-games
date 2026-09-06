import { database } from "./firebase-config.js";
import { ref, onValue, get, update, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const params = new URLSearchParams(window.location.search);
const codigo = params.get("codigo");
const jogadorId = sessionStorage.getItem("jogadorId");

if (!codigo || !jogadorId) {
    window.location.href = "index.html";
    throw new Error("Sala ou jogador não encontrados.");
}

const codigoExibido = document.getElementById("codigoExibido");
const listaJogadores = document.getElementById("listaJogadores");
const btnAdicionarBot = document.getElementById("btnAdicionarBot");
const btnIniciar = document.getElementById("btnIniciar");
const btnCopiarCodigo = document.getElementById("btnCopiarCodigo");
const btnSair = document.getElementById("btnSair");
const mensagem = document.getElementById("mensagemSala");
const statusTexto = document.getElementById("statusTexto");

const salaRef = ref(database, `salas/${codigo}`);
const meuRef = ref(database, `salas/${codigo}/jogadores/${jogadorId}`);
const desconector = onDisconnect(meuRef);
desconector.remove();

codigoExibido.textContent = codigo;

const nomesJogos = {
    truco: "Truco",
    blackjack: "Blackjack",
    pife: "Pife",
    buraco: "Buraco",
    poker: "Poker"
};

const nomesVariacoes = {
    padrao: "Padrão",
    paulista: "Paulista",
    mineiro: "Mineiro",
    aberto: "Aberto",
    fechado: "Fechado",
    stbl: "Fechado STBL",
    texas: "Texas Hold'em"
};

const limites = {
    truco: [2, 4],
    buraco: [2, 4],
    poker: [2, 8],
    blackjack: [1, 7],
    pife: [2, 4]
};

let souDono = false;
let btnEscolherJogo = document.getElementById("btnEscolherJogo");
let jogoEscolhido = document.getElementById("jogoEscolhido");
let variacaoEscolhida = document.getElementById("variacaoEscolhida");

// Compatibilidade com a versão antiga do sala.html: cria os elementos novos automaticamente.
if (!jogoEscolhido) {
    jogoEscolhido = document.createElement("h2");
    jogoEscolhido.id = "jogoEscolhido";
    jogoEscolhido.textContent = "Nenhum jogo escolhido";
    const configuracao = btnIniciar?.parentElement;
    const titulo = configuracao?.querySelector("h2");
    if (titulo) titulo.replaceWith(jogoEscolhido);
}

if (!variacaoEscolhida) {
    variacaoEscolhida = document.createElement("p");
    variacaoEscolhida.id = "variacaoEscolhida";
    variacaoEscolhida.textContent = "Escolha o jogo antes de iniciar a partida.";
    const configuracao = btnIniciar?.parentElement;
    const paragrafo = configuracao?.querySelector("p");
    if (paragrafo) paragrafo.replaceWith(variacaoEscolhida);
}

if (!btnEscolherJogo && btnIniciar) {
    btnEscolherJogo = document.createElement("button");
    btnEscolherJogo.id = "btnEscolherJogo";
    btnEscolherJogo.className = btnIniciar.className;
    btnEscolherJogo.textContent = "Escolher jogo";
    btnIniciar.parentElement.insertBefore(btnEscolherJogo, btnIniciar);
}

btnIniciar.textContent = "Iniciar partida";

function limiteValido(jogo, quantidade) {
    const [minimo, maximo] = limites[jogo] || [2, 4];
    return quantidade >= minimo && quantidade <= maximo;
}

function textoLimite(jogo) {
    const [minimo, maximo] = limites[jogo] || [2, 4];
    return minimo === maximo
        ? `${minimo} jogador${minimo === 1 ? "" : "es"}`
        : `${minimo} a ${maximo} jogadores`;
}

function atualizarConfiguracao(sala, quantidade) {
    const jogo = sala.jogo;

    if (jogo) {
        jogoEscolhido.textContent = nomesJogos[jogo] || jogo;
        variacaoEscolhida.textContent = `Variação: ${nomesVariacoes[sala.variacao] || sala.variacao || "Padrão"}.`;
        btnEscolherJogo.textContent = souDono ? "Alterar jogo" : "Jogo escolhido";
    } else {
        jogoEscolhido.textContent = "Nenhum jogo escolhido";
        variacaoEscolhida.textContent = souDono
            ? "Escolha o jogo primeiro. A partida só começa quando você clicar em iniciar."
            : "Aguardando o dono escolher o jogo.";
        btnEscolherJogo.textContent = "Escolher jogo";
    }

    btnEscolherJogo.disabled = !souDono || sala.status === "jogando";
    btnIniciar.disabled = !souDono || sala.status === "jogando" || !jogo || !limiteValido(jogo, quantidade);

    if (jogo && !limiteValido(jogo, quantidade)) {
        mensagem.textContent = `${nomesJogos[jogo] || jogo} precisa de ${textoLimite(jogo)}. Há ${quantidade} na sala.`;
    }
}

onValue(salaRef, async snapshot => {
    if (!snapshot.exists()) {
        mensagem.textContent = "A sala foi encerrada.";
        return;
    }

    const sala = snapshot.val();
    const jogadores = sala.jogadores || {};
    let jogadorAtual = jogadores[jogadorId];

    if (!jogadorAtual && sala.dono === jogadorId) {
        jogadorAtual = {
            nome: sessionStorage.getItem("nomeJogador") || "Você",
            tipo: "humano",
            dono: true,
            pontos: 0,
            ordem: 0
        };
        await update(meuRef, jogadorAtual);
        jogadores[jogadorId] = jogadorAtual;
    }

    if (!jogadorAtual) {
        window.location.href = "index.html";
        return;
    }

    souDono = jogadorAtual.dono === true || sala.dono === jogadorId;

    const existeDono = Object.values(jogadores).some(j => j.dono === true);
    if (!existeDono) {
        const maisAntigo = Object.entries(jogadores)
            .sort(([, a], [, b]) => (a.ordem || 0) - (b.ordem || 0))[0];
        if (maisAntigo && maisAntigo[0] === jogadorId) {
            await update(meuRef, { dono: true });
            souDono = true;
        }
    }

    mostrarJogadores(jogadores, souDono);

    const quantidade = Object.keys(jogadores).length;
    btnAdicionarBot.disabled = !souDono || quantidade >= 8 || sala.status === "jogando";
    statusTexto.textContent = sala.status === "jogando"
        ? "Partida iniciada"
        : sala.jogo
            ? "Jogo escolhido"
            : quantidade >= 1 ? "Pronto para configurar" : "Aguardando jogadores";

    atualizarConfiguracao(sala, quantidade);

    if (sala.status === "jogando") {
        window.location.href = `jogo.html?codigo=${codigo}`;
    }
});

function mostrarJogadores(jogadores, souDono) {
    listaJogadores.innerHTML = "";
    const lista = Object.entries(jogadores)
        .sort(([, a], [, b]) => (a.ordem || 0) - (b.ordem || 0));

    lista.forEach(([id, jogador]) => {
        const div = document.createElement("div");
        div.className = "jogador";

        const info = document.createElement("div");
        info.className = "jogador-info";
        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = jogador.dono ? "👑" : jogador.tipo === "bot" ? "🤖" : "👤";

        const dados = document.createElement("div");
        const nome = document.createElement("div");
        nome.className = "jogador-nome";
        nome.textContent = jogador.nome || "Jogador";
        const tipo = document.createElement("div");
        tipo.className = "jogador-tipo";
        tipo.textContent = jogador.tipo === "bot" ? "BOT" : jogador.dono ? "Dono da sala" : "Jogador";

        dados.appendChild(nome);
        dados.appendChild(tipo);
        info.appendChild(avatar);
        info.appendChild(dados);
        div.appendChild(info);

        if (souDono && jogador.tipo === "bot") {
            const remover = document.createElement("button");
            remover.className = "btn-remover";
            remover.textContent = "×";
            remover.onclick = () => removerBot(id);
            div.appendChild(remover);
        }

        listaJogadores.appendChild(div);
    });

    const contador = document.createElement("div");
    contador.className = "contador";
    contador.textContent = `${lista.length}/8 jogadores`;
    listaJogadores.appendChild(contador);
}

btnAdicionarBot.addEventListener("click", async () => {
    try {
        const snapshot = await get(salaRef);
        if (!snapshot.exists()) return;

        const sala = snapshot.val();
        const jogadores = sala.jogadores || {};
        const dono = jogadores[jogadorId];

        if (!dono || dono.dono !== true) {
            mensagem.textContent = "Somente o dono pode adicionar BOTs.";
            return;
        }

        if (sala.status === "jogando") return;

        const quantidade = Object.keys(jogadores).length;
        if (quantidade >= 8) {
            mensagem.textContent = "A sala está cheia.";
            return;
        }

        const bots = Object.values(jogadores).filter(j => j.tipo === "bot");
        const numero = bots.length + 1;
        const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        await update(ref(database, `salas/${codigo}/jogadores`), {
            [botId]: {
                nome: `Bot ${numero}`,
                tipo: "bot",
                dono: false,
                pontos: 0,
                ordem: quantidade
            }
        });

        mensagem.textContent = `Bot ${numero} adicionado!`;
        setTimeout(() => mensagem.textContent = "", 3000);
    } catch (erro) {
        console.error("Erro ao adicionar BOT:", erro);
        mensagem.textContent = "Erro ao adicionar BOT.";
    }
});

async function removerBot(botId) {
    try {
        const snapshot = await get(salaRef);
        if (!snapshot.exists()) return;
        const sala = snapshot.val();
        if (sala.status === "jogando" || sala.jogadores?.[jogadorId]?.dono !== true) return;
        await remove(ref(database, `salas/${codigo}/jogadores/${botId}`));
        mensagem.textContent = "BOT removido.";
        setTimeout(() => mensagem.textContent = "", 2000);
    } catch (erro) {
        console.error(erro);
    }
}

btnEscolherJogo.addEventListener("click", () => {
    if (!souDono) return;
    window.location.href = `seletor.html?codigo=${codigo}`;
});

btnIniciar.addEventListener("click", async () => {
    try {
        const snapshot = await get(salaRef);
        if (!snapshot.exists()) return;

        const sala = snapshot.val();
        const jogadorAtual = sala.jogadores?.[jogadorId];
        const jogadores = sala.jogadores || {};
        const quantidade = Object.keys(jogadores).length;

        if (!jogadorAtual || !jogadorAtual.dono) {
            mensagem.textContent = "Somente o dono pode iniciar a partida.";
            return;
        }

        if (!sala.jogo) {
            mensagem.textContent = "Escolha um jogo antes de iniciar.";
            return;
        }

        if (!limiteValido(sala.jogo, quantidade)) {
            mensagem.textContent = `${nomesJogos[sala.jogo] || sala.jogo} precisa de ${textoLimite(sala.jogo)}. Há ${quantidade} na sala.`;
            return;
        }

        await update(salaRef, {
            status: "jogando",
            estado: null
        });
    } catch (erro) {
        console.error(erro);
        mensagem.textContent = "Erro ao iniciar a partida.";
    }
});

btnCopiarCodigo.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(codigo);
        mensagem.textContent = "Código copiado!";
        setTimeout(() => mensagem.textContent = "", 2000);
    } catch {
        mensagem.textContent = "Não foi possível copiar.";
    }
});

btnSair.addEventListener("click", async () => {
    try {
        desconector.cancel();
        await remove(meuRef);
    } catch (erro) {
        console.error(erro);
    }
    sessionStorage.clear();
    localStorage.removeItem("codigoSala");
    localStorage.removeItem("nomeJogador");
    localStorage.removeItem("donoSala");
    window.location.href = "index.html";
});