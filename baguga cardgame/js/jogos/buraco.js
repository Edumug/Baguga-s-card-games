import { executarTransacao, proximoJogador, nomeDe, criarBaralho, embaralhar, rank } from "../jogo-base.js";

const CARTA = { A: 15, "2": 10, "3": 5, "4": 5, "5": 5, "6": 5, "7": 5, "8": 10, "9": 10, "10": 10, J: 10, Q: 10, K: 10, Joker: 50 };

function baralho(variacao) {
    const cartas = [...criarBaralho(), ...criarBaralho()];
    if (variacao !== "aberto") {
        cartas.push(
            { id: "Joker-1", valor: "Joker", naipe: "" },
            { id: "Joker-2", valor: "Joker", naipe: "" },
            { id: "Joker-3", valor: "Joker", naipe: "" },
            { id: "Joker-4", valor: "Joker", naipe: "" }
        );
    }
    return cartas;
}

function usaTrinca(estado) { return estado.variacao !== "aberto"; }
function ehCuringa(carta) { return carta?.valor === "2" || carta?.valor === "Joker"; }

function ehCuringaNecessario(carta, cartas) {
    if (carta.valor === "Joker") return true;
    if (carta.valor !== "2") return false;
    const ranks = cartas.filter(c => c.valor !== "2" && c.valor !== "Joker").map(rank).sort((a, b) => a - b);
    if (!ranks.length) return true;
    return !((ranks.includes(0) && ranks.includes(2)) || (ranks.includes(2) && ranks.includes(3)));
}

function valorCarta(carta) { return CARTA[carta.valor] || 0; }

function sequenciaValida(cartas) {
    if (cartas.length < 3) return false;
    const naturais = cartas.filter(carta => !ehCuringaNecessario(carta, cartas));
    const curingas = cartas.filter(carta => ehCuringaNecessario(carta, cartas));
    if (!naturais.length) return false;
    if (!naturais.every(carta => carta.naipe === naturais[0].naipe)) return false;
    if (curingas.length > 1) return false;
    const ranks = naturais.map(rank).sort((a, b) => a - b);
    if (new Set(ranks).size !== ranks.length) return false;
    let lacunas = 0;
    for (let i = 1; i < ranks.length; i++) lacunas += ranks[i] - ranks[i - 1] - 1;
    return lacunas <= curingas.length;
}

function trincaValida(cartas) {
    if (cartas.length < 3 || cartas.length > 8) return false;
    const naturais = cartas.filter(carta => !ehCuringa(carta));
    const curingas = cartas.filter(ehCuringa);
    return naturais.length >= 2 && new Set(naturais.map(carta => carta.valor)).size === 1 && curingas.length <= 1;
}

function jogoValido(cartas, estado) {
    return sequenciaValida(cartas) || (usaTrinca(estado) && trincaValida(cartas));
}

// 2 jogadores = mano a mano. 4 jogadores = duas duplas, com parceiros em lados opostos.
function duplaDe(ids, id) {
    const indice = ids.indexOf(id);
    if (indice < 0) return null;
    return ids.length === 4 ? indice % 2 : indice;
}
function membrosDaDupla(ids, dupla) { return ids.filter(id => duplaDe(ids, id) === dupla); }
function chaveDupla(estado, jogadorId) { return `dupla_${duplaDe(estado.ids, jogadorId)}`; }

function inicializarDuplas(estado) {
    const quantidade = estado.ids.length === 4 ? 2 : estado.ids.length;
    for (let i = 0; i < quantidade; i++) {
        const chave = `dupla_${i}`;
        estado.baixadas[chave] ??= [];
        estado.canastras[chave] ??= [];
        estado.pontos[chave] ??= 0;
        estado.mortosPegos[chave] ??= false;
    }
    estado.ordemBaixadas ??= [];
}

function podeUsarTopo(estado, jogadorId) {
    const topo = estado.descarte.at(-1);
    if (!topo) return false;
    const mao = estado.maos[jogadorId] || [];
    for (let i = 0; i < mao.length; i++) {
        for (let j = i + 1; j < mao.length; j++) {
            if (jogoValido([topo, mao[i], mao[j]], estado)) return true;
        }
    }
    const chave = chaveDupla(estado, jogadorId);
    for (const grupo of estado.baixadas[chave] || []) {
        if (mao.some(carta => jogoValido([...grupo, topo, carta], estado))) return true;
    }
    return false;
}

