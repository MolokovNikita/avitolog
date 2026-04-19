import { describe, it, expect, vi } from 'vitest';

describe('upload middleware init', () => {
  it('создаёт директорию uploads/listings если её нет', async () => {
    vi.resetModules();
    vi.doMock('fs', async () => {
      const actual = await vi.importActual('fs');
      const mocked = {
        ...actual,
        existsSync: vi.fn(() => false),
        mkdirSync: vi.fn(),
      };
      return {
        ...mocked,
        default: mocked,
      };
    });

    await import('../middleware/upload.js');
    const fs = await import('fs');
    expect(fs.mkdirSync).toHaveBeenCalled();
  });
});

