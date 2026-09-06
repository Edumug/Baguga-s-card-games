import { executarTransacao, proximoJogador, nomeDe, criarBaralho, embaralhar, rank, mostrarToast } from "../jogo-base.js";

const VALORES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const NAIPES = ["♠", "♥", "♦", "♣"];
const CARTA = { A: 15, "2": 10, "3": 5, "4": 5, "5": 5, "6": 5, "7": 5, "8": 10, "9": 10, "10": 10, J: 10, Q: 10, K: 10, Joker: 50 };

function baralho(variacao) {
    const cartas = [...criarBaralho(), ...criarBaralho()];
    if (variacao !== "aberto") {
        cartas.push({ id: "Joker-1", valor: "Joker", naipe: "" }, { id: "Joker-2", valor: "Joker", naipe: "" }, { id: "Joker-3", valor: "Joker", naipe: "" }, { id: "Joker-4", valor: "Joker", naipe: "" });
    }
    return cartas;
}

function usaTrinca(estado) { return estado.variacao === "fechado"; }
function usaCuringao(estado) { return estado.variacao !== "aberto"; }
function ehCuringa(carta) { return carta.valor === "2" || carta.valor === "Joker"; }
function ehCuringaNecessario(carta, cartas) {
    if (carta.valor === "Joker") return true;
    if (carta.valor !== "2") return false;
    const ranksNaturais = cartas.filter(item => item.valor !== "2" && item.valor !== "Joker").map(item => rank(item));
    return !(ranksNaturais.includes(0) && ranksNaturais.includes(2)) && !(ranksNaturais.includes(2) && ranksNaturais.includes(3));
}
function valorCarta(carta) { return CARTA[carta.valor] || 0; }
function sequenciaValida(cartas) {
    if (cartas.length < 3 || !cartas.every(carta => carta.naipe === cartas[0].naipe)) return false;
    const naturais = cartas.filter(carta => !ehCuringaNecessario(carta, cartas));
    const curingas = cartas.length - naturais.length;
    if (curingas > 1 || naturais.some(carta => carta.valor === "Joker")) return false;
    const ranks = naturais.map(carta => rank(carta)).sort((a, b) => a - b);
    if (new Set(ranks).size !== ranks.length) return false;
    let lacunas = 0;
    for (let indice = 1; indice < ranks.length; indice++) lacunas += ranks[indice] - ranks[indice - 1] - 1;
    return lacunas <= curingas;
}
function trincaValida(cartas) {
    return cartas.length >= 3 && cartas.length <= 8 && cartas.every(carta => carta.valor === cartas[0].valor && carta.valor !== "2" && carta.valor !== "Joker");
}
function jogoValido(cartas, estado) { return sequenciaValida(cartas) || (usaTrinca(estado) && trincaValida(cartas)); }
function podeUsarTopo(estado, jogadorId) {
    const topo = estado.descarte.at(-1);
    if (!topo) return false;
    const mao = estado.maos[jogadorId] || [];
    for (let primeiro = 0; primeiro < mao.length; primeiro++) {
        for (let segundo = primeiro + 1; segundo < mao.length; segundo++) {
            if (jogoValido([topo, mao[primeiro], mao[segundo]], estado)) return true;
        }
    }
    for (const grupo of estado.baixadas[jogadorId] || []) {
        if (mao.some(carta => jogoValido([...grupo, topo, carta], estado))) return true;
    }
    return false;
}
function canastra(grupo) {
    if (grupo.length < 7) return null;
    if (trincaValida(grupo)) return "500";
    if (grupo.length >= 13 && new Set(grupo.filter(carta => !ehCuringaNecessario(carta, grupo)).map(carta => carta.valor)).size >= 13 && !grupo.some(carta => ehCuringaNecessario(carta, grupo))) return "1000";
    const suja = grupo.some(carta => ehCuringaNecessario(carta, grupo));
    return suja ? "suja" : "limpa";
}
function valorCanastra(tipo) { return ({ "1000": 1000, "500": 500, limpa: 200, suja: 100 })[tipo] || 0; }
function pontuacaoBaixadas(grupos) { return grupos.flat().reduce((total, carta) => total + valorCarta(carta), 0) + grupos.reduce((total, grupo) => total + valorCanastra(canastra(grupo)), 0); }
function temCanastraLimpa(estado, jogadorId) { return (estado.baixadas[jogadorId] || []).some(grupo => canastra(grupo) === "limpa" || canastra(grupo) === "1000"); }
function inicializarJogador(estado, id) {
    estado.baixadas[id] ??= [];
    estado.canastras[id] ??= [];
    estado.pontos[id] ??= 0;
}
function entregarMorto(estado, jogadorId) {
    const indice = estado.ids.indexOf(jogadorId);
    if (estado.mortosPegos[jogadorId] || !estado.mortos[indice]?.length) return false;
    estado.maos[jogadorId].push(...estado.mortos[indice]);
    estado.mortos[indice] = [];
    estado.mortosPegos[jogadorId] = true;
    return true;
}
function atualizarPontuacao(estado, jogadorId) {
    inicializarJogador(estado, jogadorId);
    estado.canastras[jogadorId] = estado.baixadas[jogadorId].map(canastra).filter(Boolean);
    estado.pontos[jogadorId] = pontuacaoBaixadas(estado.baixadas[jogadorId]);
}
function podeBater(estado, jogadorId) {
    return estado.mortosPegos[jogadorId] && temCanastraLimpa(estado, jogadorId);
}
function finalizarPontuacao(estado, vencedor) {
    estado.ids.forEach(id => {
        inicializarJogador(estado, id);
        const penalidadeMao = (estado.maos[id] || []).reduce((total, carta) => total + valorCarta(carta), 0);
        estado.pontos[id] = pontuacaoBaixadas(estado.baixadas[id]) - penalidadeMao - (estado.mortosPegos[id] ? 0 : 100);
        if (id === vencedor) estado.pontos[id] += 100;
    });
}
function encerrar(estado, js, jogadorId) {
    atualizarPontuacao(estado, jogadorId);
    const final = podeBater(estado, jogadorId);
    if (!final) return false;
    finalizarPontuacao(estado, jogadorId);
    estado.fim = true;
    estado.vencedores = [jogadorId];
    estado.resultado = `${nomeDe(js, jogadorId)} bateu com ${estado.pontos[jogadorId]} pontos!`;
    return true;
}

