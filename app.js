/* =============================================================================
   macds — comportamento do site-currículo.
   Sem dependências. Tudo em transform / opacity.

   PRINCÍPIO: animação é aprimoramento, nunca requisito. Todo estado inicial
   escondido só existe depois que o JS confirma que consegue revelá-lo, e há
   failsafe por tempo. Se qualquer coisa falhar, o conteúdo aparece.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 900px)');
  var hoverable = window.matchMedia('(hover: hover) and (pointer: fine)');
  function motionOK() { return !reduce.matches; }

  /* Marca que o JS está vivo. Só a partir daqui o CSS pode esconder algo. */
  root.classList.add('js');

  function revealAll() {
    var els = document.querySelectorAll('.reveal, .sweep-char');
    for (var i = 0; i < els.length; i++) els[i].classList.add('is-in');
  }

  /* Failsafe absoluto: nada fica escondido por mais de 2,5s, aconteça o que
     acontecer com o observer, com a rolagem ou com um erro mais adiante. */
  setTimeout(revealAll, 2500);
  window.addEventListener('error', revealAll);

  /* =============================== TEMA ================================= */
  /* O valor inicial já foi aplicado por um script síncrono no <head>: aqui só
     tratamos a troca. Se isto fosse a única aplicação, a página pintaria no
     tema errado e piscaria no primeiro paint. */
  var TEMA_KEY = 'macds-theme';

  function temaAtual() {
    return root.dataset.theme === 'light' ? 'light' : 'dark';
  }

  function aplicarTema(t, guardar) {
    if (t === 'light') root.dataset.theme = 'light';
    else delete root.dataset.theme;

    root.style.colorScheme = t;

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#FCFCFD' : '#050506');

    var btn = document.getElementById('js-theme');
    if (btn) {
      btn.setAttribute('aria-label',
        t === 'light' ? 'Alternar para tema escuro' : 'Alternar para tema claro');
    }

    if (guardar) { try { localStorage.setItem(TEMA_KEY, t); } catch (e) {} }
    document.dispatchEvent(new CustomEvent('macds:tema', { detail: { tema: t } }));
  }

  (function botaoTema() {
    var btn = document.getElementById('js-theme');
    if (!btn) return;
    aplicarTema(temaAtual(), false);
    btn.addEventListener('click', function () {
      aplicarTema(temaAtual() === 'light' ? 'dark' : 'light', true);
    });

    /* segue a preferência do sistema enquanto o visitante não escolher */
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var ouvir = function () {
      var salvo = null;
      try { salvo = localStorage.getItem(TEMA_KEY); } catch (e) {}
      if (!salvo) aplicarTema(mq.matches ? 'light' : 'dark', false);
    };
    if (mq.addEventListener) mq.addEventListener('change', ouvir);
    else if (mq.addListener) mq.addListener(ouvir);
  })();

  /* ------------------------------------------------- altura real da nav ---- */
  /* A barra tem altura variável: quebra em duas linhas abaixo de 900px, muda
     com zoom e muda quando as webfonts trocam a métrica. O hero precisa saber
     essa altura para não abrir o conteúdo embaixo dela.

     ATENÇÃO — a variável escrita aqui (--nav-real) NÃO pode ser a mesma que a
     barra consome (--nav-h, no min-height do .nav__inner). Se for, cada
     medição altera o objeto medido, o ResizeObserver dispara de novo e a barra
     cresce indefinidamente. Foi exatamente esse loop que quebrou a versão
     anterior. Quem mede e quem é medido ficam separados. */
  (function navHeight() {
    var navEl = document.getElementById('js-nav');
    if (!navEl) return;

    var last = -1;
    var pending = false;

    function apply() {
      if (pending) return;
      pending = true;
      /* medir e escrever no mesmo tick do observer gera o aviso
         "ResizeObserver loop"; adiar um quadro resolve */
      requestAnimationFrame(function () {
        pending = false;
        var h = Math.round(navEl.getBoundingClientRect().height);
        /* guarda dupla: ignora ruído sub-pixel e valores absurdos */
        if (h <= 0 || h > 260 || Math.abs(h - last) < 2) return;
        last = h;
        root.style.setProperty('--nav-real', h + 'px');
      });
    }
    apply();

    if ('ResizeObserver' in window) new ResizeObserver(apply).observe(navEl);
    else window.addEventListener('resize', apply, { passive: true });

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(apply);
    window.addEventListener('orientationchange', function () { setTimeout(apply, 150); });
  })();

  /* ----------------------------------------------------- menu hambúrguer --- */
  (function burgerMenu() {
    var navEl = document.getElementById('js-nav');
    var btn = document.getElementById('js-burger');
    var menu = document.getElementById('js-menu');
    var scrim = document.getElementById('js-scrim');
    if (!navEl || !btn || !menu) return;

    var open = false;
    var lastY = 0;

    function setOpen(v) {
      if (open === v) return;
      open = v;
      btn.setAttribute('aria-expanded', String(v));
      btn.setAttribute('aria-label', v ? 'Fechar menu' : 'Abrir menu');
      navEl.dataset.menu = v ? 'open' : 'closed';
      if (scrim) scrim.hidden = !v;

      /* trava a rolagem do fundo sem deixar a página saltar para o topo */
      if (v) {
        lastY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = (-lastY) + 'px';
        document.body.style.width = '100%';
      } else if (document.body.style.position === 'fixed') {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, lastY);
      }
    }

    btn.addEventListener('click', function () { setOpen(!open); });
    if (scrim) scrim.addEventListener('click', function () { setOpen(false); });

    /* qualquer link fecha o menu antes de rolar até a âncora */
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { setOpen(false); btn.focus(); }
    });

    /* voltando ao desktop com o menu aberto, o painel some: destravar */
    var mq = window.matchMedia('(min-width: 901px)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(
      function () { if (mq.matches) setOpen(false); }
    );

    setOpen(false);
    navEl.dataset.menu = 'closed';
  })();

  /* ---------------------------------------------------------------- ano ---- */
  var year = document.getElementById('js-year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------- sweep por caractere ---- */
  document.querySelectorAll('[data-sweep]').forEach(function (el) {
    var text = el.textContent.trim();
    if (!text) return;

    /* monta fora do DOM e só então substitui: se algo falhar no meio,
       o texto original continua na tela. */
    var frag = document.createDocumentFragment();
    text.split('').forEach(function (ch, i) {
      var span = document.createElement('span');
      span.className = 'sweep-char';
      span.textContent = ch;
      span.style.transitionDelay = (i * 24) + 'ms';
      frag.appendChild(span);
    });

    el.setAttribute('aria-label', text);
    el.textContent = '';
    el.appendChild(frag);

    var chars = el.querySelectorAll('.sweep-char');
    if (!motionOK()) {
      chars.forEach(function (c) { c.classList.add('is-in'); });
      return;
    }
    requestAnimationFrame(function () {
      setTimeout(function () {
        chars.forEach(function (c) { c.classList.add('is-in'); });
      }, 100);
    });
  });

  /* ------------------------------------------------------------- reveal ---- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (!motionOK() || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, {
      /* threshold 0: qualquer pixel visível já conta. Threshold percentual
         quebra em blocos mais altos que a viewport. */
      threshold: 0,
      rootMargin: '0px 0px -6% 0px'
    });

    reveals.forEach(function (el) {
      /* Já visível no primeiro paint: aparece direto. O sistema proíbe
         animação de entrada em elemento que já está na tela. */
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) { el.classList.add('is-in'); return; }
      io.observe(el);
    });
  }

  /* ============================== ROTEADOR ============================== */
  /* Cada seção da nav é uma página. Rotas por hash (#/sobre) porque hash é a
     única forma que funciona em file://, em hospedagem estática e no
     recarregar, sem precisar de servidor configurado.

     O conteúdo NUNCA depende do roteador para existir: sem JS o <noscript>
     mostra todas as páginas empilhadas, e a leitura continua completa. */
  var ROTAS = ['inicio', 'stack', 'projetos', 'experiencia', 'formacao', 'contato'];

  /* "sobre" não é página: é a segunda seção da home. A rota existe para o link
     da nav e para link direto continuarem funcionando — ela abre a home e
     rola até a seção. */
  var ANCORAS = { sobre: { pagina: 'inicio', alvo: 'sobre' } };
  var TITULOS = {
    inicio:      'Matheus Alves — Desenvolvedor Front-End & UI/UX Designer | Recife-PE',
    sobre:       'Sobre — Matheus Alves',
    stack:       'Stack — Matheus Alves',
    projetos:    'Projetos — Matheus Alves',
    experiencia: 'Experiência — Matheus Alves',
    formacao:    'Formação — Matheus Alves',
    contato:     'Contato — Matheus Alves'
  };
  var ROTULOS = {
    sobre: 'sobre', stack: 'stack', projetos: 'projetos',
    experiencia: 'experiência', formacao: 'formação', contato: 'contato'
  };

  var paginas = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-page]'), function (el) {
    paginas[el.dataset.page] = el;
  });

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
  var live = document.getElementById('js-route-live');
  var nav = document.getElementById('js-nav');
  var progress = document.getElementById('js-progress');

  /* FILAMENTO INDICADOR
     Um único traço que viaja entre os itens em vez de acender e apagar um
     sublinhado por item. O deslocamento é a mensagem: mostra de onde você
     saiu e onde chegou, coisa que um estado ligado/desligado não comunica.
     Só transform — largura fica em 1px e o tamanho vem de scaleX. */
  var indicador = document.getElementById('js-nav-indicator');
  var indicadorPronto = false;
  var timerHalo = 0;

  function moverIndicador(link, animar) {
    if (!indicador || !link) return;
    if (!desktop.matches) { indicador.style.opacity = '0'; return; }

    var pai = indicador.parentElement;
    if (!pai) return;
    var rp = pai.getBoundingClientRect();
    var rl = link.getBoundingClientRect();
    if (!rl.width) return;

    /* primeiro posicionamento sem transição: o sistema proíbe animar a
       entrada de algo que já nasce visível na tela */
    if (!animar || !indicadorPronto) indicador.classList.remove('is-ready');

    indicador.style.transform =
      'translate3d(' + (rl.left - rp.left).toFixed(2) + 'px,0,0) scaleX(' + rl.width.toFixed(2) + ')';

    if (!indicadorPronto) {
      requestAnimationFrame(function () {
        indicador.classList.add('is-ready');
        indicadorPronto = true;
      });
    } else if (animar && motionOK()) {
      indicador.classList.add('is-ready', 'is-landing');
      clearTimeout(timerHalo);
      timerHalo = setTimeout(function () { indicador.classList.remove('is-landing'); }, 420);
    } else {
      indicador.classList.add('is-ready');
    }
  }

  function esconderIndicador() {
    if (indicador) { indicador.classList.remove('is-ready', 'is-landing'); indicador.style.opacity = '0'; }
  }

  function rotaBruta() {
    return (location.hash || '').replace(/^#\/?/, '').replace(/\/$/, '');
  }
  function rotaAtual() {
    var raw = rotaBruta();
    if (ANCORAS[raw]) return ANCORAS[raw].pagina;
    return ROTAS.indexOf(raw) !== -1 ? raw : 'inicio';
  }

  var rotaAnterior = null;

  function irPara(rota, focar) {
    if (!paginas[rota]) rota = 'inicio';
    /* de #/ para #/sobre a página é a mesma; ainda assim é preciso rolar
       e reavaliar o estado da nav */
    var mesmaPagina = rota === rotaAnterior;

    if (!mesmaPagina) ROTAS.forEach(function (r) {
      var el = paginas[r];
      if (!el) return;
      var ativa = r === rota;
      el.classList.toggle('is-active', ativa);
      el.classList.remove('is-entering');
      /* páginas inativas saem da árvore de acessibilidade e da tabulação */
      if (ativa) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', 'true');
    });

    var alvo = paginas[rota];

    /* animação de entrada só quando houve troca real, nunca no primeiro paint */
    if (!mesmaPagina && rotaAnterior !== null && motionOK()) {
      alvo.classList.add('is-entering');
      alvo.addEventListener('animationend', function limpar() {
        alvo.classList.remove('is-entering');
        alvo.removeEventListener('animationend', limpar);
      });
    }

    /* reveals da página que entra precisam ser liberados: o observer já pode
       ter deixado de observá-los enquanto ela estava escondida */
    Array.prototype.forEach.call(alvo.querySelectorAll('.reveal'), function (el) {
      el.classList.add('is-in');
    });

    var chave = ANCORAS[rotaBruta()] ? rotaBruta() : rota;
    document.title = TITULOS[chave] || TITULOS.inicio;

    var bruta = rotaBruta();
    var ativo = null;
    navLinks.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var marca = href === '#/' + (bruta || rota) || href === '#/' + rota;
      if (marca) { a.setAttribute('aria-current', 'page'); ativo = a; }
      else a.removeAttribute('aria-current');
    });

    if (ativo) moverIndicador(ativo, rotaAnterior !== null);
    else esconderIndicador();   /* home sem item correspondente no menu */

    if (live) live.textContent = (ROTULOS[chave] || 'início') + ' — página carregada';

    /* rota-âncora rola até a seção; rota-página vai ao topo */
    var anc = ANCORAS[rotaBruta()];
    if (anc && anc.pagina === rota) {
      var secao = document.getElementById(anc.alvo);
      if (secao) {
        var topo = secao.getBoundingClientRect().top + window.scrollY
                 - (parseFloat(getComputedStyle(root).getPropertyValue('--nav-real')) || 64) - 16;
        window.scrollTo({ top: Math.max(0, topo), behavior: motionOK() ? 'smooth' : 'auto' });
      }
    } else {
      window.scrollTo(0, 0);
      if (nav) nav.dataset.scrolled = 'false';
    }
    if (progress) progress.style.transform = 'scaleX(0)';

    /* foco no título da página: quem navega por teclado continua no lugar certo */
    if (focar) {
      var titulo = alvo.querySelector('h1, h2');
      if (titulo) {
        titulo.setAttribute('tabindex', '-1');
        titulo.focus({ preventScroll: true });
      }
    }

    rotaAnterior = rota;
  }

  window.addEventListener('hashchange', function () { irPara(rotaAtual(), true); });

  /* a largura dos itens muda com resize, zoom e carga das webfonts */
  function reposicionar() {
    var ativo = document.querySelector('.nav__link[aria-current="page"]');
    if (ativo) moverIndicador(ativo, false); else esconderIndicador();
  }
  var tR = 0;
  window.addEventListener('resize', function () {
    clearTimeout(tR); tR = setTimeout(reposicionar, 120);
  }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reposicionar);
  document.addEventListener('macds:tema', reposicionar);

  irPara(rotaAtual(), false);

  /* -------------------------------------------- progresso + estado da nav ---- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;

      if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      if (nav) nav.dataset.scrolled = y > 12 ? 'true' : 'false';

      if (motionOK() && desktop.matches) {
        var p = max > 0 ? y / max : 0;
        root.style.setProperty('--lx', (28 + p * 44).toFixed(2) + '%');
        root.style.setProperty('--ly', (10 + p * 26).toFixed(2) + '%');
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------- retrato em meio-tom -------- */
  /* O retrato é amostrado numa grade; cada célula vira um ponto cujo raio sai
     da luminância. O cursor gira o retrato — os pontos claros se deslocam mais
     que os escuros, e essa diferença de parallax é lida como rotação — e
     empurra os pontos ao redor de si.

     Custo: os pontos são desenhados em 4 faixas de opacidade, uma única
     Path2D por faixa. Isso troca milhares de trocas de estado do contexto por
     quatro chamadas de fill por quadro. */
  (function halftone() {
    var cvs = document.getElementById('js-halftone');
    var host = document.getElementById('js-portrait');
    var src = document.getElementById('js-plate-src');
    var hero = host && host.closest('.hero');
    if (!cvs || !host || !src || !hero) return;

    var ctx = cvs.getContext('2d', { alpha: true });
    if (!ctx) return;

    var dots = [];          /* {gx, gy, lum} em coordenadas normalizadas 0..1 */
    var W = 0, H = 0, dpr = 1, cell = 10;
    var pointer = { x: -9999, y: -9999, nx: 0, ny: 0, active: false };
    var target = { nx: 0, ny: 0 };
    var visible = true, raf = 0, ready = false;
    var lastW = 0, lastH = 0;
    var t0 = performance.now();

    /* ---- amostragem: imagem -> grade de luminância ---- */
    function sample() {
      var box = host.getBoundingClientRect();
      if (!box.width || !box.height) return false;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = box.width; H = box.height;
      cvs.width = Math.round(W * dpr);
      cvs.height = Math.round(H * dpr);

      /* O retrato agora ocupa uma caixa menor, então a grade é calculada sobre
         ela: a densidade de pontos acompanha o tamanho do objeto, não o da
         tela. Grade mais grossa no mobile. */
      cell = desktop.matches ? Math.max(5, Math.round(W / 88)) : Math.max(6, Math.round(W / 52));

      var cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);

      var off = document.createElement('canvas');
      off.width = cols; off.height = rows;
      var octx = off.getContext('2d', { willReadFrequently: true });

      /* FONTE COMPLETA — sem recorte vertical.
         Uma versão anterior recortava a faixa de 2% a 70% para forçar um
         enquadramento de cabeça e ombros. O enquadramento aprovado usa a
         figura inteira: os braços e o tronco fazem parte da composição, e a
         massa de pontos vale mais aqui do que um retrato fechado. */
      var SW = src.naturalWidth || 1086;
      var SH = src.naturalHeight || 1448;
      var sx = 0, sy = 0, sw = SW, sh = SH;

      /* COVER do recorte dentro da grade.
         Com contain, uma caixa mais alta só ganhava faixa vazia em cima e
         embaixo — a cabeça continuava do mesmo tamanho. Em cover o recorte
         preenche a caixa inteira, então a altura passa a mandar no tamanho
         aparente da cabeça. O que sobra nas laterais é margem escura da
         fonte, que não faz falta. */
      var ar = sw / sh;
      var tw = cols, th = cols / ar;
      if (th < rows) { th = rows; tw = rows * ar; }
      octx.drawImage(src, sx, sy, sw, sh, (cols - tw) / 2, (rows - th) / 2, tw, th);

      var data;
      try { data = octx.getImageData(0, 0, cols, rows).data; }
      catch (e) { return false; }   /* canvas tainted: mantém o fallback */

      dots.length = 0;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var i = (y * cols + x) * 4;
          /* luminância Rec.709 */
          var lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
          /* o fundo é preto: descartar as células escuras corta ~80% dos
             pontos sem mudar nada do que se vê */
          if (lum < 0.06) continue;
          dots.push({
            x: (x + 0.5) * cell,
            y: (y + 0.5) * cell,
            l: lum
          });
        }
      }
      return dots.length > 0;
    }

    /* ---- desenho ---- */
    var BANDS = [0.25, 0.45, 0.68, 1.0];

    /* No escuro os pontos são luz sobre papel preto; no claro, tinta sobre
       papel branco. Sem esta inversão o retrato desaparece no tema claro —
       branco sobre branco. */
    function corPonto() {
      /* No claro a tinta pura (#101013) deixava o retrato duro e granulado,
         competindo com o título ao lado. Um cinza-tinta a 45,45,54 mantém a
         leitura da forma e devolve o retrato ao papel de fundo. */
      return root.dataset.theme === 'light' ? '45,45,54' : '255,255,255';
    }

    function draw(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      var drift = (now - t0) / 1000;
      /* respiração: o retrato não fica morto quando ninguém interage */
      var ambX = Math.sin(drift * 0.21) * 0.16;
      var ambY = Math.cos(drift * 0.16) * 0.10;

      /* suavização do ponteiro */
      pointer.nx += ((target.nx + ambX) - pointer.nx) * 0.06;
      pointer.ny += ((target.ny + ambY) - pointer.ny) * 0.06;

      /* o raio de influência acompanha a caixa: numa caixa menor, um raio fixo
         em pixels engoliria o retrato inteiro */
      var R = Math.min(W, H) * 0.34;
      var pushMax = Math.min(W, H) * 0.055;

      var paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];

      for (var k = 0; k < dots.length; k++) {
        var d = dots[k];
        var depth = d.l;                       /* mais claro = mais à frente */

        /* giro: o parallax por profundidade é o que lê como rotação.
           Sem deslocamento base — o retrato já está posicionado pelo CSS. */
        var px = d.x + pointer.nx * depth * (W * 0.085);
        var py = d.y + pointer.ny * depth * (H * 0.045);

        var r = d.l * cell * 0.48;

        /* empurrão local do cursor */
        if (pointer.active) {
          var vx = px - pointer.x, vy = py - pointer.y;
          var dist = Math.sqrt(vx * vx + vy * vy);
          if (dist < R) {
            var f = 1 - dist / R;
            f *= f;
            var inv = 1 / (dist || 1);
            px += vx * inv * f * pushMax;
            py += vy * inv * f * pushMax;
            r *= 1 + f * 0.9;
          }
        }

        if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;

        var band = d.l < 0.30 ? 0 : d.l < 0.55 ? 1 : d.l < 0.80 ? 2 : 3;
        paths[band].moveTo(px + r, py);
        paths[band].arc(px, py, r, 0, 6.283185);
      }

      var rgb = corPonto();
      for (var b = 0; b < 4; b++) {
        ctx.fillStyle = 'rgba(' + rgb + ',' + BANDS[b] + ')';
        ctx.fill(paths[b]);
      }

      raf = visible && motionOK() ? requestAnimationFrame(draw) : 0;
    }

    function start() {
      if (!sample()) return;              /* falhou: fallback <img> continua */
      ready = true;
      lastW = window.innerWidth; lastH = window.innerHeight;
      host.dataset.canvas = 'on';
      if (!motionOK()) { draw(performance.now()); return; }
      raf = requestAnimationFrame(draw);
    }

    /* ---- entradas ---- */
    if (desktop.matches && hoverable.matches) {
      hero.addEventListener('mousemove', function (e) {
        var r = host.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
        pointer.active = true;
        /* o cursor percorre o hero inteiro, mas a caixa do retrato é bem menor:
           sem limite, o giro saturava assim que o ponteiro saía da caixa */
        var nx = (pointer.x - r.width / 2) / (r.width / 2);
        var ny = (pointer.y - r.height / 2) / (r.height / 2);
        target.nx = Math.max(-1.25, Math.min(1.25, nx));
        target.ny = Math.max(-1.25, Math.min(1.25, ny));
      }, { passive: true });

      hero.addEventListener('mouseleave', function () {
        pointer.active = false;
        pointer.x = pointer.y = -9999;
        target.nx = target.ny = 0;
      });
    }

    /* Reamostrar é caro (getImageData + varredura da grade). No mobile a barra
       de endereço aparecendo e sumindo dispara resize a cada rolagem, quase
       sempre só com mudança de altura. Só refaço quando a LARGURA muda de
       verdade — ou quando a altura muda muito, como em rotação de tela. */
    var rt = 0;
    window.addEventListener('resize', function () {
      if (!ready) return;
      var w = window.innerWidth, h = window.innerHeight;
      if (Math.abs(w - lastW) < 24 && Math.abs(h - lastH) < 160) return;
      clearTimeout(rt);
      rt = setTimeout(function () {
        lastW = window.innerWidth; lastH = window.innerHeight;
        sample();
      }, 180);
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && ready && !raf && motionOK()) {
          t0 = performance.now();
          raf = requestAnimationFrame(draw);
        }
      }, { threshold: 0 }).observe(hero);
    }

    /* Com reduced-motion o desenho acontece uma vez só: sem este ouvinte, o
       retrato ficaria na cor do tema anterior até a próxima interação. */
    document.addEventListener('macds:tema', function () {
      if (ready && !motionOK()) draw(performance.now());
    });

    /* a amostragem precisa da imagem decodificada */
    if (src.complete && src.naturalWidth) start();
    else src.addEventListener('load', start, { once: true });
    src.addEventListener('error', function () { /* fallback já está na tela */ });
  })();

  /* --------------------------------------------- malha de formas (fundo) --- */
  /* Grade de quadrados com deriva diagonal e realce sob o cursor.
     Comportamento inspirado no ShapeGrid do reactbits, reescrito aqui em
     canvas 2D sem dependência e em escala de cinza.

     O truque de custo: a grade inteira é UM Path2D construído no resize.
     Cada quadro só translada o contexto e faz um stroke — o laço de ~1.300
     células não roda por quadro. Só o halo do cursor é reconstruído. */
  (function malhaDeFormas() {
    var cv = document.getElementById('js-shapegrid');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    if (!ctx) return;

    var CELULA = 40;        // squareSize
    var LADO = 0.82;        // o quadrado não encosta no vizinho
    var VEL = 30;           // px por segundo (speed 0.5 a 60fps)
    var RAIO = 2.6;         // alcance do halo, em células

    var dpr = 1, w = 0, h = 0, cols = 0, linhas = 0;
    var base = null;
    var off = 0, t0 = 0, raf = 0;
    var px = -1e5, py = -1e5;
    var ligado = false;

    function paleta() {
      return root.dataset.theme === 'light'
        ? { linha: 'rgba(45,45,54,.10)', halo: 'rgba(45,45,54,.30)', preenche: 'rgba(45,45,54,.055)' }
        : { linha: 'rgba(255,255,255,.065)', halo: 'rgba(255,255,255,.24)', preenche: 'rgba(255,255,255,.05)' };
    }
    var cor = paleta();

    function medir() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);

      cols = Math.ceil(w / CELULA) + 2;
      linhas = Math.ceil(h / CELULA) + 2;

      var lado = CELULA * LADO;
      var m = (CELULA - lado) / 2;
      base = new Path2D();
      for (var j = 0; j < linhas; j++) {
        for (var i = 0; i < cols; i++) {
          base.rect(i * CELULA + m, j * CELULA + m, lado, lado);
        }
      }
    }

    function desenhar() {
      if (!base) return;
      var d = off % CELULA;
      var tx = d - CELULA;          // diagonal: os dois eixos derivam juntos
      var ty = d - CELULA;
      var lado = CELULA * LADO;
      var m = (CELULA - lado) / 2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(tx, ty);
      ctx.lineWidth = 1;
      ctx.strokeStyle = cor.linha;
      ctx.stroke(base);

      /* halo: só as células perto do cursor, redesenhadas por cima */
      if (px > -1e4) {
        var ci = Math.round((px - tx - CELULA / 2) / CELULA);
        var cj = Math.round((py - ty - CELULA / 2) / CELULA);
        var perto = new Path2D();
        var sob = null;
        var achou = false;
        var r = Math.ceil(RAIO);
        for (var j = cj - r; j <= cj + r; j++) {
          if (j < 0 || j >= linhas) continue;
          for (var i = ci - r; i <= ci + r; i++) {
            if (i < 0 || i >= cols) continue;
            var dd = Math.sqrt((i - ci) * (i - ci) + (j - cj) * (j - cj));
            if (dd > RAIO) continue;
            var x = i * CELULA + m, y = j * CELULA + m;
            if (i === ci && j === cj) { sob = new Path2D(); sob.rect(x, y, lado, lado); }
            perto.rect(x, y, lado, lado);
            achou = true;
          }
        }
        if (achou) {
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = cor.halo;
          ctx.stroke(perto);
          ctx.globalAlpha = 1;
        }
        if (sob) {
          ctx.strokeStyle = cor.halo;
          ctx.stroke(sob);
          ctx.fillStyle = cor.preenche;
          ctx.fill(sob);
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!ligado) { ligado = true; cv.classList.add('is-on'); }
    }

    function quadro(t) {
      raf = requestAnimationFrame(quadro);
      if (!t0) t0 = t;
      var dt = Math.min((t - t0) / 1000, 0.05);
      t0 = t;
      off += VEL * dt;
      desenhar();
    }

    function iniciar() { if (!raf) { t0 = 0; raf = requestAnimationFrame(quadro); } }
    function parar() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    function estado() {
      parar();
      medir();
      /* grade parada continua sendo textura — só não deriva */
      if (motionOK() && !document.hidden) iniciar();
      else desenhar();
    }

    document.addEventListener('macds:tema', function () { cor = paleta(); desenhar(); });

    if (hoverable.matches) {
      window.addEventListener('pointermove', function (e) {
        px = e.clientX; py = e.clientY;
        if (!raf) desenhar();
      }, { passive: true });
      window.addEventListener('pointerleave', function () {
        px = py = -1e5;
        if (!raf) desenhar();
      });
    }

    var tRes;
    window.addEventListener('resize', function () {
      clearTimeout(tRes);
      tRes = setTimeout(estado, 160);
    }, { passive: true });

    document.addEventListener('visibilitychange', estado);
    if (reduce.addEventListener) reduce.addEventListener('change', estado);

    estado();
  })();

  /* ---------------------------------------------------------- magnético ---- */
  /* Deslocamento discreto (6px) e sem skew: o efeito anterior deformava o
     rótulo do botão e atrapalhava a leitura durante o hover. */
  document.querySelectorAll('[data-magnetic]').forEach(function (el) {
    function ok() { return hoverable.matches && motionOK() && desktop.matches; }
    el.addEventListener('mousemove', function (e) {
      if (!ok()) return;
      var r = el.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      el.style.transition = 'transform var(--dur-fast) var(--ease)';
      el.style.transform = 'translate3d(' + (dx * 6).toFixed(1) + 'px,' +
        (dy * 4).toFixed(1) + 'px,0)';
    });
    el.addEventListener('mouseleave', function () {
      el.style.transition = 'transform var(--dur-base) var(--ease)';
      el.style.transform = 'none';
    });
  });

  /* ---------------------------------------------------------- refração ---- */
  /* Aplicada SÓ na mídia do card. Antes o filtro caía no card inteiro e
     distorcia o texto no hover — efeito bonito, leitura impossível. */
  var medias = document.querySelectorAll('.project__card .project__media');
  if (medias.length && desktop.matches && motionOK()) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    var defs = document.createElementNS(NS, 'defs');
    svg.appendChild(defs);
    document.body.appendChild(svg);

    medias.forEach(function (media, idx) {
      var card = media.closest('.project__card');
      var img = media.querySelector('img');
      var spec = media.querySelector('.project__spec');
      if (!img) return;

      var id = 'macds-refract-' + idx;
      var filter = document.createElementNS(NS, 'filter');
      filter.setAttribute('id', id);
      filter.setAttribute('x', '-6%'); filter.setAttribute('y', '-6%');
      filter.setAttribute('width', '112%'); filter.setAttribute('height', '112%');
      filter.setAttribute('color-interpolation-filters', 'sRGB');

      var turb = document.createElementNS(NS, 'feTurbulence');
      turb.setAttribute('type', 'fractalNoise');
      turb.setAttribute('baseFrequency', '0.012 0.02');
      turb.setAttribute('numOctaves', '2');
      turb.setAttribute('seed', String(7 + idx));
      turb.setAttribute('result', 'n');

      var disp = document.createElementNS(NS, 'feDisplacementMap');
      disp.setAttribute('in', 'SourceGraphic');
      disp.setAttribute('in2', 'n');
      disp.setAttribute('scale', '0');
      disp.setAttribute('xChannelSelector', 'R');
      disp.setAttribute('yChannelSelector', 'G');

      filter.appendChild(turb); filter.appendChild(disp); defs.appendChild(filter);

      var raf = 0;
      function drive(target) {
        cancelAnimationFrame(raf);
        var from = parseFloat(disp.getAttribute('scale')) || 0;
        var t0 = performance.now(), d = 520;
        (function step(t) {
          var p = Math.min(1, (t - t0) / d);
          var e = 1 - Math.pow(1 - p, 3);
          disp.setAttribute('scale', String(from + (target - from) * e));
          if (p < 1) raf = requestAnimationFrame(step);
        })(performance.now());
      }

      card.addEventListener('mouseenter', function () {
        if (!desktop.matches || !motionOK()) return;
        img.style.filter = 'url(#' + id + ')';
        drive(10);
      });
      card.addEventListener('mousemove', function (e) {
        if (!spec || !desktop.matches || !motionOK()) return;
        var r = media.getBoundingClientRect();
        var x = ((e.clientX - r.left) / r.width) * 100;
        var y = ((e.clientY - r.top) / r.height) * 100;
        spec.style.background = 'radial-gradient(42% 42% at ' + x.toFixed(1) + '% ' +
          y.toFixed(1) + '%, rgba(255,255,255,.16), transparent 70%)';
      });
      card.addEventListener('mouseleave', function () {
        if (!desktop.matches) return;
        drive(0);
        setTimeout(function () { img.style.filter = 'none'; }, 540);
      });
    });
  }

  /* ------------------------------------------------- filtro de projetos ---- */
  var filters = document.querySelectorAll('.filter');
  var projects = document.querySelectorAll('#js-projects .project');
  var live = document.createElement('p');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;' +
    'clip:rect(0 0 0 0);white-space:nowrap';
  document.body.appendChild(live);

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.dataset.filter;
      filters.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });

      var shown = 0;
      projects.forEach(function (p) {
        var match = key === 'all' || (p.dataset.tech || '').split(' ').indexOf(key) !== -1;
        p.hidden = !match;
        /* projeto que reaparece não pode voltar escondido pelo reveal */
        if (match) p.classList.add('is-in');
        if (match) shown++;
      });
      live.textContent = shown + (shown === 1 ? ' projeto exibido' : ' projetos exibidos') +
        (key === 'all' ? '.' : ' para o filtro ' + key + '.');
    });
  });


  /* ------------------------------------------------- cursor líquido (roxo) --- */
  /* Simulação de fluido em WebGL: o cursor injeta corante e velocidade num
     campo que é advectado, recebe vorticidade e é projetado para ficar sem
     divergência. Versão enxuta do Splash Cursor (reactbits) — sem bloom nem
     sunrays, que são o grosso do custo do original.

     TRÊS TRAVAS DE CUSTO, nesta ordem de importância:
     1. Inicialização preguiçosa. O contexto WebGL só nasce no primeiro
        movimento do ponteiro. Durante o carregamento e o LCP este módulo
        não existe — nem shader, nem framebuffer, nem quadro.
     2. Parada por ociosidade. Sem movimento por 4s e com o corante já
        dissipado, o laço morre. Volta no próximo movimento.
     3. Nada em toque, nada em movimento reduzido, nada sem WebGL.

     A simulação é MONOCROMÁTICA (só densidade). A cor roxa entra no shader
     de exibição, o que deixa a troca de tema instantânea e sem tocar no
     campo. */
  (function cursorLiquido() {
    var cv = document.getElementById('js-splash');
    if (!cv) return;
    if (!hoverable.matches || !motionOK()) return;

    /* ---------------------------------------------------------- paleta ---- */
    /* Dois roxos por tema: o corante interpola entre eles conforme a mistura
       sorteada em cada respingo, então a mancha tem variação sem sair do roxo.
       No escuro a camada entra em `screen` (preto é neutro) e pode ser clara.
       No claro entra em `normal` com alfa, e precisa ser funda para aparecer. */
    var PALETAS = {
      dark:  { a: [0.62, 0.42, 1.00], b: [0.78, 0.35, 0.96], alfa: 0.85 },
      light: { a: [0.55, 0.34, 0.94], b: [0.70, 0.38, 0.90], alfa: 0.58 }
    };
    function paleta() { return PALETAS[root.dataset.theme === 'light' ? 'light' : 'dark']; }

    /* --------------------------------------------------------- ajustes ---- */
    var SIM_RES = 128;          // resolução do campo de velocidade
    var DYE_RES = 512;          // resolução do corante (o que se vê)
    var DENSITY_DISSIPATION = 3.2;
    var VELOCITY_DISSIPATION = 2.0;
    var PRESSURE = 0.8;
    var PRESSURE_ITER = 8;      // o original usa 20; 8 já fecha o campo
    var CURL = 26;              // vorticidade — é daqui que vem o rodopio
    var SPLAT_RADIUS = 0.20;
    var SPLAT_FORCE = 5200;
    var OCIOSO_MS = 4000;

    var gl, ext, prog = {}, quad, fbos = {}, iniciado = false, falhou = false;
    var raf = 0, tPrev = 0, ultimoMov = 0;
    var ponteiro = { x: 0, y: 0, dx: 0, dy: 0, ativo: false, mistura: 0.7, densidade: 1 };

    /* ========================================================== shaders === */
    var VERT = [
      'precision highp float;',
      'attribute vec2 aPosition;',
      'varying vec2 vUv, vL, vR, vT, vB;',
      'uniform vec2 texelSize;',
      'void main(){',
      '  vUv = aPosition * 0.5 + 0.5;',
      '  vL = vUv - vec2(texelSize.x, 0.0);',
      '  vR = vUv + vec2(texelSize.x, 0.0);',
      '  vT = vUv + vec2(0.0, texelSize.y);',
      '  vB = vUv - vec2(0.0, texelSize.y);',
      '  gl_Position = vec4(aPosition, 0.0, 1.0);',
      '}'
    ].join('\n');

    var F_COPY = [
      'precision mediump float; precision mediump sampler2D;',
      'varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;',
      'void main(){ gl_FragColor = value * texture2D(uTexture, vUv); }'
    ].join('\n');

    var F_SPLAT = [
      'precision highp float; precision highp sampler2D;',
      'varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio;',
      'uniform vec3 color; uniform vec2 point; uniform float radius;',
      'void main(){',
      '  vec2 p = vUv - point; p.x *= aspectRatio;',
      '  vec3 splat = exp(-dot(p, p) / radius) * color;',
      '  gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);',
      '}'
    ].join('\n');

    var F_ADVECT = [
      'precision highp float; precision highp sampler2D;',
      'varying vec2 vUv; uniform sampler2D uVelocity; uniform sampler2D uSource;',
      'uniform vec2 texelSize; uniform float dt; uniform float dissipation;',
      'void main(){',
      '  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;',
      '  vec4 result = texture2D(uSource, coord);',
      '  float decay = 1.0 + dissipation * dt;',
      '  gl_FragColor = result / decay;',
      '}'
    ].join('\n');

    var F_DIVERGENCE = [
      'precision mediump float; precision mediump sampler2D;',
      'varying highp vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;',
      'void main(){',
      '  float L = texture2D(uVelocity, vL).x;',
      '  float R = texture2D(uVelocity, vR).x;',
      '  float T = texture2D(uVelocity, vT).y;',
      '  float B = texture2D(uVelocity, vB).y;',
      '  vec2 C = texture2D(uVelocity, vUv).xy;',
      '  if (vL.x < 0.0) { L = -C.x; }',
      '  if (vR.x > 1.0) { R = -C.x; }',
      '  if (vT.y > 1.0) { T = -C.y; }',
      '  if (vB.y < 0.0) { B = -C.y; }',
      '  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);',
      '}'
    ].join('\n');

    var F_CURL = [
      'precision mediump float; precision mediump sampler2D;',
      'varying highp vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;',
      'void main(){',
      '  float L = texture2D(uVelocity, vL).y;',
      '  float R = texture2D(uVelocity, vR).y;',
      '  float T = texture2D(uVelocity, vT).x;',
      '  float B = texture2D(uVelocity, vB).x;',
      '  gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);',
      '}'
    ].join('\n');

    var F_VORTICITY = [
      'precision highp float; precision highp sampler2D;',
      'varying vec2 vUv, vL, vR, vT, vB;',
      'uniform sampler2D uVelocity; uniform sampler2D uCurl;',
      'uniform float curl; uniform float dt;',
      'void main(){',
      '  float L = texture2D(uCurl, vL).x;',
      '  float R = texture2D(uCurl, vR).x;',
      '  float T = texture2D(uCurl, vT).x;',
      '  float B = texture2D(uCurl, vB).x;',
      '  float C = texture2D(uCurl, vUv).x;',
      '  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));',
      '  force /= length(force) + 0.0001;',
      '  force *= curl * C;',
      '  force.y *= -1.0;',
      '  vec2 vel = texture2D(uVelocity, vUv).xy + force * dt;',
      '  vel = min(max(vel, -1000.0), 1000.0);',
      '  gl_FragColor = vec4(vel, 0.0, 1.0);',
      '}'
    ].join('\n');

    var F_PRESSURE = [
      'precision mediump float; precision mediump sampler2D;',
      'varying highp vec2 vUv, vL, vR, vT, vB;',
      'uniform sampler2D uPressure; uniform sampler2D uDivergence;',
      'void main(){',
      '  float L = texture2D(uPressure, vL).x;',
      '  float R = texture2D(uPressure, vR).x;',
      '  float T = texture2D(uPressure, vT).x;',
      '  float B = texture2D(uPressure, vB).x;',
      '  float divergence = texture2D(uDivergence, vUv).x;',
      '  gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);',
      '}'
    ].join('\n');

    var F_GRADIENT = [
      'precision mediump float; precision mediump sampler2D;',
      'varying highp vec2 vUv, vL, vR, vT, vB;',
      'uniform sampler2D uPressure; uniform sampler2D uVelocity;',
      'void main(){',
      '  float L = texture2D(uPressure, vL).x;',
      '  float R = texture2D(uPressure, vR).x;',
      '  float T = texture2D(uPressure, vT).x;',
      '  float B = texture2D(uPressure, vB).x;',
      '  vec2 velocity = texture2D(uVelocity, vUv).xy;',
      '  velocity.xy -= vec2(R - L, T - B);',
      '  gl_FragColor = vec4(velocity, 0.0, 1.0);',
      '}'
    ].join('\n');

    /* O corante é densidade pura. A cor entra AQUI — por isso trocar de tema
       não custa nada: é só outro uniform no próximo quadro. */
    var F_DISPLAY = [
      'precision highp float; precision highp sampler2D;',
      'varying vec2 vUv; uniform sampler2D uTexture;',
      'uniform vec3 tintA; uniform vec3 tintB; uniform float uAlpha;',
      'void main(){',
      '  vec3 c = texture2D(uTexture, vUv).rgb;',
      '  float d = clamp(c.r, 0.0, 1.0);',
      '  float t = clamp(c.g / max(c.r, 0.0001), 0.0, 1.0);',
      '  vec3 tint = mix(tintB, tintA, t);',
      '  float a = clamp(d, 0.0, 1.0);',
      '  a = a * a * (3.0 - 2.0 * a);',   // suaviza a borda da mancha
      '  a *= uAlpha;',
      '  gl_FragColor = vec4(tint * a, a);',
      '}'
    ].join('\n');

    /* ====================================================== plataforma === */
    function compilar(tipo, fonte) {
      var s = gl.createShader(tipo);
      gl.shaderSource(s, fonte);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }
    function programa(fs) {
      var v = compilar(gl.VERTEX_SHADER, VERT);
      var f = compilar(gl.FRAGMENT_SHADER, fs);
      if (!v || !f) return null;
      var p = gl.createProgram();
      gl.attachShader(p, v); gl.attachShader(p, f);
      /* o vertexAttribPointer e' feito uma vez so, na localizacao 0:
         forcar aqui evita depender do que o linker resolver sozinho */
      gl.bindAttribLocation(p, 0, 'aPosition');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
      var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) {
        var nome = gl.getActiveUniform(p, i).name;
        u[nome] = gl.getUniformLocation(p, nome);
      }
      return { p: p, u: u };
    }
    function usar(pr) { gl.useProgram(pr.p); return pr.u; }

    function fboSimples(w, h, fmt) {
      gl.activeTexture(gl.TEXTURE0);
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, fmt.filtro);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, fmt.filtro);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, fmt.interno, w, h, 0, fmt.formato, fmt.tipo, null);

      var fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return {
        tex: tex, fb: fb, w: w, h: h,
        texel: [1 / w, 1 / h],
        ligar: function (id) {
          gl.activeTexture(gl.TEXTURE0 + id);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          return id;
        }
      };
    }
    function fboDuplo(w, h, fmt) {
      var a = fboSimples(w, h, fmt), b = fboSimples(w, h, fmt);
      return {
        w: w, h: h, texel: a.texel,
        get ler() { return a; }, set ler(v) { a = v; },
        get escrever() { return b; }, set escrever(v) { b = v; },
        trocar: function () { var t = a; a = b; b = t; }
      };
    }

    function desenhar(alvo) {
      if (alvo == null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, alvo.w, alvo.h);
        gl.bindFramebuffer(gl.FRAMEBUFFER, alvo.fb);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    function resolucao(base) {
      var ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
      if (ar < 1) ar = 1 / ar;
      var min = Math.round(base), max = Math.round(base * ar);
      return gl.drawingBufferWidth > gl.drawingBufferHeight
        ? { w: max, h: min } : { w: min, h: max };
    }

    /* ========================================================= montagem === */
    function montar() {
      var opts = { alpha: true, depth: false, stencil: false, antialias: false,
                   preserveDrawingBuffer: false, premultipliedAlpha: true };
      gl = cv.getContext('webgl2', opts);
      var webgl2 = !!gl;
      if (!gl) gl = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts);
      if (!gl) { falhou = true; return false; }

      var meia, fmtRGBA, fmtRG, fmtR, linear;
      if (webgl2) {
        gl.getExtension('EXT_color_buffer_float');
        linear = gl.getExtension('OES_texture_float_linear');
        fmtRGBA = { interno: gl.RGBA16F, formato: gl.RGBA, tipo: gl.HALF_FLOAT };
        fmtRG   = { interno: gl.RG16F,   formato: gl.RG,   tipo: gl.HALF_FLOAT };
        fmtR    = { interno: gl.R16F,    formato: gl.RED,  tipo: gl.HALF_FLOAT };
      } else {
        meia = gl.getExtension('OES_texture_half_float');
        linear = gl.getExtension('OES_texture_half_float_linear');
        if (!meia) { falhou = true; return false; }
        var t = meia.HALF_FLOAT_OES;
        fmtRGBA = { interno: gl.RGBA, formato: gl.RGBA, tipo: t };
        fmtRG = fmtRGBA; fmtR = fmtRGBA;
      }
      var f = (webgl2 || linear) ? gl.LINEAR : gl.NEAREST;
      fmtRGBA.filtro = f; fmtRG.filtro = f; fmtR.filtro = f;
      ext = { rgba: fmtRGBA, rg: fmtRG, r: fmtR };

      /* quadrado de tela cheia — um único buffer para todos os passes */
      quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, -1,1, 1,1, 1,-1]), gl.STATIC_DRAW);
      var idx = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2, 0,2,3]), gl.STATIC_DRAW);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);

      prog.copy = programa(F_COPY);
      prog.splat = programa(F_SPLAT);
      prog.advect = programa(F_ADVECT);
      prog.diverg = programa(F_DIVERGENCE);
      prog.curl = programa(F_CURL);
      prog.vort = programa(F_VORTICITY);
      prog.press = programa(F_PRESSURE);
      prog.grad = programa(F_GRADIENT);
      prog.display = programa(F_DISPLAY);
      for (var k in prog) if (!prog[k]) { falhou = true; return false; }

      dimensionar();
      criarBuffers();
      gl.disable(gl.BLEND);
      iniciado = true;
      cv.classList.add('is-on');
      return true;
    }

    function dimensionar() {
      /* metade do DPR: o fluido é uma mancha difusa, ninguém percebe a
         diferença e o custo por pixel cai à metade */
      var dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
      var w = Math.max(1, Math.round(window.innerWidth * dpr));
      var h = Math.max(1, Math.round(window.innerHeight * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; return true; }
      return false;
    }

    function criarBuffers() {
      var s = resolucao(SIM_RES), d = resolucao(DYE_RES);
      fbos.dye = fboDuplo(d.w, d.h, ext.rgba);
      fbos.vel = fboDuplo(s.w, s.h, ext.rg);
      fbos.div = fboSimples(s.w, s.h, ext.r);
      fbos.curl = fboSimples(s.w, s.h, ext.r);
      fbos.press = fboDuplo(s.w, s.h, ext.r);
    }

    /* ========================================================== respingo === */
    function respingar(x, y, dx, dy, mistura, densidade) {
      var u;
      gl.disable(gl.BLEND);

      u = usar(prog.splat);
      gl.uniform1i(u.uTarget, fbos.vel.ler.ligar(0));
      gl.uniform1f(u.aspectRatio, cv.width / cv.height);
      gl.uniform2f(u.point, x, y);
      gl.uniform3f(u.color, dx, dy, 0.0);
      gl.uniform1f(u.radius, SPLAT_RADIUS / 100.0);
      desenhar(fbos.vel.escrever); fbos.vel.trocar();

      gl.uniform1i(u.uTarget, fbos.dye.ler.ligar(0));
      /* r = densidade · g = mistura (vira matiz na exibição) */
      gl.uniform3f(u.color, 0.16 * densidade, 0.16 * mistura * densidade, 0.0);
      desenhar(fbos.dye.escrever); fbos.dye.trocar();
    }

    /* =========================================================== passo ==== */
    function passo(dt) {
      var u;
      gl.disable(gl.BLEND);

      u = usar(prog.curl);
      gl.uniform2f(u.texelSize, fbos.vel.texel[0], fbos.vel.texel[1]);
      gl.uniform1i(u.uVelocity, fbos.vel.ler.ligar(0));
      desenhar(fbos.curl);

      u = usar(prog.vort);
      gl.uniform2f(u.texelSize, fbos.vel.texel[0], fbos.vel.texel[1]);
      gl.uniform1i(u.uVelocity, fbos.vel.ler.ligar(0));
      gl.uniform1i(u.uCurl, fbos.curl.ligar(1));
      gl.uniform1f(u.curl, CURL);
      gl.uniform1f(u.dt, dt);
      desenhar(fbos.vel.escrever); fbos.vel.trocar();

      u = usar(prog.diverg);
      gl.uniform2f(u.texelSize, fbos.vel.texel[0], fbos.vel.texel[1]);
      gl.uniform1i(u.uVelocity, fbos.vel.ler.ligar(0));
      desenhar(fbos.div);

      u = usar(prog.copy);
      gl.uniform1i(u.uTexture, fbos.press.ler.ligar(0));
      gl.uniform1f(u.value, PRESSURE);
      desenhar(fbos.press.escrever); fbos.press.trocar();

      u = usar(prog.press);
      gl.uniform2f(u.texelSize, fbos.vel.texel[0], fbos.vel.texel[1]);
      gl.uniform1i(u.uDivergence, fbos.div.ligar(0));
      for (var i = 0; i < PRESSURE_ITER; i++) {
        gl.uniform1i(u.uPressure, fbos.press.ler.ligar(1));
        desenhar(fbos.press.escrever); fbos.press.trocar();
      }

      u = usar(prog.grad);
      gl.uniform2f(u.texelSize, fbos.vel.texel[0], fbos.vel.texel[1]);
      gl.uniform1i(u.uPressure, fbos.press.ler.ligar(0));
      gl.uniform1i(u.uVelocity, fbos.vel.ler.ligar(1));
      desenhar(fbos.vel.escrever); fbos.vel.trocar();

      u = usar(prog.advect);
      gl.uniform2f(u.texelSize, fbos.vel.texel[0], fbos.vel.texel[1]);
      var vid = fbos.vel.ler.ligar(0);
      gl.uniform1i(u.uVelocity, vid);
      gl.uniform1i(u.uSource, vid);
      gl.uniform1f(u.dt, dt);
      gl.uniform1f(u.dissipation, VELOCITY_DISSIPATION);
      desenhar(fbos.vel.escrever); fbos.vel.trocar();

      gl.uniform1i(u.uVelocity, fbos.vel.ler.ligar(0));
      gl.uniform1i(u.uSource, fbos.dye.ler.ligar(1));
      gl.uniform1f(u.dissipation, DENSITY_DISSIPATION);
      desenhar(fbos.dye.escrever); fbos.dye.trocar();
    }

    function pintar() {
      var pal = paleta();
      var u = usar(prog.display);
      gl.uniform1i(u.uTexture, fbos.dye.ler.ligar(0));
      gl.uniform3f(u.tintA, pal.a[0], pal.a[1], pal.a[2]);
      gl.uniform3f(u.tintB, pal.b[0], pal.b[1], pal.b[2]);
      gl.uniform1f(u.uAlpha, pal.alfa);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      desenhar(null);
      gl.disable(gl.BLEND);
    }

    /* ============================================================ laço ==== */
    function quadro(t) {
      if (!tPrev) tPrev = t;
      var dt = Math.min((t - tPrev) / 1000, 1 / 30);
      tPrev = t;

      if (ponteiro.ativo) {
        ponteiro.ativo = false;
        respingar(ponteiro.x, ponteiro.y, ponteiro.dx, ponteiro.dy,
                  ponteiro.mistura, ponteiro.densidade);
      }
      passo(dt);
      pintar();

      /* trava 2: sem movimento há OCIOSO_MS, o corante já se dissipou —
         não há o que animar. O laço morre e volta no próximo movimento. */
      if (t - ultimoMov > OCIOSO_MS) { raf = 0; tPrev = 0; return; }
      raf = requestAnimationFrame(quadro);
    }

    function acordar() {
      if (raf || falhou) return;
      tPrev = 0;
      raf = requestAnimationFrame(quadro);
    }
    function dormir() { if (raf) { cancelAnimationFrame(raf); raf = 0; tPrev = 0; } }

    /* ========================================================== entrada === */
    var ux = 0, uy = 0, temAnterior = false;

    /* CESSAO DE TERRITORIO.
       O retrato em meio-tom ja responde ao cursor na primeira dobra. Dois
       elementos disputando o mesmo gesto nao leem como intencao, leem como
       excesso. Entao o fluido nao injeta nada enquanto o ponteiro estiver
       sobre o hero, e volta ao normal numa rampa de 160px depois dele.
       O corante que ja existe nao e' apagado: ele so dissipa sozinho. */
    var hero = document.querySelector('.hero');
    var RAMPA = 160;

    function forcaEm(cy) {
      if (!hero) return 1;
      var r = hero.getBoundingClientRect();
      if (r.height < 40) return 1;          /* hero fora de rota */
      if (cy > r.top && cy < r.bottom) return 0;
      var d = cy >= r.bottom ? cy - r.bottom : r.top - cy;
      return d >= RAMPA ? 1 : d / RAMPA;
    }

    function mover(e) {
      var x = e.clientX / window.innerWidth;
      var y = 1.0 - e.clientY / window.innerHeight;
      var f = forcaEm(e.clientY);

      /* trava 1: o WebGL nasce no primeiro movimento FORA do hero — nunca no
         load, e nunca por causa de um gesto que pertence ao retrato */
      if (f > 0.02 && !iniciado && !falhou) { if (!montar()) { ux = x; uy = y; temAnterior = true; return; } }

      if (!falhou && iniciado && temAnterior && f > 0.02) {
        var ar = window.innerWidth / window.innerHeight;
        ponteiro.dx = (x - ux) * SPLAT_FORCE * f * (ar < 1 ? ar : 1);
        ponteiro.dy = (y - uy) * SPLAT_FORCE * f * (ar > 1 ? 1 / ar : 1);
        ponteiro.densidade = f;
        var mv = Math.abs(ponteiro.dx) + Math.abs(ponteiro.dy);
        if (mv > 0.4) {
          ponteiro.x = x; ponteiro.y = y;
          ponteiro.mistura = 0.35 + Math.random() * 0.65;
          ponteiro.ativo = true;
          ultimoMov = performance.now();
          acordar();
        }
      }
      ux = x; uy = y; temAnterior = true;
    }

    window.addEventListener('pointermove', mover, { passive: true });
    window.addEventListener('pointerdown', function (e) {
      if (!iniciado && !falhou) { if (!montar()) return; }
      if (falhou) return;
      var fc = forcaEm(e.clientY);
      if (fc <= 0.02) return;
      var x = e.clientX / window.innerWidth;
      var y = 1.0 - e.clientY / window.innerHeight;
      ponteiro.x = x; ponteiro.y = y;
      ponteiro.densidade = fc;
      ponteiro.dx = (Math.random() - 0.5) * 1400 * fc;
      ponteiro.dy = (Math.random() - 0.5) * 1400 * fc;
      ponteiro.mistura = 0.35 + Math.random() * 0.65;
      ponteiro.ativo = true;
      ultimoMov = performance.now();
      acordar();
    }, { passive: true });

    var tRes;
    window.addEventListener('resize', function () {
      if (!iniciado) return;
      clearTimeout(tRes);
      tRes = setTimeout(function () {
        if (dimensionar()) criarBuffers();
      }, 200);
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) dormir();
    });

    /* troca de tema: um quadro só, para a mancha que estiver na tela já
       aparecer no roxo novo mesmo com o laço parado */
    document.addEventListener('macds:tema', function () {
      if (iniciado && !raf) pintar();
    });

    /* trava 3: se o usuário passar a pedir movimento reduzido, some de vez */
    reduce.addEventListener('change', function () {
      if (reduce.matches) { dormir(); cv.classList.remove('is-on'); }
    });
  })();

  /* -------------------------------------- respeita mudança de preferência --- */
  reduce.addEventListener('change', function () { if (reduce.matches) revealAll(); });
})();
