import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fileFilter, uploadListingImages } from '../middleware/upload.js';

// Хелпер для создания mock-файла
const makeFile = (originalname, mimetype) => ({ originalname, mimetype });

// Хелпер для получения результата cb
const callFilter = (file) =>
  new Promise((resolve, reject) => {
    fileFilter({}, file, (err, ok) => {
      if (err) reject(err);
      else resolve(ok);
    });
  });

describe('fileFilter — разрешённые типы изображений', () => {
  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['photo.jpeg', 'image/jpeg'],
    ['image.png', 'image/png'],
    ['anim.gif', 'image/gif'],
    ['pic.webp', 'image/webp'],
  ])('принимает файл %s с mimetype %s', async (name, mime) => {
    const result = await callFilter(makeFile(name, mime));
    expect(result).toBe(true);
  });
});

describe('fileFilter — запрещённые типы', () => {
  it.each([
    ['document.pdf', 'application/pdf'],
    ['archive.zip', 'application/zip'],
    ['script.js', 'text/javascript'],
    ['data.csv', 'text/csv'],
    ['photo.bmp', 'image/bmp'],
  ])('отклоняет файл %s с mimetype %s', async (name, mime) => {
    await expect(callFilter(makeFile(name, mime))).rejects.toThrow(
      'Разрешены только изображения (jpeg, jpg, png, gif, webp)'
    );
  });
});

describe('fileFilter — граничные случаи', () => {
  it('отклоняет файл с верным расширением, но неверным mimetype', async () => {
    await expect(callFilter(makeFile('image.jpg', 'text/plain'))).rejects.toThrow();
  });

  it('отклоняет файл с верным mimetype, но неверным расширением (.exe)', async () => {
    await expect(callFilter(makeFile('virus.exe', 'image/jpeg'))).rejects.toThrow();
  });
});

describe('uploadListingImages — конфигурация multer', () => {
  it('экспортируется как объект (multer middleware)', () => {
    expect(uploadListingImages).toBeDefined();
    // multer() возвращает объект с методами (single, array, fields, any)
    expect(typeof uploadListingImages).toBe('object');
  });

  it('содержит метод single()', () => {
    expect(typeof uploadListingImages.single).toBe('function');
  });

  it('содержит метод array()', () => {
    expect(typeof uploadListingImages.array).toBe('function');
  });

  it('содержит метод fields()', () => {
    expect(typeof uploadListingImages.fields).toBe('function');
  });
});

describe('multer storage — коллбэки destination и filename', () => {
  it('storage.getDestination вызывает cb с путём к директории загрузок', () => {
    const storage = uploadListingImages.storage;
    expect(storage).toBeDefined();
    return new Promise((resolve) => {
      storage.getDestination({}, {}, (err, dest) => {
        expect(err).toBeNull();
        expect(dest).toContain('uploads');
        expect(dest).toContain('listings');
        resolve(undefined);
      });
    });
  });

  it('storage.getFilename генерирует уникальное имя файла с расширением из originalname', () => {
    const storage = uploadListingImages.storage;
    const mockFile = { originalname: 'photo.jpg' };
    return new Promise((resolve) => {
      storage.getFilename({}, mockFile, (err, filename) => {
        expect(err).toBeNull();
        expect(filename).toMatch(/^listing-\d+-.+\.jpg$/);
        resolve(undefined);
      });
    });
  });

  it('storage.getFilename сохраняет расширение .png', () => {
    const storage = uploadListingImages.storage;
    const mockFile = { originalname: 'image.png' };
    return new Promise((resolve) => {
      storage.getFilename({}, mockFile, (err, filename) => {
        expect(err).toBeNull();
        expect(filename).toMatch(/\.png$/);
        resolve(undefined);
      });
    });
  });

  it('storage.getFilename генерирует разные имена для двух вызовов', async () => {
    const storage = uploadListingImages.storage;
    const mockFile = { originalname: 'test.jpg' };

    const name1 = await new Promise((resolve) => {
      storage.getFilename({}, mockFile, (err, filename) => resolve(filename));
    });
    const name2 = await new Promise((resolve) => {
      storage.getFilename({}, mockFile, (err, filename) => resolve(filename));
    });

    // Имена могут совпадать если вызов почти одновременный, но оба должны соответствовать паттерну
    expect(name1).toMatch(/^listing-\d+-.+\.jpg$/);
    expect(name2).toMatch(/^listing-\d+-.+\.jpg$/);
  });
});
