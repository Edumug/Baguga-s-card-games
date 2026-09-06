import { acoesTruco } from "../jogos/truco.js";
import { acoesBlackjack } from "../jogos/blackjack.js";
import { acoesPife } from "../jogos/pife.js";
import { acoesBuraco } from "../jogos/buraco.js";
import { acoesPoker } from "../jogos/poker.js";

export function executarAcaoBot(estado, jogadorId, salaRef) {
    const acoes = {
        truco: acoesTruco,
        blackjack: acoesBlackjack,
        pife: acoesPife,
        buraco: acoesBuraco,
        poker: acoesPoker
    }[estado.tipo];

    if (!acoes) return;
    const acao = acoes(salaRef, jogadorId);

    switch (estado.tipo) {
        case "truco": {
            // Se tem pedido para ele, aceita
            if (estado.pedido?.para === jogadorId) {
                acao.responder("aceitar");
            } else {
                // Joga a primeira carta
                acao.jogar(0);
            }
            break;
        }
        case "blackjack": {
            // Se pontuação < 17, compra; senão para
            const mao = estado.maos[jogadorId] || [];
            const pontuacao = mao.reduce((soma, c) => soma + (c.valor === "A" ? 11 : ["J","Q","K"].includes(c.valor) ? 10 : Number(c.valor)), 0);
            if (pontuacao < 17) acao.comprar();
            else acao.parar();
            break;
        }
        case "pife": {
            if (estado.etapa === "comprar") acao.comprar();
            else acao.descartar(estado.maos[jogadorId].length - 1);
            break;
        }
        case "buraco": {
            if (estado.etapa === "comprar") acao.comprar();
            else {
                // tenta baixar uma sequência simples
                const mao = estado.maos[jogadorId] || [];
                const valores = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
                let indices = [];
                for (let i = 0; i < valores.length - 2 && indices.length === 0; i++) {
                    for (const naipe of ["♠","♥","♦","♣"]) {
                        const seq = valores.slice(i, i+3).map(v => mao.findIndex(c => c.valor === v && c.naipe === naipe));
                        if (seq.every(idx => idx !== -1)) { indices = seq; break; }
                    }
                }
                if (indices.length === 3) acao.baixar(indices);
                else acao.descartar(mao.length - 1);
            }
            break;
        }
        case "poker": {
            if (estado.fase === "pre-flop" && (estado.apostas[jogadorId] || 0) < estado.apostaAtual) {
                acao.call();
            } else {
                acao.call();
            }
            break;
        }
    }
}