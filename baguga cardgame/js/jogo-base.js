import { database } from "./firebase-config.js";
import { ref, runTransaction, update, onDisconnect, remove, onValue } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

export const valores = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const naipes = ["♠", "♥", "♦", "♣"];

export const criarBaralho = () => naipes.flatMap(n => valores.map(v => ({ id: v + n, valor: v, naipe: n })));
export const embaralhar = (a) => {
    a = [...a];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

export const proximoJogador = (ids, id) => ids[(ids.indexOf(id) + 1) % ids.length];
export const rank = (c) => valores.indexOf(c.valor);
export const nomeDe = (js, id) => (js && js[id] && js[id].nome) || "Jogador";

function normalizarEstado(estado) {
    estado.ids ??= [];
    estado.maos ??= {};
    estado.deck ??= [];
    estado.mesa ??= [];
    estado.descarte ??= [];
    estado.jogadas ??= {};
    estado.vazas ??= {};
    estado.resultadosVazas ??= [];
    estado.parou ??= {};
    estado.pedido ??= null;
    estado.ultimoPedidoPor ??= null;
    estado.fold ??= {};
    estado.allin ??= {};
    estado.agiram ??= {};
    estado.apostas ??= {};
    estado.fichas ??= {};
    estado.pote ??= 0;
    estado.mortos ??= [];
    estado.mortosPegos ??= {};
    estado.baixadas ??= {};
    estado.canastras ??= {};
    estado.pontos ??= {};
    estado.cartaJustificativa ??= null;
    estado.etapa ??= "comprar";
    estado.fim ??= false;
    estado.partidaEncerrada ??= false;
    estado.resultado ??= "";
    estado.atual ??= null;
    return estado;
}

export function executarTransacao(salaRef, fn) {
    return runTransaction(salaRef, s => {
        if (!s?.estado || s.estado.fim) return s;
        const estado = normalizarEstado(s.estado);
        const jogadores = s.jogadores || {};
        fn(estado, jogadores);
        s.estado = estado;
        return s;
    });
}

export async function removerAusentes(salaRef, estado, jogadoresAtuais) {
    const ativos = Object.keys(jogadoresAtuais);
    const idsAtivos = estado.ids.filter(id => ativos.includes(id));
    if (idsAtivos.length === estado.ids.length) return false;
    await runTransaction(salaRef, s => {
        if (!s?.estado) return s;
        const estado = s.estado;
        estado.ids = estado.ids.filter(id => ativos.includes(id));
        if (estado.atual && !estado.ids.includes(estado.atual)) {
            estado.atual = estado.ids[0] || null;
        }
        ["jogadas", "parou", "fold", "allin", "ultimaAposta", "agiram", "apostas"].forEach(key => {
            if (estado[key]) {
                Object.keys(estado[key]).forEach(id => {
                    if (!estado.ids.includes(id)) delete estado[key][id];
                });
            }
        });
        return s;
    });
    return true;
}

export function elementoCarta(c, click) {
    const x = document.createElement(click ? "button" : "div");
    x.className = "carta";
    x.textContent = c.valor + c.naipe;
    if (["♥", "♦"].includes(c.naipe)) x.classList.add("vermelha");
    if (click) { x.type = "button"; x.onclick = click; }
    return x;
}

export function mostrarToast(mensagem, tipo = "info") {
    const container = document.getElementById("toastContainer") || (() => {
        const div = document.createElement("div");
        div.id = "toastContainer";
        div.className = "toast-container";
        document.body.appendChild(div);
        return div;
    })();
    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensagem;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}