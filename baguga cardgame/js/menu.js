import { database } from "./firebase-config.js";
import { ref, set, get, update } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const btnCriarSala = document.getElementById("btnCriarSala");
const btnEntrarSala = document.getElementById("btnEntrarSala");
const codigoSala = document.getElementById("codigoSala");
const nomeJogador = document.getElementById("nomeJogador");
const mensagem = document.getElementById("mensagem");

// Recupera o nome salvo mesmo depois de recarregar ou sair da partida.
const nomeSalvo = localStorage.getItem("nomeJogador");
if (nomeSalvo) nomeJogador.value = nomeSalvo;

function salvarNome(nome) {
    localStorage.setItem("nomeJogador", nome);
}

function gerarIdJogador() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "jogador_" + Date.now() + "_" + Math.random().toString(36).substring(2);
}

function gerarCodigoSala() {
    const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let codigo = "";
    for (let i = 0; i < 5; i++) codigo += caracteres[Math.floor(Math.random() * caracteres.length)];
    return codigo;
}

btnCriarSala.addEventListener("click", async () => {
    const nome = nomeJogador.value.trim();
    if (!nome) {
        mensagem.textContent = "Digite seu nome antes de criar a sala.";
        nomeJogador.focus();
        return;
    }
    salvarNome(nome);
    btnCriarSala.disabled = true;
    mensagem.textContent = "Criando sala...";

    try {
        let codigo;
        let salaExiste = true;
        while (salaExiste) {
            codigo = gerarCodigoSala();
            const salaRef = ref(database, `salas/${codigo}`);
            salaExiste = (await get(salaRef)).exists();
        }

        const jogadorId = gerarIdJogador();
        const salaRef = ref(database, `salas/${codigo}`);
        await set(salaRef, {
            dono: jogadorId,
            jogo: "truco",
            variacao: "padrao",
            status: "aguardando",
            jogadores: {
                [jogadorId]: { nome, tipo: "humano", dono: true, pontos: 0, ordem: 0 }
            }
        });

        sessionStorage.setItem("jogadorId", jogadorId);
        sessionStorage.setItem("nomeJogador", nome);
        localStorage.setItem("codigoSala", codigo);
        localStorage.setItem("donoSala", "true");
        window.location.href = `sala.html?codigo=${codigo}`;
    } catch (erro) {
        console.error("Erro ao criar sala:", erro);
        mensagem.textContent = "Erro ao criar a sala.";
        btnCriarSala.disabled = false;
    }
});

btnEntrarSala.addEventListener("click", async () => {
    const nome = nomeJogador.value.trim();
    if (!nome) {
        mensagem.textContent = "Digite seu nome antes de entrar na sala.";
        nomeJogador.focus();
        return;
    }
    salvarNome(nome);
    const codigo = codigoSala.value.trim().toUpperCase();
    if (codigo.length !== 5) {
        mensagem.textContent = "Digite um código de 5 caracteres.";
        return;
    }

    btnEntrarSala.disabled = true;
    mensagem.textContent = "Entrando na sala...";

    try {
        const salaRef = ref(database, `salas/${codigo}`);
        const snapshot = await get(salaRef);
        if (!snapshot.exists()) {
            mensagem.textContent = "Essa sala não existe.";
            btnEntrarSala.disabled = false;
            return;
        }

        const sala = snapshot.val();
        const jogadores = sala.jogadores || {};
        const quantidade = Object.keys(jogadores).length;
        if (quantidade >= 8) {
            mensagem.textContent = "Essa sala já está cheia.";
            btnEntrarSala.disabled = false;
            return;
        }
        if (sala.status === "jogando") {
            mensagem.textContent = "Essa partida já começou.";
            btnEntrarSala.disabled = false;
            return;
        }

        const jogadorId = gerarIdJogador();
        await update(ref(database, `salas/${codigo}/jogadores`), {
            [jogadorId]: { nome, tipo: "humano", dono: false, pontos: 0, ordem: quantidade }
        });

        sessionStorage.setItem("jogadorId", jogadorId);
        sessionStorage.setItem("nomeJogador", nome);
        localStorage.setItem("codigoSala", codigo);
        localStorage.setItem("donoSala", "false");
        window.location.href = `sala.html?codigo=${codigo}`;
    } catch (erro) {
        console.error("Erro ao entrar:", erro);
        mensagem.textContent = "Erro ao entrar na sala.";
        btnEntrarSala.disabled = false;
    }
});

nomeJogador.addEventListener("input", () => salvarNome(nomeJogador.value));

codigoSala.addEventListener("keydown", evento => {
    if (evento.key === "Enter") btnEntrarSala.click();
});

codigoSala.addEventListener("input", () => {
    codigoSala.value = codigoSala.value.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 5);
});