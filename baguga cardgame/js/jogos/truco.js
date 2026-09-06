import { executarTransacao, proximoJogador, nomeDe, embaralhar, mostrarToast } from "../jogo-base.js";

const ORDEM_TRUCO = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
const ORDEM_NAIPE_MANILHA = { "♦": 0, "♠": 1, "♥": 2, "♣": 3 };
const VALORES_TRUCO = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];

function criarBaralhoTruco() {
    return ["♠", "♥", "♦", "♣"].flatMap(naipe => VALORES_TRUCO.map(valor => ({ id: valor + naipe, valor, naipe })));
}
function valorManilha(vira) {
    const idx = VALORES_TRUCO.indexOf(vira.valor);
    return VALORES_TRUCO[(idx + 1) % VALORES_TRUCO.length];
}
export function forcaTruco(carta, vira) {
    const manilha = valorManilha(vira);
    if (carta.valor === manilha) return 100 + ORDEM_NAIPE_MANILHA[carta.naipe];
    return ORDEM_TRUCO.indexOf(carta.valor);
}
export function pedidoSeguinte(valor) { return ({ 1: 3, 3: 6, 6: 9, 9: 12 })[valor] || null; }

function duplaDe(ids, id) {
    const indice = ids.indexOf(id);
    if (indice < 0) return null;
    return ids.length === 4 ? indice % 2 : indice;
}
function membrosDaDupla(ids, dupla) { return ids.filter(id => duplaDe(ids, id) === dupla); }
function nomeDupla(ids, dupla, js) { return membrosDaDupla(ids, dupla).map(id => nomeDe(js, id)).join(" e ") || `Dupla ${dupla + 1}`; }

export function criarEstado(ids) {
    const baralho = embaralhar(criarBaralhoTruco());
    const maos = Object.fromEntries(ids.map(id => [id, [baralho.pop(), baralho.pop(), baralho.pop()]]));
    return {
        tipo: "truco",
        modo: ids.length === 4 ? "duplas" : "mano-a-mano",
        ids,
        deck: baralho,
        maos,
        vira: baralho.pop(),
        atual: ids[0],
        jogadas: {},
        vazas: {},
        resultadosVazas: [],
        rodada: 1,
        valor: 1,
        pontosDupla: [0, 0],
        pedido: null,
        ultimoPedidoPor: null,
        fim: false,
        partidaEncerrada: false,
        resultado: ""
    };
}

function finalizarTruco(estado, js, dupla, mensagem) {
    estado.pontosDupla[dupla] += estado.valor;
    estado.fim = true;
    estado.vencedores = membrosDaDupla(estado.ids, dupla);
    estado.pedido = null;
    if (estado.pontosDupla[dupla] >= 12) {
        estado.partidaEncerrada = true;
        estado.resultado = `${mensagem} ${nomeDupla(estado.ids, dupla, js)} venceu a PARTIDA com ${estado.pontosDupla[dupla]} pontos! 🏆`;
    } else {
        estado.resultado = `${mensagem} ${nomeDupla(estado.ids, dupla, js)} ganha ${estado.valor} ponto${estado.valor > 1 ? "s" : ""}.`;
    }
}

