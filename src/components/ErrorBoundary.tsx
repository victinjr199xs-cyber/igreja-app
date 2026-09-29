import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { reportError } from '../services/errorReporter';

interface State {
  error: Error | null;
}

/**
 * Última rede de segurança: um erro ao desenhar qualquer tela derrubaria o app
 * inteiro (tela branca ou fechamento). Aqui ele vira uma tela com opção de
 * tentar de novo. Fica fora do tema e das fontes de propósito: precisa
 * funcionar mesmo que o erro venha deles.
 */
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError('ui', error, { componentStack: info.componentStack?.slice(0, 1500) });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.icon}>🙏</Text>
        <Text style={styles.title}>Algo deu errado</Text>
        <Text style={styles.text}>
          Desculpe o transtorno. Toque abaixo para voltar ao app. Se continuar acontecendo, avise a
          equipe da igreja.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => this.setState({ error: null })}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
        {__DEV__ && <Text style={styles.detail}>{String(this.state.error?.message)}</Text>}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EEECEB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333333',
    marginTop: 16,
  },
  text: {
    fontSize: 15,
    color: '#6B6664',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#823030',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  detail: {
    fontSize: 12,
    color: '#C62828',
    marginTop: 20,
    textAlign: 'center',
  },
});
