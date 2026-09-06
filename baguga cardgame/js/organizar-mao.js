(() => {
    const mao = document.getElementById("minhasCartas");
    if (!mao) return;

    const params = new URLSearchParams(location.search);
    const codigo = params.get("codigo") || "sem-sala";
    const jogadorId = sessionStorage.getItem("jogadorId") || "jogador";
    const chaveStorage = `ordemCartas:${codigo}:${jogadorId}`;

    let arrastando = null;
    let mudou = false;
    let aplicando = false;
    let timerAplicar = null;

    function chaveCarta(carta, indice) {
        const valor = carta.dataset.ordemCarta || carta.textContent.trim();
        return `${valor}#${indice}`;
    }

    function listaChaves() {
        const ocorrencias = {};
        return [...mao.children].map(carta => {
            const base = carta.dataset.cartaId || carta.textContent.trim();
            ocorrencias[base] = (ocorrencias[base] || 0) + 1;
            return `${base}#${ocorrencias[base]}`;
        });
    }

    function salvarOrdem() {
        try {
            localStorage.setItem(chaveStorage, JSON.stringify(listaChaves()));
        } catch (_) {}
    }

    function chaveAtual(carta, ocorrencias) {
        const base = carta.dataset.cartaId || carta.textContent.trim();
        ocorrencias[base] = (ocorrencias[base] || 0) + 1;
        return `${base}#${ocorrencias[base]}`;
    }

    function aplicarOrdem() {
        if (aplicando || !mao.children.length) return;

        let salva;
        try {
            salva = JSON.parse(localStorage.getItem(chaveStorage) || "null");
        } catch (_) {
            salva = null;
        }
        if (!Array.isArray(salva) || !salva.length) return;

        const cartas = [...mao.children];
        const ocorrencias = {};
        const mapa = new Map();

        cartas.forEach(carta => {
            const chave = chaveAtual(carta, ocorrencias);
            carta.dataset.ordemCarta = chave;
            mapa.set(chave, carta);
        });

        const ordenadas = [];
        salva.forEach(chave => {
            const carta = mapa.get(chave);
            if (carta) {
                ordenadas.push(carta);
                mapa.delete(chave);
            }
        });
        mapa.forEach(carta => ordenadas.push(carta));

        if (ordenadas.length !== cartas.length || ordenadas.some((c, i) => c !== cartas[i])) {
            aplicando = true;
            ordenadas.forEach(carta => mao.appendChild(carta));
            aplicando = false;
        }
    }

    function agendarAplicacao() {
        clearTimeout(timerAplicar);
        timerAplicar = setTimeout(aplicarOrdem, 30);
    }

    function atualizarArraste() {
        [...mao.children].forEach(carta => {
            carta.draggable = true;
            carta.classList.add("carta-arrastavel");

            if (carta.dataset.dragConfigurado) return;
            carta.dataset.dragConfigurado = "1";

            carta.addEventListener("dragstart", evento => {
                arrastando = carta;
                mudou = false;
                carta.classList.add("arrastando");
                evento.dataTransfer.effectAllowed = "move";
                evento.dataTransfer.setData("text/plain", "carta");
            });

            carta.addEventListener("dragover", evento => {
                evento.preventDefault();
                if (!arrastando || arrastando === carta) return;

                const rect = carta.getBoundingClientRect();
                const depois = evento.clientX > rect.left + rect.width / 2;
                mao.insertBefore(arrastando, depois ? carta.nextSibling : carta);
                mudou = true;
            });

            carta.addEventListener("dragend", () => {
                carta.classList.remove("arrastando");
                if (arrastando && mudou) salvarOrdem();
                arrastando = null;
                mudou = false;
            });
        });
    }

    const observer = new MutationObserver(() => {
        atualizarArraste();
        if (!aplicando) agendarAplicacao();
    });

    observer.observe(mao, { childList: true });
    atualizarArraste();
    aplicarOrdem();
})();
