## Redesign da tela de entrada — MCSE Mapper

Aplicar o design escolhido ("Minimal com status técnico") na tela de autenticação, substituindo o card centralizado por um layout split 60/40.

### Escopo
- Arquivo único alterado: `src/pages/AuthPage.tsx`.
- Nenhum SQL, migration, alteração de banco, rotas ou lógica de autenticação.
- Mantém toda a lógica atual: `signInWithPassword`, `signUp` com `emailRedirectTo`, toggle Login/Criar conta, toasts e estados de loading.

### Estrutura visual

```text
┌────────────────────────────────┬──────────────────────┐
│  PAINEL INSTITUCIONAL (60%)    │  FORMULÁRIO (40%)    │
│                                │                      │
│  • Logo + "MCSE Mapper"        │  Entrar / Criar      │
│  • Headline grande:            │                      │
│    "A precisão regulatória     │  [E-mail]            │
│     do setor elétrico em       │  [Senha]             │
│     um só lugar."              │  [Botão Entrar]      │
│  • Subtítulo descritivo        │                      │
│  • Fundo: pattern de pontos    │  ── divisor ──       │
│    + gradiente azul sutil      │  Toggle criar conta  │
│  • Bloco técnico inferior:     │                      │
│    badge "Audit Core" +        │                      │
│    barras estilizadas          │                      │
└────────────────────────────────┴──────────────────────┘
```

### Detalhes técnicos

- **Container raiz**: `flex min-h-screen w-full bg-background`.
- **Painel esquerdo** (`hidden lg:flex lg:w-3/5`): 
  - Padding `p-16`, `flex-col justify-between`, `border-r border-border`.
  - Background pattern: `radial-gradient` de pontos `hsl(var(--primary))` com baixa opacidade + overlay gradient sutil.
  - Topo: logo em quadrado `bg-primary` + ícone Lucide (`FileText` ou similar) + "MCSE Mapper" em `text-2xl font-bold`.
  - Headline `text-5xl font-semibold` + parágrafo `text-lg text-muted-foreground`.
  - Rodapé do painel: card pequeno com borda + badge mono "Audit Core v4.2" com bolinha pulsante + grid de barras decorativas (`bg-primary/40`, `bg-muted`).
- **Painel direito** (`w-full lg:w-2/5`): 
  - Centralizado vertical e horizontalmente (`flex items-center justify-center p-8 lg:p-16`).
  - Wrapper `w-full max-w-sm`.
  - Título `text-3xl font-bold` ("Entrar" ou "Criar conta") + subtítulo `text-muted-foreground`.
  - Labels em IBM Plex Mono, `text-xs uppercase tracking-wider` (`font-mono` via style inline já presente no projeto).
  - Inputs reutilizam shadcn `Input` (mantém tokens) ou estilo customizado consistente com o tema.
  - Botão `Button` shadcn full width com `Loader2` no loading.
  - Toggle "Não tem conta? Criar conta" / "Já tem conta? Entrar" em divisor com `border-t`.
  - Branding mobile no rodapé quando `lg:hidden` desktop side esconde.

### Mobile (<1024px)
- Painel esquerdo é escondido (`hidden lg:flex`).
- Formulário ocupa 100% da largura, centralizado.
- Logo pequena no rodapé do form para manter identidade.

### Tokens
- Sem hard-coded hex. Usar tokens existentes (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary`, `bg-muted`).
- Pattern e gradient via inline style com `hsl(var(--primary) / 0.X)` para respeitar tema.

### Fora do escopo
- Não alterar `App.tsx`, rotas, hooks, `useUserProfile`, `ProfileRouter`.
- Não adicionar Google/social login.
- Não criar página de reset de senha (não solicitado).
- Não alterar `ClienteLayout`, `AppLayout`, nem nenhuma rota interna.

### Validação
- Verificar visualmente no preview (desktop e mobile) após implementação.
- Conferir que login e signup ainda funcionam (lógica não muda).