function canastra(grupo) {
    if (grupo.length < 7) return null;
    if (grupo.length <= 8 && trincaValida(grupo)) return "500";
    return grupo.some(carta => ehCuringaNecessario(carta, grupo)) ? "suja" : "limpa";
}
function valorCanastra(tipo) { return ({ limpa: 200, suja: 100, "500": 500, "1000": 1000 })[tipo] || 0; }
function pontuacaoBaixadas(grupos) {
    return grupos.flat().reduce((total, carta) => total + valorCarta(carta), 0) + grupos.reduce((total, grupo) => total + valorCanastra(canastra(grupo)), 0);
}
function temCanastraLimpa(estado, chave) {
    return (estado.baixadas[chave] || []).some(grupo => ["limpa", "1000"].includes(canastra(grupo)));
}

function entregarMorto(estado, jogadorId) {
    const dupla = duplaDe(estado.ids, jogadorId);
    const chave = `dupla_${dupla}`;
    if (estado.mortosPegos[chave] || !estado.mortos[dupla]?.length) return false;
    estado.maos[jogadorId].push(...estado.mortos[dupla]);
    estado.mortos[dupla] = [];
    estado.mortosPegos[chave] = true;
    return true;
}

function atualizarPontuacao(estado, jogadorId) {
    inicializarDuplas(estado);
    const chave = chaveDupla(estado, jogadorId);
    estado.canastras[chave] = estado.baixadas[chave].map(canastra).filter(Boolean);
    estado.pontos[chave] = pontuacaoBaixadas(estado.baixadas[chave]);
}

function podeBater(estado, chave) {
    return estado.mortosPegos[chave] && temCanastraLimpa(estado, chave);
}

function finalizarPontuacao(estado, vencedora = null) {
    inicializarDuplas(estado);
    Object.keys(estado.baixadas).forEach(chave => {
        const ids = estado.ids.filter(id => chaveDupla(estado, id) === chave);
        const pontos = pontuacaoBaixadas(estado.baixadas[chave] || []);
        const penalidade = ids.reduce((total, id) => total + (estado.maos[id] || []).reduce((soma, carta) => soma + valorCarta(carta), 0), 0);
        estado.pontos[chave] = pontos - penalidade - (estado.mortosPegos[chave] ? 0 : 100) + (chave === vencedora ? 100 : 0);
    });
}

function encerrar(estado, js, jogadorId) {
    const chave = chaveDupla(estado, jogadorId);
    atualizarPontuacao(estado, jogadorId);
    if (!podeBater(estado, chave)) return false;
    finalizarPontuacao(estado, chave);
    const dupla = duplaDe(estado.ids, jogadorId);
    estado.fim = true;
    estado.vencedores = membrosDaDupla(estado.ids, dupla);
    estado.resultado = `${membrosDaDupla(estado.ids, dupla).map(id => nomeDe(js, id)).join(" e ")} bateu!`;
    return true;
}

export function criarEstado(ids, variacao = "aberto") {
    const deck = embaralhar(baralho(variacao));
    const maos = Object.fromEntries(ids.map(id => [id, Array.from({ length: 11 }, () => deck.pop())]));
    const mortos = [Array.from({ length: 11 }, () => deck.pop()), Array.from({ length: 11 }, () => deck.pop())];
    const estado = {
        tipo: "buraco",
        modo: ids.length === 4 ? "duplas" : "mano-a-mano",
        variacao,
        ids,
        deck,
        maos,
        mortos,
        mortosPegos: {},
        descarte: [deck.pop()],
        atual: ids[0],
        etapa: "comprar",
        cartaJustificativa: null,
        baixadas: {},
        ordemBaixadas: [],
        canastras: {},
        pontos: {},
        fim: false,
        resultado: ""
    };
    inicializarDuplas(estado);
    return estado;
}

