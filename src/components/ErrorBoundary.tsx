import React, { Component, ErrorInfo, ReactNode } from "react";
import { Sparkles, RefreshCw, AlertTriangle, Home, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isOracle = this.props.fallbackTitle?.toLowerCase().includes("oráculo") || false;

      return (
        <div className="min-h-[50vh] p-6 m-4 rounded-2xl bg-card border border-red-500/30 text-card-foreground shadow-2xl flex flex-col items-center justify-center text-center space-y-4 max-w-xl mx-auto my-12">
          <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center shadow-inner">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="font-heading font-bold text-base md:text-lg text-foreground uppercase tracking-wider">
            {this.props.fallbackTitle || "Ha ocurrido un error en la aplicación"}
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground max-w-md leading-relaxed">
            Se ha producido una interrupción temporal al procesar este pergamino o vista. Puedes reintentar, volver al inicio de la biblioteca o recargar la página.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isOracle ? "Restablecer Oráculo" : "Reintentar Vista"}</span>
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-all border border-border flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Recargar Página</span>
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-all border border-border flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Ir a la Biblioteca</span>
            </button>
          </div>

          {this.state.error && (
            <div className="w-full text-left pt-2">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto transition-colors"
              >
                <span>{this.state.showDetails ? "Ocultar detalles técnicos" : "Ver detalles del error"}</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {this.state.showDetails && (
                <div className="mt-2 p-3 bg-black/40 border border-border/80 rounded-lg text-[10px] font-mono text-red-300/90 overflow-x-auto whitespace-pre-wrap max-h-40">
                  {this.state.error.message || String(this.state.error)}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

