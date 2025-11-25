import { DtoType } from "../to-copy/types/dto-type";

/**
 * DtoOptions装饰器
 * 用于控制实体字段在不同DTO类型中的包含情况
 *
 * @param options 配置选项
 * @returns 装饰器函数
 */
export function DtoOptions(options?: { exclude?: boolean | DtoType[] }) {
  return function (target: any, propertyKey: string) {
    // 这只是一个标记装饰器，实际的逻辑在DTO生成器中处理
    // 可以在这里存储元数据供生成器使用
    if (options) {
      // 在实际应用中，可以使用Reflect.metadata来存储配置
      // Reflect.defineMetadata('dto:options', options, target, propertyKey);
    }
  };
}