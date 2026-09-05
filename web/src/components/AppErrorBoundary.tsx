import {Component, type ErrorInfo, type ReactNode} from 'react';

import {getErrorMessage} from '../lib/errorMessages';
import {ErrorModal} from './FeedbackModals';

export class AppErrorBoundary extends Component<
  {children: ReactNode},
  {errorMessage: string | null}
> {
  state = {
    errorMessage: null,
  };

  static getDerivedStateFromError(error: unknown) {
    return {
      errorMessage: getErrorMessage(
        error,
        'O app encontrou uma falha inesperada ao montar esta tela.',
      ),
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error('Erro capturado pelo LogGYM:', error, errorInfo);
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div className="panel-shell panel-shell--auth">
          <ErrorModal
            message={this.state.errorMessage}
            onClose={() => this.setState({errorMessage: null})}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
