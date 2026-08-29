import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';

test('renders landing page and navigates to sign in screen', () => {
  render(
    <Provider store={store}>
      <App />
    </Provider>
  );

  // Landing page renders
  expect(screen.getAllByText(/CVConnect/i).length).toBeGreaterThan(0);

  // Click Sign in
  const signInBtns = screen.getAllByRole('button', { name: /Sign in/i });
  if (signInBtns.length > 0) {
    fireEvent.click(signInBtns[0]);
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
  }
});
