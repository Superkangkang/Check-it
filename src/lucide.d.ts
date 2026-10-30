// lucide 包没有随包提供 types 入口，这里只声明面板实际用到的图标节点

declare module 'lucide' {
  export type LucideIconNode = Array<
    [tag: string, attrs: Record<string, string | number | undefined>]
  >;

  export const UnfoldHorizontal: LucideIconNode;
  export const UnfoldVertical: LucideIconNode;
  export const RotateCw: LucideIconNode;
  export const ArrowUpDown: LucideIconNode;
  export const ArrowLeftRight: LucideIconNode;
  export const ArrowUp: LucideIconNode;
  export const ArrowRight: LucideIconNode;
  export const ArrowDown: LucideIconNode;
  export const ArrowLeft: LucideIconNode;
}
