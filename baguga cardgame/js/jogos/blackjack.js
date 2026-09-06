import { executarTransacao, proximoJogador, nomeDe, criarBaralho, embaralhar } from "../jogo-base.js";

export const pontuacao = mao => {
    let total = 0;
    let ases = 0;
    mao.forEach(carta => {
        if (carta.valor === "A") { total += 11; ases++; }
        else total += ["J", "Q", "K"].includes(carta.valor) ? 10 : Number(carta.valor);
    });
    while (total > 21 && ases) { total -= 10; ases--; }
    return total;
};

function encerrar(estado, jogadores) {
    const dealerNatural = estado.dealer.length === 2 && pontuacao(estado.dealer) === 21;
    while (pontuacao(estado.dealer) < 17 && estado.deck.length) estado.dealer.push(estado.deck.pop());
    const dealer = pontuacao(estado.dealer);
    const vencedores = estado.ids.filter(id => {
        const natural = estado.maos[id].length === 2 && pontuacao(estado.maos[id]) === 21;
        return pontuacao(estado.maos[id]) <= 21 && (natural && !dealerNatural || !dealerNatural && (dealer > 21 || pontuacao(estado.maos[id]) > dealer));
    });
    const empates = estado.ids.filter(id => !vencedores.includes(id) && pontuacao(estado.maos[id]) === dealer && dealer <= 21);
    estado.fim = true;
    estado.vencedores = vencedores;
    estado.empates = empates;
    estado.resultado = [
        vencedores.some(id => estado.maos[id].length === 2 && pontuacao(estado.maos[id]) === 21) ? "Blackjack!" : "",
        vencedores.length ? `Vencedor(es): ${vencedores.map(id => nomeDe(jogadores, id)).join(", ")}` : "",
        empates.length ? `Empate: ${empates.map(id => nomeDe(jogadores, id)).join(", ")}` : "",
        !vencedores.length && !empates.length ? "Dealer venceu" : "",
        `(dealer: ${dealer}).`
    ].filter(Boolean).join(" ");
}

function avancar(estado, jogadores) {
    const ativos = estado.ids.filter(id => !estado.parou[id] && pontuacao(estado.maos[id]) < 21);
    if (!ativos.length) encerrar(estado, jogadores);
    else estado.atual = ativos.includes(proximoJogador(estado.ids, estado.atual)) ? proximoJogador(estado.ids, estado.atual) : ativos[0];
}

export function criarEstado(ids) {
    const deck = embaralhar(criarBaralho());
    const maos = Object.fromEntries(ids.map(id => [id, [deck.pop(), deck.pop()]]));
    const parou = Object.fromEntries(ids.filter(id => pontuacao(maos[id]) === 21).map(id => [id, true]));
    return { tipo: "blackjack", ids, deck, maos, dealer: [deck.pop(), deck.pop()], atual: ids.find(id => !parou[id]) || ids[0], parou, fim: false, resultado: "" };
}

export function acoesBlackjack(salaRef, jogadorId) {
    return {
        comprar: () => executarTransacao(salaRef, (estado, jogadores) => {
            if (estado.tipo !== "blackjack" || estado.fim || estado.atual !== jogadorId) return;
            estado.maos[jogadorId].push(estado.deck.pop());
            if (pontuacao(estado.maos[jogadorId]) >= 21) { estado.parou[jogadorId] = true; avancar(estado, jogadores); }
        }),
        parar: () => executarTransacao(salaRef, (estado, jogadores) => {
            if (estado.tipo !== "blackjack" || estado.fim || estado.atual !== jogadorId) return;
            estado.parou[jogadorId] = true;
            avancar(estado, jogadores);
        })
    };
}