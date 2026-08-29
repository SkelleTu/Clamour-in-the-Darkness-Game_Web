# Clamour in the Darkness — Web

Versão web nativa do Clamour, sem Unity. O navegador executa o runtime diretamente com Three.js/Vite e usa o mesmo Universal Server do jogo para estado, geocoding, Street View, clima e multiplayer.

## Rodar no Windows

### 1. Pré-requisitos

- Node.js LTS: https://nodejs.org/
- Git: https://git-scm.com/

### 2. Clonar o projeto

```bash
git clone https://github.com/SkelleTu/Clamour-in-the-Darkness-Game_Web.git
cd Clamour-in-the-Darkness-Game_Web
```

### 3. Subir o Universal Server

Dê duplo clique em `start-universal-server.bat`.

Ele vai:
- verificar Node.js, Git e pnpm
- clonar o Universal Server em `universal-server-main/`
- instalar dependências
- buildar o backend
- subir o servidor em `http://localhost:3000`

### 4. Rodar o jogo

Abra outro terminal na mesma pasta:

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`

## Rodar no Bolt / Replit / local

```bash
npm install
npm run dev
```

Opcionalmente defina:

- `VITE_UNIVERSAL_SERVER_URL` = `http://localhost:3000`
- `VITE_UNIVERSAL_SERVER_API_KEY` = chave do projeto do Universal Server

A API Key do Google **não fica no navegador**. O navegador chama o Universal Server, que faz as chamadas Google do lado do servidor.

## Controles

- WASD: andar
- Shift: correr / gastar stamina
- Espaço: pular
- Mouse: olhar
- E: interagir / pegar objeto
- F: criar um objeto de teste no mundo
- H: manifestação de horror de teste

## Fluxo inicial

Na primeira entrada, o jogador informa o endereço de casa. O Universal Server faz o geocoding e grava o estado do jogador. Entradas seguintes carregam a última posição salva.

## Estado atual

Esta versão substitui o runtime Unity por uma implementação web nativa. A camada visual de Street View usa a API proxy do Universal Server e atualiza a perspectiva conforme posição e direção. A versão web continua compartilhando o mesmo backend e os mesmos conceitos de mundo.

A equivalência visual absoluta com uma build Unity depende dos assets finais de personagem, animações, áudio e de um renderer completo de Street View Tiles/panoramas. O projeto web evita Unity por completo e é adequado para ambientes como Bolt que executam Vite/TypeScript.
