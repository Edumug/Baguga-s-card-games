const botao = document.getElementById("btnTutorial");
const painel = document.getElementById("tutorialJogo");
const fechar = document.getElementById("fecharTutorial");
const nomeJogo = document.getElementById("nomeJogo");
const textoTutorial = document.getElementById("textoTutorial");

const tutoriais = {
    Truco: `
        <p><strong>Objetivo:</strong> fazer pontos vencendo as rodadas.</p>
        <p><strong>Como jogar:</strong> jogue uma carta por vez e tente ganhar a vaza.</p>
        <p><strong>Truco:</strong> você pode aumentar a aposta usando os botões de Truco, 6, 9 ou 12.</p>
    `,
    Buraco: `
        <p><strong>Objetivo:</strong> formar sequências de cartas e fazer canastras.</p>
        <p><strong>Como jogar:</strong> compre cartas, baixe jogos válidos, encaixe cartas nas sequências e descarte uma carta.</p>
        <p><strong>Dica:</strong> organize suas cartas antes de baixar uma sequência.</p>
    `,
    Pife: `
        <p><strong>Objetivo:</strong> formar combinações válidas com suas cartas.</p>
        <p><strong>Como jogar:</strong> compre uma carta, organize sua mão e descarte uma carta.</p>
        <p><strong>Dica:</strong> procure formar sequências e grupos de mesmo valor.</p>
    `,
    Blackjack: `
        <p><strong>Objetivo:</strong> chegar o mais perto possível de 21 sem ultrapassar.</p>
        <p><strong>Comprar:</strong> recebe outra carta. <strong>Passar:</strong> mantém sua mão.</p>
        <p><strong>Ás:</strong> vale 11 ou 1 automaticamente, dependendo da pontuação da mão.</p>
    `,
    Poker: `
        <p><strong>Objetivo:</strong> formar a melhor combinação de cartas.</p>
        <p><strong>Desistir:</strong> sai da rodada. <strong>Pagar:</strong> acompanha a aposta. <strong>Aumentar:</strong> aumenta a aposta.</p>
        <p><strong>Dica:</strong> observe as cartas da mesa e as ações dos outros jogadores.</p>
    `
};

function atualizarTutorial() {
    const jogo = nomeJogo?.textContent?.trim();
    textoTutorial.innerHTML = tutoriais[jogo] || `
        <p>O tutorial deste jogo será carregado assim que a partida terminar de carregar.</p>
        <p>Use suas cartas e os botões de ação para jogar.</p>
    `;
}

botao?.addEventListener("click", () => {
    atualizarTutorial();
    painel.classList.remove("escondido");
});

fechar?.addEventListener("click", () => painel.classList.add("escondido"));

painel?.addEventListener("click", evento => {
    if (evento.target === painel) painel.classList.add("escondido");
});

setInterval(() => {
    if (!painel?.classList.contains("escondido")) atualizarTutorial();
}, 500);