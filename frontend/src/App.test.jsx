import { render, screen } from '@testing-library/react'; import { Provider } from 'react-redux'; import { store } from './store'; import App from './App';
test('renders sign in screen', () => { render(<Provider store={store}><App/></Provider>); expect(screen.getByText('Welcome back.')).toBeInTheDocument(); });
