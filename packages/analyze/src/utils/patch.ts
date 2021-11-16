const hashRegex = /^From (\S*)/;
const authorRegex = /^From:\s?([^<].*[^>])?\s+(<(.*)>)?/;
const fileNameRegex = /^diff --git "?a\/(.*)"?\s*"?b\/(.*)"?/;
const fileLinesRegex = /^@@ -([0-9]*),?\S* \+([0-9]*),?/;
const similarityIndexRegex = /^similarity index /;
const addedFileModeRegex = /^new file mode /;
const deletedFileModeRegex = /^deleted file mode /;
import pattern from 'nanomatch';

interface PatchConfig {
  analyzePattern: string;
}

export interface PatchResult extends Partial<MetaInfo> {
  files: FilesModifyInfo[];
}
export function parseGitPatch(patch: string, config?: PatchConfig): PatchResult {
  const { analyzePattern } = config || {};
  if (typeof patch !== 'string') {
    throw new Error('Expected first argument (patch) to be a string');
  }
  const lines = patch.split('\n');
  const projectInfo = getPatchMetaInfo(patch, lines);
  const files = getFilesModifyInfo(lines, analyzePattern);

  return {
    ...projectInfo,
    files,
  };
};

interface FilesModifyInfo {
  added: boolean;
  deleted: boolean;
  beforeName: string;
  afterName: string;
  modifiedLines: ModifyFileInfo[];
}
/**
 *或者patch中的所有文件parts的文件修改信息
 *
 * @param {string[]} lines
 * @param {string} analyzePattern
 * @returns {FilesModifyInfo[]}
 */
function getFilesModifyInfo(
    lines: string[],
    analyzePattern: string,
): FilesModifyInfo[] {
  const files: FilesModifyInfo[] = [];
  const diffParts = splitIntoParts(lines, 'diff --git');

  for (const diffPart of diffParts) {
    const fileNameLine = diffPart.shift();
    const [, a, b] = fileNameLine.match(fileNameRegex);
    const metaLine = diffPart.shift();

    const fileData = {
      added: false,
      deleted: false,
      beforeName: a.trim(),
      afterName: b.trim(),
      modifiedLines: [],
    };

    if (
      analyzePattern &&
      !pattern.isMatch(fileData.beforeName, analyzePattern)
    ) {
      return;
    }

    files.push(fileData);

    if (addedFileModeRegex.test(metaLine)) {
      fileData.added = true;
    }
    if (deletedFileModeRegex.test(metaLine)) {
      fileData.deleted = true;
    }
    if (similarityIndexRegex.test(metaLine)) {
      continue;
    }

    fileData.modifiedLines = getModifyFile(diffPart);
  }
  return files;
}

interface ModifyFileInfo {
  added: boolean;
  lineNumber: number;
  line: string;
}
/**
 *获取单个文件的part的修改信息
 *
 * @param {string[]} diffPart
 * @returns {ModifyFileInfo[]}
 */
function getModifyFile(diffPart: string[]): ModifyFileInfo[] {
  const result: ModifyFileInfo[] = [];

  splitIntoParts(diffPart, '@@ ').forEach((lines) => {
    const fileLinesLine = lines.shift();
    const [, a, b] = fileLinesLine.match(fileLinesRegex);

    let nA = parseInt(a);
    let nB = parseInt(b);

    lines.forEach((line) => {
      nA++;
      nB++;

      if (line.startsWith('-- ')) {
        return;
      }
      if (line.startsWith('+')) {
        nA--;

        result.push({
          added: true,
          lineNumber: nB,
          line: line.substr(1),
        });
      } else if (line.startsWith('-')) {
        nB--;

        result.push({
          added: false,
          lineNumber: nA,
          line: line.substr(1),
        });
      }
    });
  });
  return result;
}

interface MetaInfo {
  hash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
}
/**
 *获取patch的meta信息
 *
 * @param {string} patch
 * @param {string[]} lines
 * @returns {(MetaInfo | {})}
 */
function getPatchMetaInfo(patch: string, lines: string[]): MetaInfo | {} {
  if (!/^From/.test(patch)) {
    return {};
  }
  const hashLine = lines.shift();
  const [, hash] = hashLine.match(hashRegex);
  const authorLine = lines.shift();
  const [, authorName, , authorEmail] = authorLine.match(authorRegex);

  const dateLine = lines.shift();
  const [, date] = dateLine.split('Date: ');

  const messageLine = lines.shift();
  const [, message] = messageLine.split('Subject: ');

  return {
    hash,
    authorName,
    authorEmail,
    date,
    message,
  };
}


/**
 *针对lines，根据某个separator分组
 *
 * @param {string[]} lines
 * @param {string} separator
 * @returns {string[][]}
 */
function splitIntoParts(lines: string[], separator: string): string[][] {
  const parts: string[][] = [];
  let currentPart: string[];

  for (const line of lines) {
    if (line.startsWith(separator)) {
      if (currentPart) {
        parts.push(currentPart);
      }
      currentPart = [line];
    } else if (currentPart) {
      currentPart.push(line);
    }
  }

  if (currentPart) {
    parts.push(currentPart);
  }

  return parts;
}
