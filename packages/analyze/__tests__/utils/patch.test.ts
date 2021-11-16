import fs from 'fs';
import path from 'path';
import { parseGitPatch } from '../../src/utils/patch';

const dataLocation = path.resolve(__dirname, '../patch');
const data: {[key: string]: string} = {};

// read file data
fs.readdirSync(dataLocation).forEach((fileName) => {
  data[fileName] = fs.readFileSync(path.resolve(dataLocation, fileName), 'utf-8');
});

describe('parse git patch file', () => {
  test('is a function', () => {
    expect(typeof parseGitPatch).toBe('function');
  });

  test('parses a simple patch', () => {
    const patchResult = parseGitPatch(data['one-file.patch']);
    const diffResult = parseGitPatch(data['one-file-diff.patch']);
    expect.assertions(2);
    expect(patchResult).toMatchSnapshot();
    expect(diffResult).toMatchSnapshot();
  });

  test('parses a many-files patch', () => {
    const result = parseGitPatch(data['many-files.patch']);
    expect(result).toMatchSnapshot();
  });

  test('parses a renaming patch', () => {
    const result = parseGitPatch(data['rename-file.patch']);

    expect(result).toMatchSnapshot();
  });

  test('parses a add and delete patch', () => {
    const result = parseGitPatch(data['add-and-delete-file.patch']);

    expect(result).toMatchSnapshot('add-and-delete-file.patch');
  });

  test('parses a complex patch', () => {
    const result = parseGitPatch(data['complex.patch']);
    expect(result).toMatchSnapshot();
  });
});
