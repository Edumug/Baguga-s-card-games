const estilos = document.createElement("style");
estilos.textContent = `
.btn-tutorial{width:30px!important;height:30px;padding:0!important;border-radius:50%!important;font-size:17px!important;font-weight:800;cursor:pointer}
.topo-acoes{display:flex;align-items:center;gap:8px}
.tutorial-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}
.tutorial-overlay.escondido{display:none}
.tutorial-caixa{width:min(430px,calc(100vw - 32px));max-height:70vh;overflow:auto;background:#fff;border:1px solid #ddd;border-radius:12px;box-shadow:0 10px 35px rgba(0,0,0,.2);padding:18px}
.tutorial-cabecalho{display:flex;align-items:center;justify-content:space-between;gap:10px}
.tutorial-cabecalho h2{margin:0;font-size:18px;color:#111}
.tutorial-fechar{border:0;background:transparent;font-size:26px;cursor:pointer;color:#555}
.tutorial-conteudo{margin-top:10px;color:#555;font-size:13px;line-height:1.55}
.tutorial-conteudo p{margin:8px 0}.tutorial-conteudo strong{color:#111}
`;
document.head.appendChild(estilos);

const sair = document.getElementById("btnSair");
const topo = sair?.parentElement;
const acoesTopo = document.createElement("div");
acoesTopo.className = "topo-acoes";
const botao = document.createElement("button");
botao.id = "btnTutorial";
botao.className = "btn-tutorial";
botao.title = "Tutorial";
botao.textContent = "!";
topo?.replaceChildren(...Array.from(topo.children).filter(el => el !== sair));
topo?.appendChild(acoesTopo);
acoesTopo.appendChild(botao);
acoesTopo.appendChild(sair);

const overlay = document.createElement("div");
overlay.id = "tutorialJogo";
overlay.className = "tutorial-overlay escondido";
overlay.innerHTML = `<div class="tutorial-caixa"><div class="tutorial-cabecalho"><h2>Como jogar</h2><button class="tutorial-fechar" title="Fechar">×</button></div><div class="tutorial-conteudo"></div></div>`;
document.querySelector(".mesa")?.appendChild(overlay);

const fechar = overlay.querySelector(".tutorial-fechar");
const conteudo = overlay.querySelector(".tutorial-conteudo");
const nomeJogo = document.getElementById("nomeJogo");

const tutoriais = {
    Truco:`<p><strong>Objetivo:</strong> fazer pontos vencendo as rodadas.</p><p><strong>Como jogar:</strong> jogue uma carta por vez e tente ganhar a vaza.</p><p><strong>Truco:</strong> use os botões para aumentar a aposta da rodada.</p>`,
    Buraco:`<p><strong>Objetivo:</strong> formar sequências e canastras.</p><p><strong>Como jogar:</strong> compre cartas, baixe jogos válidos, encaixe cartas e descarte uma.</p><p><strong>Dica:</strong> organize sua mão antes de baixar.</p>`,
    Pife:`<p><strong>Objetivo:</strong> formar combinações válidas com suas cartas.</p><p><strong>Como jogar:</strong> compre uma carta, organize sua mão e descarte uma.</p>`,
    Blackjack:`<p><strong>Objetivo:</strong> chegar o mais perto possível de 21 sem ultrapassar.</p><p><strong>Comprar:</strong> recebe outra carta. <strong>Passar:</strong> mantém sua mão.</p><p><strong>Ás:</strong> vale 11 ou 1 automaticamente.</p>`,
    Poker:`<p><strong>Objetivo:</strong> formar a melhor combinação de cartas.</p><p><strong>Desistir:</strong> sai da rodada. <strong>Pagar:</strong> acompanha a aposta. <strong>Aumentar:</strong> aumenta a aposta.</p>`
};

function atualizar(){
    const jogo=nomeJogo?.textContent?.trim();
    conteudo.innerHTML=tutoriais[jogo]||`<p>O tutorial será atualizado assim que o jogo terminar de carregar.</p><p>Use suas cartas e os botões de ação para jogar.</p>`;
}

botao.addEventListener("click",()=>{atualizar();overlay.classList.remove("escondido")});
fechar.addEventListener("click",()=>overlay.classList.add("escondido"));
overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.classList.add("escondido")});