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

let souDono = false;

onValue(salaRef, async snapshot => {
    if (!snapshot.exists()) {
        mensagem.textContent = "A sala foi encerrada.";
        return;
    }

    const sala = snapshot.val();
    const jogadores = sala.jogadores || {};
    let jogadorAtual = jogadores[jogadorId];

    // Recria o jogador se ele não existir (reconexão)
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

    // Passa a coroa se o dono saiu
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
    btnAdicionarBot.disabled = !souDono || quantidade >= 8;
    btnIniciar.disabled = !souDono || quantidade < 1;
    statusTexto.textContent = quantidade >= 1 ? "Pronto para começar" : "Aguardando jogadores";

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
        await remove(ref(database, `salas/${codigo}/jogadores/${botId}`));
        mensagem.textContent = "BOT removido.";
        setTimeout(() => mensagem.textContent = "", 2000);
    } catch (erro) {
        console.error(erro);
    }
}

btnIniciar.addEventListener("click", async () => {
    try {
        const snapshot = await get(salaRef);
        const sala = snapshot.val();
        const jogadorAtual = sala.jogadores?.[jogadorId];

        if (!jogadorAtual || !jogadorAtual.dono) {
            mensagem.textContent = "Somente o dono pode escolher o jogo.";
            return;
        }

        const jogadores = sala.jogadores || {};
        if (!Object.keys(jogadores).length) {
            mensagem.textContent = "É necessário ter pelo menos 1 jogador.";
            return;
        }

        await desconector.cancel();
        window.location.href = `seletor.html?codigo=${codigo}`;
    } catch (erro) {
        console.error(erro);
        mensagem.textContent = "Erro ao abrir seleção.";
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