export function resolverVaza(estado, js) {
    if (Object.keys(estado.jogadas).length < estado.ids.length) return;

    const jogadas = Object.entries(estado.jogadas);
    const maiorForca = Math.max(...jogadas.map(([, carta]) => forcaTruco(carta, estado.vira)));
    const vencedores = jogadas.filter(([, carta]) => forcaTruco(carta, estado.vira) === maiorForca).map(([id]) => id);
    const vencedor = vencedores.length === 1 ? vencedores[0] : null;
    const dupla = vencedor === null ? null : duplaDe(estado.ids, vencedor);
    estado.resultadosVazas.push(dupla);
    if (vencedor !== null) estado.vazas[vencedor] = (estado.vazas[vencedor] || 0) + 1;
    estado.jogadas = {};

    const resultados = estado.resultadosVazas;
    const contagem = [0, 0];
    resultados.forEach(resultado => { if (resultado !== null) contagem[resultado]++; });
    let duplaVencedora = contagem[0] >= 2 ? 0 : contagem[1] >= 2 ? 1 : null;

    if (duplaVencedora === null && resultados.length === 2) {
        if (resultados[0] === null && resultados[1] !== null) duplaVencedora = resultados[1];
        else if (resultados[1] === null && resultados[0] !== null) duplaVencedora = resultados[0];
    }
    if (duplaVencedora === null && resultados.length === 3) duplaVencedora = resultados[2] ?? resultados[1] ?? resultados[0];

    if (duplaVencedora !== null || resultados.length === 3) {
        if (duplaVencedora === null) {
            estado.fim = true;
            estado.resultado = "As três rodadas empataram. Ninguém pontua.";
            return;
        }
        estado.pontosDupla[duplaVencedora] += estado.valor;
        estado.fim = true;
        estado.vencedores = membrosDaDupla(estado.ids, duplaVencedora);
        if (estado.pontosDupla[duplaVencedora] >= 12) {
            estado.partidaEncerrada = true;
            estado.resultado = `${nomeDupla(estado.ids, duplaVencedora, js)} venceu a PARTIDA com ${estado.pontosDupla[duplaVencedora]} pontos!`;
        } else {
            estado.resultado = `${nomeDupla(estado.ids, duplaVencedora, js)} venceu a mão por ${estado.valor} ponto${estado.valor > 1 ? "s" : ""}!`;
        }
    } else {
        estado.rodada++;
        estado.atual = vencedor || estado.ids[0];
    }
}

export function acoesTruco(salaRef, jogadorId) {
    return {
        pedir: valor => executarTransacao(salaRef, (estado, js) => {
            if (estado.tipo !== "truco" || estado.fim || estado.atual !== jogadorId || estado.pedido) return;
            if (estado.ultimoPedidoPor === jogadorId || pedidoSeguinte(estado.valor) !== valor) return;

            const dupla = duplaDe(estado.ids, jogadorId);
            if (estado.pontosDupla[dupla] === 11) {
                finalizarTruco(estado, js, 1 - dupla, `${nomeDe(js, jogadorId)} pediu na mão de onze e perdeu.`);
                return;
            }

            estado.pedido = { de: jogadorId, valor, para: proximoJogador(estado.ids, jogadorId) };
            estado.ultimoPedidoPor = jogadorId;
            mostrarToast(`${nomeDe(js, jogadorId)} pediu ${valor}!`, "info");
        }),

        responder: resposta => executarTransacao(salaRef, (estado, js) => {
            if (estado.tipo !== "truco" || estado.fim || !estado.pedido || estado.pedido.para !== jogadorId) return;

            const pedidoAtual = estado.pedido;
            const duplaPedido = duplaDe(estado.ids, pedidoAtual.de);

            if (resposta === "recusar") {
                finalizarTruco(estado, js, duplaPedido, `${nomeDe(js, jogadorId)} correu do pedido.`);
                mostrarToast(`${nomeDe(js, jogadorId)} correu!`, "danger");
                return;
            }

            if (resposta === "aceitar") {
                estado.valor = pedidoAtual.valor;
                estado.pedido = null;
                estado.atual = pedidoAtual.de;
                mostrarToast("Truco aceito!", "success");
                return;
            }

            const proximo = pedidoSeguinte(pedidoAtual.valor);
            if (proximo) {
                estado.pedido = { de: jogadorId, valor: proximo, para: pedidoAtual.de };
                estado.ultimoPedidoPor = jogadorId;
                mostrarToast(`${nomeDe(js, jogadorId)} aumentou para ${proximo}!`, "info");
            }
        }),

        jogar: indice => executarTransacao(salaRef, (estado, js) => {
            if (estado.tipo !== "truco" || estado.fim || estado.atual !== jogadorId || estado.pedido) return;
            const carta = estado.maos[jogadorId]?.[indice];
            if (!carta) return;
            estado.maos[jogadorId].splice(indice, 1);
            estado.jogadas[jogadorId] = carta;
            estado.atual = proximoJogador(estado.ids, jogadorId);
            resolverVaza(estado, js);
        })
    };
}