export function acoesBuraco(salaRef, jogadorId) {
    return {
        comprar: () => executarTransacao(salaRef, estado => {
            if (estado.tipo !== "buraco" || estado.atual !== jogadorId || estado.fim || estado.etapa !== "comprar") return;
            inicializarDuplas(estado);
            if (!estado.maos[jogadorId].length && entregarMorto(estado, jogadorId)) {
                estado.etapa = "descartar";
                return;
            }
            if (!estado.deck.length) {
                finalizarPontuacao(estado);
                estado.fim = true;
                estado.resultado = "O monte acabou. A rodada terminou.";
                return;
            }
            estado.maos[jogadorId].push(estado.deck.pop());
            estado.etapa = "descartar";
        }),

        comprarDescarte: () => executarTransacao(salaRef, estado => {
            if (estado.tipo !== "buraco" || estado.atual !== jogadorId || estado.fim || estado.etapa !== "comprar" || !estado.descarte.length || !podeUsarTopo(estado, jogadorId)) return;
            estado.cartaJustificativa = estado.descarte.at(-1).id;
            estado.maos[jogadorId].push(...estado.descarte.reverse());
            estado.descarte = [];
            estado.etapa = "descartar";
        }),

        baixar: indices => executarTransacao(salaRef, (estado, js) => {
            if (estado.tipo !== "buraco" || estado.atual !== jogadorId || estado.fim || estado.etapa !== "descartar") return;
            inicializarDuplas(estado);
            const unicos = [...new Set(indices)].sort((a, b) => b - a);
            const cartas = unicos.map(indice => estado.maos[jogadorId]?.[indice]);
            if (cartas.some(carta => !carta) || !jogoValido(cartas, estado)) return;
            if (estado.cartaJustificativa && !cartas.some(carta => carta.id === estado.cartaJustificativa)) return;
            const chave = chaveDupla(estado, jogadorId);
            unicos.forEach(indice => estado.maos[jogadorId].splice(indice, 1));
            estado.baixadas[chave].push(cartas);
            const grupo = estado.baixadas[chave].length - 1;
            estado.ordemBaixadas.push({ dupla: chave, grupo, jogadorId });
            if (estado.cartaJustificativa) estado.cartaJustificativa = null;
            atualizarPontuacao(estado, jogadorId);
            if (!estado.maos[jogadorId].length && !estado.mortosPegos[chave]) entregarMorto(estado, jogadorId);
            if (!estado.maos[jogadorId].length) encerrar(estado, js, jogadorId);
        }),

        encaixar: (grupoIndice, indices) => executarTransacao(salaRef, (estado, js) => {
            if (estado.tipo !== "buraco" || estado.atual !== jogadorId || estado.fim || estado.etapa !== "descartar") return;
            inicializarDuplas(estado);
            const chave = chaveDupla(estado, jogadorId);
            const grupo = estado.baixadas[chave]?.[grupoIndice];
            if (!grupo) return;
            const unicos = [...new Set(indices)].sort((a, b) => b - a);
            const cartas = unicos.map(indice => estado.maos[jogadorId]?.[indice]);
            if (cartas.some(carta => !carta) || !jogoValido([...grupo, ...cartas], estado)) return;
            unicos.forEach(indice => estado.maos[jogadorId].splice(indice, 1));
            grupo.push(...cartas);
            if (estado.cartaJustificativa && cartas.some(carta => carta.id === estado.cartaJustificativa)) estado.cartaJustificativa = null;
            atualizarPontuacao(estado, jogadorId);
            if (!estado.maos[jogadorId].length && !estado.mortosPegos[chave]) entregarMorto(estado, jogadorId);
            if (!estado.maos[jogadorId].length) encerrar(estado, js, jogadorId);
        }),

        descartar: indice => executarTransacao(salaRef, (estado, js) => {
            if (estado.tipo !== "buraco" || estado.atual !== jogadorId || estado.fim || estado.etapa !== "descartar") return;
            inicializarDuplas(estado);
            if (estado.cartaJustificativa) return;
            const carta = estado.maos[jogadorId]?.[indice];
            if (!carta) return;
            estado.maos[jogadorId].splice(indice, 1);
            estado.descarte.push(carta);
            atualizarPontuacao(estado, jogadorId);
            if (estado.maos[jogadorId].length && !encerrar(estado, js, jogadorId)) {
                estado.atual = proximoJogador(estado.ids, jogadorId);
                estado.etapa = "comprar";
            } else if (!estado.maos[jogadorId].length && !estado.mortosPegos[chaveDupla(estado, jogadorId)]) {
                estado.atual = proximoJogador(estado.ids, jogadorId);
                estado.etapa = "comprar";
            }
        })
    };
}
