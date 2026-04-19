import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../components/common/Modal';

describe('Modal', () => {
  it('не рендерится когда isOpen=false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Тест">
        <p>Содержимое</p>
      </Modal>
    );
    expect(screen.queryByText('Тест')).toBeNull();
    expect(screen.queryByText('Содержимое')).toBeNull();
  });

  it('рендерится когда isOpen=true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Мой заголовок">
        <p>Дочерний контент</p>
      </Modal>
    );
    expect(screen.getByText('Мой заголовок')).toBeInTheDocument();
    expect(screen.getByText('Дочерний контент')).toBeInTheDocument();
  });

  it('отображает переданный title', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Добавить клиента">
        <span />
      </Modal>
    );
    expect(screen.getByText('Добавить клиента')).toBeInTheDocument();
  });

  it('вызывает onClose при нажатии кнопки закрытия (X)', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Тест">
        <span />
      </Modal>
    );
    // Кнопка содержит SVG иконку HiX
    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('вызывает onClose при клике по оверлею (фон)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Тест">
        <span />
      </Modal>
    );
    // Оверлей — div с классом bg-gray-500
    const overlay = container.querySelector('.bg-gray-500');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('размер по умолчанию — md (max-w-lg)', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Default size">
        <span />
      </Modal>
    );
    const dialog = container.querySelector('.max-w-lg');
    expect(dialog).not.toBeNull();
  });

  it('размер sm — max-w-md', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="sm" size="sm">
        <span />
      </Modal>
    );
    expect(container.querySelector('.max-w-md')).not.toBeNull();
  });

  it('размер lg — max-w-2xl', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="lg" size="lg">
        <span />
      </Modal>
    );
    expect(container.querySelector('.max-w-2xl')).not.toBeNull();
  });

  it('размер xl — max-w-4xl', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="xl" size="xl">
        <span />
      </Modal>
    );
    expect(container.querySelector('.max-w-4xl')).not.toBeNull();
  });

  it('рендерит дочерние элементы внутри модального окна', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Тест">
        <input data-testid="inner-input" />
      </Modal>
    );
    expect(screen.getByTestId('inner-input')).toBeInTheDocument();
  });
});
