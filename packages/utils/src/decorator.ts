import {Template} from './template';

/**
 * 模板修改完进行commit输出到目录中
 */
export function commit<T extends Template>(
    target: T,
    propertyName: string,
    propertyDescriptor: PropertyDescriptor,
) {
  const method = propertyDescriptor.value;

  propertyDescriptor.value = async function(...args) {
    await method.apply(this, args);
    await new Promise<void>((resolve) => {
      this.edit.commit(() => resolve());
    });
  };
  return propertyDescriptor;
}

