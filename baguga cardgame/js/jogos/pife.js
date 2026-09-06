import { executarTransacao, proximoJogador, nomeDe, criarBaralho, embaralhar, rank, mostrarToast } from "../jogo-base.js";

function combinacaoValida(grupo) {
    if (grupo.length < 3) return false;
    const mesmoValor = grupo.every(c => c.valor === grupo[0].valor);
    if (mesmoValor) return grupo.length <= 4;
    const mesmoNaipe = grupo.every(c => c.naipe === grupo[0].naipe);
    const ranks = grupo.map(rank).sort((a,b) => a-b);
    return mesmoNaipe && ranks.every((v,i) => i===0 || v === ranks[i-1]+1);
}

function podeBater(mao) {
    if (!mao.length) return true;
    if (mao.length < 3) return false;
    for (let mask = 1; mask < (1 << mao.length); mask++) {
        const grupo = mao.filter((_, i) => mask & (1 << i));
        if (!combinacaoValida(grupo)) continue;
        const resto = mao.filter((_, i) => !(mask & (1 << i)));
        if (podeBater(resto)) return true;
    }
    return false;
}

function escolherDescarte(mao) {
    const contagem = {};
    mao.forEach(c => contagem[c.valor] = (contagem[c.valor] || 0) + 1);
    let candidatos = mao.map((c,i) => ({c,i})).filter(x => contagem[x.c.valor] === 1);
    if (!candidatos.length) candidatos = mao.map((c,i) => ({c,i}));
    candidatos.sort((a,b) => rank(b.c) - rank(a.c));
    return candidatos[0].i;
}

export function criarEstado(ids) {
    const baralho = embaralhar(criarBaralho());
    const maos = Object.fromEntries(ids.map(id => [id, []]));
    ids.forEach(id => maos[id] = Array.from({ length: 9 }, () => baralho.pop()));
    return {
        tipo: "pife", ids, deck: baralho, maos, descarte: [baralho.pop()],
        atual: ids[0], etapa: "comprar", fim: false, resultado: ""
    };
}

export function acoesPife(salaRef, jogadorId) {
    return {
        comprar: () => executarTransacao(salaRef, (estado, js) => {
            if (estado.atual !== jogadorId || estado.fim || estado.etapa !== "comprar") return;
            if (!estado.deck.length) {
                estado.fim = true;
                estado.resultado = "Baralho acabou. Empate!";
                return;
            }
            estado.maos[jogadorId].push(estado.deck.pop());
            estado.etapa = "descartar";
        }),
        descartar: (indice) => executarTransacao(salaRef, (estado, js) => {
            if (estado.atual !== jogadorId || estado.fim || estado.etapa !== "descartar") return;
            const carta = estado.maos[jogadorId]?.[indice];
            if (!carta) return;
            estado.maos[jogadorId].splice(indice, 1);
            estado.descarte.push(carta);
            if (podeBater(estado.maos[jogadorId])) {
                estado.fim = true;
                estado.vencedores = [jogadorId];
                estado.resultado = `${nomeDe(js, jogadorId)} bateu!`;
                mostrarToast(estado.resultado, "success");
            } else {
                estado.atual = proximoJogador(estado.ids, jogadorId);
                estado.etapa = "comprar";
            }
        })
    };
}