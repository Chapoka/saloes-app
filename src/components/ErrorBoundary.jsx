import { Component } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <AlertCircle className="w-full h-full" />
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-2">Erro na Aplicação</h2>
            <p className="text-on-surface-variant mb-4">
              Ocorreu um erro inesperado. Verifique o console do navegador (F12) para mais detalhes.
            </p>
            {this.state.error && (
              <details className="text-left mb-4 p-4 bg-red-50 rounded-lg text-sm text-red-700">
                <summary className="font-semibold cursor-pointer mb-2">Detalhes do erro</summary>
                <pre className="whitespace-pre-wrap overflow-auto max-h-60">
                  {this.state.error?.message || this.state.error}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <Button onClick={this.handleRetry} className="w-full" size="lg">
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar Página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;