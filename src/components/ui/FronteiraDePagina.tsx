import React, { Component, type ReactNode } from 'react';

/**
 * FRONTEIRA DE PÁGINA — fim dos ecrãs brancos.
 *
 * As páginas da aplicação são carregadas à parte (`React.lazy`). Quando uma
 * delas falha — rede instável, deploy novo que apaga os ficheiros antigos
 * (os nomes levam hash), cache do browser desactualizada — a promessa de
 * importação rejeita e a React desmonta a árvore: `#root` fica com ZERO
 * filhos. Reproduzido em produção: clicar «Perfil» com o ficheiro da página
 * bloqueado deixava a aplicação em branco, sem uma única mensagem.
 *
 * Esta fronteira:
 *   1. apanha o erro durante o render (o que a aplicação NÃO fazia: só tinha
 *      ouvintes globais de `window`, que não recuperam a árvore);
 *   2. reconhece o padrão típico de ficheiro desactualizado e recarrega a
 *      página UMA vez (guarda de sessão, para não entrar em ciclo);
 *   3. se voltar a falhar, mostra uma página de recuperação legível com
 *      «Tentar novamente» e «Voltar ao painel» — nunca um ecrã branco.
 */
interface Props {
  children: ReactNode;
  /** Nome do painel, para a mensagem de recuperação. */
  area?: string;
}

interface State {
  erro: Error | null;
  tentouRecarregar: boolean;
}

const CHAVE_RECARGA = 'cda_recarga_por_chunk';
const MSG_CHUNK =
  /failed to fetch dynamically imported module|importing a module script failed|loading chunk|dynamically imported module|load failed|networkerror|err_network|unexpected token '<'|is not a valid javascript mime type/i;

/** O erro é (muito provavelmente) um ficheiro da aplicação que não carregou? */
function pareceFalhaDeCarregamento(erro: unknown): boolean {
  const texto = `${(erro as any)?.message || erro || ''} ${(erro as any)?.stack || ''}`.toLowerCase();
  if (MSG_CHUNK.test(texto)) return true;
  // Versão em português do browser / falhas de rede genéricas ao importar.
  return texto.includes('módulo') && texto.includes('import');
}

export class FronteiraDePagina extends Component<Props, State> {
  // Sem `@types/react` nesta instalação o `props` herdado não é tipado;
  // declaramo-lo explicitamente (é o mesmo objeto que a React injecta).
  declare props: Props;
  declare setState: (parcial: Partial<State> | ((anterior: State) => Partial<State>)) => void;
  state: State = { erro: null, tentouRecarregar: false };

  static getDerivedStateFromError(erro: Error): Partial<State> {
    return { erro };
  }

  componentDidCatch(erro: Error) {
    const falhaDeFicheiro = pareceFalhaDeCarregamento(erro);
    console.error('[FronteiraDePagina] erro apanhado', { falhaDeFicheiro, erro });

    if (!falhaDeFicheiro) return;

    // Recarregar resolve o caso mais comum (ficheiro antigo em cache).
    // Uma recarga por sessão, para nunca entrar em ciclo de refresh.
    let jaRecarregou = false;
    try {
      jaRecarregou = sessionStorage.getItem(CHAVE_RECARGA) === '1';
    } catch { /* sessão indisponível */ }

    if (!jaRecarregou) {
      try { sessionStorage.setItem(CHAVE_RECARGA, '1'); } catch { /* ignorar */ }
      this.setState({ tentouRecarregar: true });
      // Recarrega a página inteira: o browser volta a pedir os ficheiros actuais.
      window.location.reload();
    }
  }

  componentDidMount() {
    // Recarga bem-sucedida: limpar a guarda para que um futuro incidente
    // (noutra sessão de trabalho) ainda possa beneficiar da recarga automática.
    try { sessionStorage.removeItem(CHAVE_RECARGA); } catch { /* ignorar */ }
  }

  private voltarAoPainel = () => {
    try { sessionStorage.removeItem(CHAVE_RECARGA); } catch { /* ignorar */ }
    const destino = window.location.pathname.replace(/\/(institucional|admin)\/?$/, (m) => m);
    const raiz = /\/institucional/.test(window.location.pathname)
      ? '/institucional#/home'
      : /\/admin/.test(window.location.pathname)
        ? '/admin#/gov-dashboard'
        : '/#/home';
    window.location.href = raiz || destino;
  };

  private tentarNovamente = () => {
    try { sessionStorage.removeItem(CHAVE_RECARGA); } catch { /* ignorar */ }
    this.setState({ erro: null, tentouRecarregar: false });
    window.location.reload();
  };

  render() {
    const { erro, tentouRecarregar } = this.state;
    // (props lidas abaixo via this.props)
    if (!erro) return this.props.children;

    const area = this.props.area ? `«${this.props.area}»` : 'esta página';
    const falhaDeFicheiro = pareceFalhaDeCarregamento(erro);

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 font-sans" role="alert">
        <div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-8 max-w-lg w-full text-center space-y-5">
          <div className="w-16 h-16 bg-amber-50 border border-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              {falhaDeFicheiro ? 'Não foi possível abrir a página' : 'Esta página não carregou'}
            </h2>
            <p className="text-sm text-slate-600 font-semibold leading-relaxed">
              {falhaDeFicheiro
                ? `A aplicação foi actualizada ou a ligação falhou enquanto ${area} carregava. Os seus dados estão seguros.`
                : `Ocorreu um problema ao mostrar ${area}. Os seus dados estão seguros.`}
              {tentouRecarregar ? ' Já tentámos recarregar automaticamente.' : ''}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={this.tentarNovamente}
              className="py-3 bg-[#0E2B64] hover:bg-[#081a3d] text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all cursor-pointer border-none"
            >
              Tentar novamente
            </button>
            <button
              onClick={this.voltarAoPainel}
              className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[11px] uppercase tracking-widest rounded-xl transition-all cursor-pointer border border-slate-300"
            >
              Voltar ao painel
            </button>
          </div>
          <details className="text-left">
            <summary className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer">
              Detalhe técnico
            </summary>
            <p className="mt-2 text-[10px] font-mono text-slate-500 break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
              {erro.message || String(erro)}
            </p>
          </details>
        </div>
      </div>
    );
  }
}

export default FronteiraDePagina;
