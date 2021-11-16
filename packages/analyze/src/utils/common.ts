const sniff = require('is-ali-intranet');

export async function isInsideNetWork() {
  try {
    const isInside = await sniff();
    return isInside.isAliIntranet;
  } catch {
    return false;
  }
}

/**
 *
 * promise 串行运行promise
 * @export
 * @param {Array<Promise<any>>} list
 * @returns
 */
export function promiseQueue(list: Array<Promise<any>>) {
  let sequence = Promise.resolve();
  list.map((item) => {
    sequence = sequence.then(() => item);
  });
  return sequence;
}

/**
 *顺序执行异步执行函数
 *
 * @export
 * @param {(() => Promise<any>)[]} list
 */
export function promiseQueueExecute(list: (() => Promise<any>)[]) {
  let queue = Promise.resolve();
  for (const p of list) {
    queue = queue.then(() => p());
  }
  return queue;
}
