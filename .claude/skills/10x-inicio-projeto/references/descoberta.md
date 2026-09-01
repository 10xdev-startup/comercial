# Descoberta guiada

## Como perguntar

- Fazer no maximo 3 perguntas por mensagem.
- Comecar por produto, nao por tecnologia.
- Traduzir escolhas tecnicas em impacto: prazo, risco, custo e experiencia.
- Quando houver duvida, oferecer o default recomendado primeiro.
- Nao repetir pergunta cuja resposta exista no repositorio ou na conversa.
- Confirmar a sintese antes de banco, billing ou deploy.
- Confirmar separadamente se pode instalar, rodar local, commitar, enviar e publicar.

## Perguntas essenciais

### Produto

1. Para quem serve o produto e qual tarefa dolorosa ele resolve?
2. Qual e a acao principal que prova valor na primeira sessao?
3. O que explicitamente nao entra nesta primeira versao?

Default quando a ideia estiver ampla: escolher um usuario, uma dor e um fluxo vertical.

### Identidade

1. Nome exibido, slug tecnico e idioma principal?
2. Existe identidade visual ou a skill deve propor tokens iniciais?

Default: dark-mode first, tipografia do template e uma cor de marca que nao conflite com
cores semanticas. Nunca deixar `Meu Projeto` depois do bootstrap.

### Recursos e navegacao

Pedir os 3 a 6 substantivos centrais do produto. Para cada recurso, definir:

| Recurso | Rota | Acao principal | Quem acessa | Estados |
|---|---|---|---|---|
| exemplo | `/exemplos` | criar e revisar | autenticado | vazio/loading/erro/sucesso |

Default: dashboard apenas resume; cada recurso da sidebar ganha sua propria rota.

### Conta e ownership

Confirmar em linguagem simples que cada pessoa ve apenas os proprios dados. A fundacao cria
somente `users`; toda tabela privada de dominio criada depois recebe `user_id`.

### Autenticacao

Perguntar se ha area publica, login e papeis administrativos.

Default: landing/login publicos, produto protegido, Google OAuth, papel `user`; adicionar
email/senha ou `admin` apenas se necessario agora.

### Integracoes e dados sensiveis

Listar APIs externas, uploads, IA, pagamentos e dados pessoais. Para cada item, registrar:

- dono da integracao;
- segredo necessario e ambiente;
- operacao read-only ou mutante;
- idempotencia/retry;
- dado que nunca pode aparecer em log.

Para variaveis de ambiente, perguntar se o usuario ja possui os valores e indicar o arquivo
local correto. Pedir que ele configure o segredo no ambiente; nao pedir o valor no chat.

### Deploy

Confirmar repositorio, branch, nomes Azure, dominios e se a primeira publicacao pode mudar
infra live. Default: preparar local e abrir gate antes de criar/modificar recurso externo.

## Sintese obrigatoria

Antes de implementar, responder com:

```text
Produto: <uma frase>
Usuario: <quem>
Primeiro valor: <acao observavel>
Recursos/rotas: <mapa curto>
Ownership: individual por `user_id`
Auth: <publico/protegido/providers>
Integracoes: <lista e ambientes>
Nao-objetivos: <lista>
Pendencias: <decisao + default recomendado + bloqueio>
```
