import { executarTransacao, proximoJogador, nomeDe, criarBaralho, embaralhar } from "../jogo-base.js";

function valor(carta) { return ({ A: 14, K: 13, Q: 12, J: 11 }[carta.valor] || Number(carta.valor)); }
function comparar(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i++) { const diferenca = (a[i] || 0) - (b[i] || 0); if (diferenca) return diferenca; } return 0; }
function combinacoes(cartas, tamanho) {
    const resultado = [];
    function escolher(inicio, atual) {
        if (atual.length === tamanho) { resultado.push([...atual]); return; }
        for (let i = inicio; i < cartas.length; i++) { atual.push(cartas[i]); escolher(i + 1, atual); atual.pop(); }
    }
    escolher(0, []);
    return resultado;
}
function avaliar(cartas) {
    const valores = cartas.map(valor).sort((a, b) => b - a);
    const unicos = [...new Set(valores)];
    const flush = cartas.every(carta => carta.naipe === cartas[0].naipe);
    const sequencia = unicos.length === 5 && (unicos[0] - unicos[4] === 4 || JSON.stringify(unicos) === JSON.stringify([14, 5, 4, 3, 2]));
    const altoSequencia = unicos[0] === 14 && unicos[1] === 5 ? 5 : unicos[0];
    const contagem = {};
    valores.forEach(v => contagem[v] = (contagem[v] || 0) + 1);
    const grupos = Object.entries(contagem).map(([v, quantidade]) => [Number(v), quantidade]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const padrao = grupos.map(g => g[1]).join("");
    if (sequencia && flush) return [8, altoSequencia];
    if (padrao === "41") return [7, grupos[0][0], grupos[1][0]];
    if (padrao === "32") return [6, grupos[0][0], grupos[1][0]];
    if (flush) return [5, ...valores];
    if (sequencia) return [4, altoSequencia];
    if (padrao === "311") return [3, grupos[0][0], ...grupos.slice(1).map(g => g[0])];
    if (padrao === "221") return [2, grupos[0][0], grupos[1][0], grupos[2][0]];
    if (padrao === "2111") return [1, grupos[0][0], ...grupos.slice(1).map(g => g[0])];
    return [0, ...valores];
}
function melhorMao(cartas) { return combinacoes(cartas, 5).reduce((melhor, grupo) => { const atual = avaliar(grupo); return !melhor || comparar(atual, melhor) > 0 ? atual : melhor; }, null); }
function categoria(valorCategoria) { return ["carta alta", "um par", "dois pares", "trinca", "sequência", "flush", "full house", "quadra", "straight flush"][valorCategoria] || "mão"; }
function ativos(estado) { return estado.ids.filter(id => !estado.fold[id]); }
function proximoAtivo(estado, id) { let proximo = proximoJogador(estado.ids, id); while (estado.fold[proximo] || estado.allin[proximo]) proximo = proximoJogador(estado.ids, proximo); return proximo; }
function distribuirPote(estado, vencedores) { const premio = Math.floor(estado.pote / vencedores.length); vencedores.forEach(id => estado.fichas[id] = (estado.fichas[id] || 0) + premio); estado.pote = 0; }

function encerrarPorFold(estado, jogadores) {
    const restantes = ativos(estado);
    if (restantes.length !== 1) return false;
    estado.fim = true;
    estado.vencedores = restantes;
    distribuirPote(estado, restantes);
    estado.resultado = `${nomeDe(jogadores, restantes[0])} venceu por desistência!`;
    return true;
}

function avancar(estado, jogadores) {
    if (encerrarPorFold(estado, jogadores)) return;
    const emJogo = ativos(estado);
    const todosAgiram = emJogo.every(id => estado.agiram[id] || estado.allin[id]);
    const apostasIguais = emJogo.filter(id => !estado.allin[id]).every(id => (estado.apostas[id] || 0) === estado.apostaAtual);
    if (!todosAgiram || !apostasIguais) return;
    if (estado.fase === "pre-flop") { estado.mesa.push(estado.deck.pop(), estado.deck.pop(), estado.deck.pop()); estado.fase = "flop"; }
    else if (estado.fase === "flop") { estado.mesa.push(estado.deck.pop()); estado.fase = "turn"; }
    else if (estado.fase === "turn") { estado.mesa.push(estado.deck.pop()); estado.fase = "river"; }
    else {
        const pontuacoes = emJogo.map(id => [id, melhorMao([...estado.maos[id], ...estado.mesa])]);
        const melhor = pontuacoes.reduce((atual, [, score]) => !atual || comparar(score, atual) > 0 ? score : atual, null);
        const vencedores = pontuacoes.filter(([, score]) => comparar(score, melhor) === 0).map(([id]) => id);
        estado.fim = true;
        estado.vencedores = vencedores;
        distribuirPote(estado, vencedores);
        estado.resultado = `Showdown: ${vencedores.map(id => nomeDe(jogadores, id)).join(", ")} venceu com ${categoria(melhor[0])}.`;
        return;
    }
    estado.agiram = {};
    estado.apostas = Object.fromEntries(estado.ids.map(id => [id, 0]));
    estado.apostaAtual = 0;
    estado.atual = estado.ids.find(id => !estado.fold[id] && !estado.allin[id]);
}

export function criarEstado(ids) {
    const deck = embaralhar(criarBaralho());
    const maos = Object.fromEntries(ids.map(id => [id, [deck.pop(), deck.pop()]]));
    const fichas = Object.fromEntries(ids.map(id => [id, 1000]));
    const small = ids[0];
    const big = ids[1] || ids[0];
    fichas[small] -= 5;
    fichas[big] -= 10;
    return { tipo: "poker", ids, deck, maos, mesa: [], atual: ids.length === 2 ? small : ids[2 % ids.length], fase: "pre-flop", fichas, apostaAtual: 10, apostas: { [small]: 5, [big]: 10 }, pote: ids.length === 1 ? 0 : 15, agiram: {}, fold: {}, allin: {}, fim: false, resultado: "" };
}

export function acoesPoker(salaRef, jogadorId) {
    return {
        fold: () => executarTransacao(salaRef, (estado, jogadores) => {
            if (estado.tipo !== "poker" || estado.fim || estado.atual !== jogadorId) return;
            estado.fold[jogadorId] = true;
            estado.agiram[jogadorId] = true;
            estado.atual = proximoAtivo(estado, jogadorId);
            avancar(estado, jogadores);
        }),
        call: () => executarTransacao(salaRef, (estado, jogadores) => {
            if (estado.tipo !== "poker" || estado.fim || estado.atual !== jogadorId) return;
            const pagar = Math.min(Math.max(0, estado.apostaAtual - (estado.apostas[jogadorId] || 0)), estado.fichas[jogadorId]);
            estado.fichas[jogadorId] -= pagar;
            estado.pote += pagar;
            estado.apostas[jogadorId] = (estado.apostas[jogadorId] || 0) + pagar;
            estado.agiram[jogadorId] = true;
            if (!estado.fichas[jogadorId] && estado.apostas[jogadorId] < estado.apostaAtual) estado.allin[jogadorId] = true;
            estado.atual = proximoAtivo(estado, jogadorId);
            avancar(estado, jogadores);
        }),
        raise: valorAumento => executarTransacao(salaRef, (estado, jogadores) => {
            if (estado.tipo !== "poker" || estado.fim || estado.atual !== jogadorId || !Number.isFinite(valorAumento) || valorAumento < 1) return;
            const total = estado.apostaAtual + Math.floor(valorAumento);
            const pagar = total - (estado.apostas[jogadorId] || 0);
            if (pagar > estado.fichas[jogadorId]) return;
            estado.fichas[jogadorId] -= pagar;
            estado.pote += pagar;
            estado.apostas[jogadorId] = total;
            estado.apostaAtual = total;
            estado.agiram = { [jogadorId]: true };
            estado.atual = proximoAtivo(estado, jogadorId);
            avancar(estado, jogadores);
        })
    };
}