import * as Truco from "./jogos/truco.js";
import * as Blackjack from "./jogos/blackjack.js";
import * as Pife from "./jogos/pife.js";
import * as Buraco from "./jogos/buraco.js";
import * as Poker from "./jogos/poker.js";

const criadores = { truco: Truco, blackjack: Blackjack, pife: Pife, buraco: Buraco, poker: Poker };

export function criarEstadoPorJogo(tipo, ids, variacao) {
    const jogo = criadores[tipo];
    if (!jogo?.criarEstado) throw new Error(`Jogo desconhecido: ${tipo}`);
    return jogo.criarEstado(ids, variacao);
}

export const normalizarEstado = (estado) => {
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
    if (estado.tipo === "buraco") estado.variacao ??= "aberto";
    estado.etapa ??= "comprar";  // importante para buraco/pife
    estado.fim ??= false;
    estado.partidaEncerrada ??= false;
    estado.resultado ??= "";
    estado.atual ??= null;
    return estado;
};