export function criarEstado(ids, variacao = "aberto") {
    const deck = embaralhar(baralho(variacao));
    const maos = Object.fromEntries(ids.map(id => [id, Array.from({ length: 11 }, () => deck.pop())]));
    const mortos = [Array.from({ length: 11 }, () => deck.pop()), Array.from({ length: 11 }, () => deck.pop())];
    return {
        tipo: "buraco", variacao, ids, deck, maos, mortos, mortosPegos: {}, descarte: [deck.pop()], atual: ids[0], etapa: "comprar",
        cartaJustificativa: null, baixadas: Object.fromEntries(ids.map(id => [id, []])), canastras: Object.fromEntries(ids.map(id => [id, []])), pontos: Object.fromEntries(ids.map(id => [id, 0])), fim: false, resultado: ""
    };
}

export function acoesBuraco(salaRef, jogadorId) {
    return {
        comprar: () => executarTransacao(salaRef, (estado, js) => {
            if (estado.tipo !== "buraco" || estado.atual !== jogadorId || estado.fim || estado.etapa !== "comprar") return;
            inicializarJogador(estado, jogadorId);
            if (!estado.maos[jogadorId].length && entregarMorto(estado, jogadorId)) { estado.etapa = "descartar"; return; }
            if (!estado.deck.length) { finalizarPontuacao(estado, null); estado.fim = true; estado.resultado = "O monte acabou. A rodada terminou sem batida final."; return; }
            estado.maos[jogadorId].push(estado.deck.pop());
            estado.etapa = "descartar";
        }),
        comprarDescarte: () => executarTransacao(salaRef, (estado) => {
            if (estado.tipo !== "buraco" || estado.atual !== jogadorId || estado.fim || estado.etapa !== "comprar" || !estado.descarte.length || !podeUsarTopo(estado, jogadorId)) return;
            estado.cartaJustificativa = estado.descarte.at(-1).id;
            estado.maos[jogadorId].push(...estado.descarte.reverse());
            estado.descarte = [];
            estado.etapa = "descartar";
        }),
        baixar: indices => executarTransacao(salaRef, (estado, js) => {
            if (estado.tipo !== "buraco" || estado.atual !== jogadorId || estado.fim || estado.etapa !== "descartar") return;
            inicializarJogador(estado, jogadorId);
            const unicos = [...new Set(indices)].sort((a, b) => b - a);
            const cartas = unicos.map(indice => estado.maos[jogadorId]?.[indice]);
            if (cartas.some(carta => !carta) || !jogoValido(cartas, estado)) return;
            if (estado.cartaJustificativa && !cartas.some(carta => carta.id === estado.cartaJustificativa)) return;
            unicos.forEach(indice => estado.maos[jogadorId].splice(indice, 1));
            estado.baixadas[jogadorId].push(cartas);
            if (estado.cartaJustificativa && cartas.some(carta => carta.id === estado.cartaJustificativa)) estado.cartaJustificativa = null;
            atualizarPontuacao(estado, jogadorId);
            if (!estado.maos[jogadorId].length && !estado.mortosPegos[jogadorId]) entregarMorto(estado, jogadorId);
            if (!estado.maos[jogadorId].length && encerrar(estado, js, jogadorId)) return;
        }),
        encaixar: (grupoIndice, indices) => executarTransacao(salaRef, (estado, js) => {
            if (estado.tipo !== "buraco" || estado.atual !== jogadorId || estado.fim || estado.etapa !== "descartar") return;
            inicializarJogador(estado, jogadorId);
            const grupo = estado.baixadas[jogadorId][grupoIndice];
            if (!grupo) return;
            const unicos = [...new Set(indices)].sort((a, b) => b - a);
            const cartas = unicos.map(indice => estado.maos[jogadorId]?.[indice]);
            if (cartas.some(carta => !carta) || !jogoValido([...grupo, ...cartas], estado)) return;
            unicos.forEach(indice => estado.maos[jogadorId].splice(indice, 1));
            grupo.push(...cartas);
            if (estado.cartaJustificativa && cartas.some(carta => carta.id === estado.cartaJustificativa)) estado.cartaJustificativa = null;
            atualizarPontuacao(estado, jogadorId);
            if (!estado.maos[jogadorId].length && !estado.mortosPegos[jogadorId]) entregarMorto(estado, jogadorId);
            if (!estado.maos[jogadorId].length) encerrar(estado, js, jogadorId);
        }),
        descartar: indice => executarTransacao(salaRef, (estado, js) => {
            if (estado.tipo !== "buraco" || estado.atual !== jogadorId || estado.fim || estado.etapa !== "descartar") return;
            inicializarJogador(estado, jogadorId);
            if (estado.cartaJustificativa) return;
            const carta = estado.maos[jogadorId]?.[indice];
            if (!carta) return;
            estado.maos[jogadorId].splice(indice, 1);
            estado.descarte.push(carta);
            atualizarPontuacao(estado, jogadorId);
            if (estado.maos[jogadorId].length && !encerrar(estado, js, jogadorId)) {
                estado.atual = proximoJogador(estado.ids, jogadorId);
                estado.etapa = "comprar";
            } else if (!estado.maos[jogadorId].length && !estado.mortosPegos[jogadorId]) {
                estado.atual = proximoJogador(estado.ids, jogadorId);
                estado.etapa = "comprar";
            }
        })
    };
}