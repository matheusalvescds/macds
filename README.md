# macds

Design system próprio e o site-currículo que o aplica.

**[macds.vercel.app](https://macds.vercel.app)**

HTML, CSS e JavaScript puros. Sem framework, sem bundler, sem dependência em
tempo de execução — as únicas requisições externas são as três fontes do
Google Fonts.

---

## Por que sem framework

O site tem retrato em meio-tom desenhado em canvas, simulação de fluido em
WebGL, roteador por hash e duas seções comandadas pela rolagem. Nada disso
precisa de framework, e um bundle de runtime custaria exatamente o orçamento
que esses efeitos consomem.

A decisão é sobre **onde gastar o tempo de carregamento**: em comportamento
visível, não em infraestrutura.

## Como rodar

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Abrir `index.html` direto pelo sistema de arquivos **não funciona por
completo**: `file://` bloqueia o carregamento em cadeia do CSS e o vídeo de
fundo. Use um servidor.

## Estrutura

```
index.html              markup único; o roteador troca seções, não páginas
favicon.svg             na raiz por convenção — navegadores procuram ali
robots.txt
sitemap.xml
vercel.json             cabeçalhos e cache na Vercel
.nojekyll               impede o GitHub Pages de rodar Jekyll

assets/
  css/
    styles.css          ponto de entrada — importa tokens e a camada do site
    site.css            camada de aplicação: layout, componentes, responsivo
    tokens/             o design system: cor, tipografia, espaço, borda, movimento
  js/
    app.js              comportamento, em módulos isolados dentro de uma IIFE
  img/
    projects/           capas dos cinco projetos (WebP)
    portrait/           retratos e a chapa do hero
    og/                 imagem de compartilhamento (1200x630)
    texture/            grão
  certs/                certificados (WebP), abertos no visualizador
  video/                a caminhada da página "experiência"
  docs/                 currículo em .pdf e .docx
```

A regra é uma só: **a raiz guarda o que o host precisa encontrar sozinho**
(`index.html`, `favicon.svg`, `robots.txt`, os arquivos de configuração), e
todo o resto vive em `assets/`, separado por tipo. Nenhum caminho é absoluto,
então a mesma árvore funciona na raiz de um domínio e num subcaminho.

## Design system

Monocromático por regra: uma escala de nove cinzas de `#050506` a branco. A
cor aparece em dois lugares e só neles — nas capas dos projetos, que são
capturas reais dos produtos, e no cursor líquido. Fora disso, a hierarquia é
feita por **tamanho, peso e espaço**, nunca por matiz.

Três famílias com papéis fixos:

| papel | família |
|---|---|
| display | Space Grotesk |
| texto | Inter |
| dados e rótulos | JetBrains Mono |

Tema claro e escuro saem dos mesmos tokens. O tema é aplicado por um script
síncrono no `<head>` — antes do primeiro paint, para não piscar no tema
errado.

## Decisões de implementação

**Roteador por hash, não History API.** Hash funciona em `file://` e em
qualquer host estático sem regra de reescrita. A troca de rota move o foco
para o título da seção e anuncia a mudança numa região `aria-live`.

**Animação é acréscimo, nunca requisito.** Todo estado inicial escondido só
existe depois que o JS confirma que consegue revelá-lo (`html.js`), há
failsafe por tempo e um ouvinte de `error` que revela tudo. Se qualquer
módulo quebrar, o conteúdo aparece.

**As duas seções presas se desmontam sozinhas.** "Sobre" e "experiência"
prendem a tela e montam a composição com a rolagem — mas só em tela larga,
tela alta e sem `prefers-reduced-motion`. Fora dessas condições a mesma
marcação vira um layout normal.

**Medida explícita em vez de proporção implícita.** Capas de projeto e
miniaturas de certificado declaram largura e altura no contêiner e na
imagem. `aspect-ratio` sozinho já deixou uma capa esticar até virar uma
tarja de tela inteira.

**O vídeo de fundo é recodificado com todo quadro como keyframe.** Um mp4
comum tem keyframe a cada ~2s; saltar para um instante arbitrário obriga o
navegador a decodificar desde o anterior, e o scrub engasga. Ele também só
carrega quando a rota "experiência" abre — até lá não existe `src`.

## Acessibilidade

- Navegação por teclado com foco visível e `skip-link`
- `aria-current="page"` no item ativo; região `aria-live` anuncia a troca de rota
- `prefers-reduced-motion` desliga scroll-scrubbing, parallax e o cursor líquido
- Alvos de toque de 44px em ponteiro grosso
- Contraste conferido nos dois temas
- `<noscript>` revela todo o conteúdo

## Publicar

O site é estático e roda nos dois hosts sem alteração: todos os caminhos
internos são relativos, então funciona tanto na raiz de um domínio quanto
num subcaminho.

### Vercel

1. vercel.com → **Add New → Project** → importar o repositório
2. Framework Preset: **Other**. Sem build command, sem output directory
3. Deploy

O `vercel.json` traz `cleanUrls`, cabeçalhos de segurança e cache de um ano
para `assets/` com revalidação no HTML.

### GitHub Pages

1. Settings → Pages
2. Source: **Deploy from a branch** → `main` → `/ (root)`
3. Save

O `.nojekyll` impede o GitHub de processar os arquivos pelo Jekyll, que não
tem nada a fazer aqui e só adiciona um passo entre o commit e o ar.

O `vercel.json` é ignorado pelo Pages, então os cabeçalhos de cache e
segurança valem só na Vercel. É o motivo de ela ser o endereço principal.

### Os dois no ar ao mesmo tempo

Com duas cópias públicas, um buscador precisa saber qual é a oficial —
senão as duas competem entre si. A tag `<link rel="canonical">` do
`index.html` aponta para a Vercel em ambas as cópias, então o Pages é
indexado como espelho e o peso de busca fica num endereço só.

### Trocar o domínio

O endereço aparece em três arquivos. Ao ligar um domínio próprio, substituir
`https://macds.vercel.app` em:

- `index.html` — `<link rel="canonical">`, `og:url`, `og:image`,
  `twitter:image` e `url` no JSON-LD
- `robots.txt` — linha `Sitemap:`
- `sitemap.xml` — `<loc>`

## Licença

Código sob MIT. **Conteúdo, fotos, textos, certificados e a marca "macds"
são reservados** — ver [LICENSE](LICENSE).

---

Matheus Alves Cruz da Silva · Recife-PE
[LinkedIn](https://www.linkedin.com/in/matheus-alvescds) ·
[Behance](https://www.behance.net/matheusalvescds) ·
contato.macds@gmail.com
