# Clamour in the Darkness - Checklist Mestre

## Regra central
Este checklist pertence ao projeto inteiro, não a uma engine. Um item só pode virar `[x]` quando **Unity e Web** suportarem a mesma etapa e ela estiver validada no ambiente correspondente.

## Estado sincronizado atual
- [x] Universal Server definido como backend compartilhado.
- [x] Repositório Web existente.
- [x] Web local inicia com Vite.
- [x] Repositório Unity existente.
- [ ] Unity + Web comprovadamente sincronizados funcionalmente.
- [ ] Player state compartilhado e validado nas duas versões.
- [ ] World state compartilhado e validado nas duas versões.
- [ ] Multiplayer validado nas duas versões.
- [ ] Reconexão validada nas duas versões.
- [ ] Mapa real de Araras validado nas duas versões.
- [ ] Endereço inicial integrado nas duas versões.
- [ ] Street View integrado nas duas versões.
- [ ] Backup pré-expiração validado nas duas versões do cliente.
- [ ] Manutenção global validada nas duas versões.
- [ ] Teste de desastre/restore validado nas duas versões.

## Gating por fase
1. Infraestrutura e persistência
2. Estado do jogador e criação inicial
3. Mundo compartilhado
4. Multiplayer e sincronização
5. Mapa real de Araras e Street View
6. Manutenção e continuidade
7. Testes de desastre e lançamento

## Regra de conclusão
Se um recurso estiver pronto no Unity mas não no Web, ou vice-versa, ele permanece `[ ]`.

## Objetivo 100%
As duas versões devem apresentar o mesmo jogo em termos de regras, estado, progressão, mundo compartilhado e dados persistentes, diferindo apenas na camada de execução/renderização.
