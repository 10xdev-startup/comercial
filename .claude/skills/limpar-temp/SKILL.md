---
name: limpar-temp
description: "Limpa o Temp do Windows (incluindo os crash dumps .dmp do WSL) pra liberar espaco em disco. Use quando o usuario pedir para 'limpar temp', 'limpar dumps', 'limpar crash', 'liberar espaco', ou invocar /limpar-temp."
---

# Limpar Temp do Windows + crash dumps do WSL

Fluxo pra escanear e limpar **a pasta Temp do Windows**, com foco especial nos
**crash dumps `.dmp` do WSL** (`Temp/wsl-crashes`), que sao os maiores ofensores
e reaparecem sempre que o backend do WSL/Cursor crasha.

Funciona no WSL acessando o path Windows via `/mnt/c/`.

**Regra principal:** nunca limpar sem confirmar. Sempre mostrar o que sera apagado, com tamanhos, antes.

## 1. Escanear o Temp do Windows

Rode o bloco abaixo — ele detecta a pasta de perfil do Windows, separa os crash
dumps `.dmp` e lista os maiores itens dentro do Temp:

```bash
# Detecta a pasta de perfil do Windows automaticamente.
# Usa %USERPROFILE% (caminho real da pasta) em vez de %USERNAME%, que pode
# divergir do nome da pasta quando a conta foi renomeada.
WINPROFILE=$(cmd.exe /c "echo %USERPROFILE%" 2>/dev/null | tr -d '\r\n')
WINHOME=$(wslpath -u "$WINPROFILE" 2>/dev/null)
# Fallback: se nao detectou ou a pasta nao existe,
# pega a primeira pasta de usuario real em /mnt/c/Users
if [ -z "$WINHOME" ] || [ ! -d "$WINHOME" ]; then
  WINHOME=$(find /mnt/c/Users -maxdepth 1 -mindepth 1 -type d \
    ! -iname "Public" ! -iname "Default*" ! -iname "All Users" \
    ! -iname "WDAGUtilityAccount" 2>/dev/null | head -n1)
fi
TEMP="$WINHOME/AppData/Local/Temp"
echo "Pasta de perfil Windows: $WINHOME"
echo "Temp alvo: $TEMP"
echo ""

# --- Crash dumps .dmp do WSL (alvo recorrente) ---
dmp_count=$(find "$TEMP" -type f -iname "*.dmp" 2>/dev/null | wc -l)
dmp_bytes=$(find "$TEMP" -type f -iname "*.dmp" -printf '%s\n' 2>/dev/null | awk '{s+=$1} END{print s+0}')
echo "=== Crash dumps (.dmp) ==="
echo "$dmp_count arquivo(s) — $(numfmt --to=iec ${dmp_bytes:-0})"
echo ""

# --- Maiores itens dentro do Temp (top 15, > 1 MB) ---
echo "=== Maiores itens no Temp ==="
printf "%-6s %-10s %s\n" "#" "TAMANHO" "ITEM"
i=1
while IFS=$'\t' read -r size item; do
  [ "$item" = "$TEMP" ] && continue
  printf "%-6s %-10s %s\n" "$i" "$(numfmt --to=iec "$size")" "$(basename "$item")"
  i=$((i+1))
done < <(du -b -d 1 "$TEMP" 2>/dev/null | awk '$1 > 1048576' | sort -rn | head -15)

echo ""
echo "=== Total do Temp ==="
du -sh "$TEMP" 2>/dev/null | awk '{print $1}'
```

Filtra itens com menos de 1 MB pra nao poluir a lista.

## 2. Apresentar e perguntar

Mostre os crash dumps + a lista de itens ao usuario. Pergunte o que limpar:

- `dmp` — apaga **somente os crash dumps `.dmp`** (geralmente o grosso do espaco; alvo recorrente)
- `tudo` — limpa o **Temp inteiro** do Windows
- numeros separados por virgula (ex: `1,3,5`) — limpa so esses itens da lista
- `cancel` — aborta sem fazer nada

**Nao execute sem confirmacao.** Arquivos em uso sao automaticamente pulados pelo `find ... -delete`, mas ainda assim o usuario precisa escolher.

## 3. Limpar conforme a escolha

**Opcao `dmp`** — apaga so os crash dumps, medindo antes/depois:

```bash
before=$(find "$TEMP" -type f -iname "*.dmp" -printf '%s\n' 2>/dev/null | awk '{s+=$1} END{print s+0}')
find "$TEMP" -type f -iname "*.dmp" -delete 2>/dev/null
echo "$(numfmt --to=iec ${before:-0}) liberado em crash dumps (.dmp)"
```

**Opcao `tudo`** — esvazia o Temp inteiro:

```bash
before=$(du -sb "$TEMP" 2>/dev/null | awk '{print $1}')
find "$TEMP" -mindepth 1 -delete 2>/dev/null
after=$(du -sb "$TEMP" 2>/dev/null | awk '{print $1}')
echo "$(numfmt --to=iec $((before - after))) liberado no Temp"
```

**Opcao numeros** — para cada item escolhido (`$item` = path completo):

```bash
before=$(du -sb "$item" 2>/dev/null | awk '{print $1}')
rm -rf "$item" 2>/dev/null
echo "$(numfmt --to=iec ${before:-0}) liberado em $(basename "$item")"
```

Acumule o liberado em uma variavel total.

## 4. Reportar resultado

Ao final, mostre quanto foi liberado e o estado novo do Temp:

```
**X GB liberados**

- 16 GB em crash dumps (.dmp)
- ...

Temp agora: 3.9 GB (antes: 19 GB)
```

## Regras

- **Nunca** execute sem mostrar a lista + confirmacao do usuario
- Foco e **so o Temp do Windows** — nao tocar em caches do WSL, navegadores, npm, etc.
- Pular silenciosamente arquivos em uso (o `2>/dev/null` ja cuida disso)
- Se os `.dmp` voltarem a aparecer em grande volume, **avise**: e sinal de crash recorrente (ex: `node` do `.cursor-server`), e limpar so trata o sintoma — vale investigar a causa
- Responder em portugues
```
