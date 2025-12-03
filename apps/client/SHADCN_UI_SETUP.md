# shadcn/ui 配置说明

## 已完成的基础配置

1. ✅ 安装了 `clsx` 和 `tailwind-merge` 工具库
2. ✅ 创建了 `components.json` 配置文件
3. ✅ 配置了 TypeScript 路径别名 (`@/*`)
4. ✅ 配置了 Vite 路径别名
5. ✅ 创建了 `src/lib/utils.ts` 工具函数（`cn` 函数）
6. ✅ 更新了 Tailwind 配置以支持 shadcn/ui 的 CSS 变量
7. ✅ 更新了 `index.css` 以包含 shadcn/ui 的基础样式变量

## 如何使用 shadcn/ui 组件

### 方法 1: 使用 npx shadcn-ui CLI（推荐）

```bash
cd apps/client
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
# ... 更多组件
```

### 方法 2: 手动创建组件

参考 [shadcn/ui 文档](https://ui.shadcn.com/docs/components) 手动创建组件。

组件应放在 `src/components/ui/` 目录下。

### 示例：使用 Button 组件

```tsx
import { Button } from '@/components/ui/button';

function MyComponent() {
  return (
    <Button variant="default" size="lg">
      点击我
    </Button>
  );
}
```

## 下一步

1. 运行 `npx shadcn-ui@latest init` 确认配置（如果需要）
2. 添加需要的组件：`npx shadcn-ui@latest add [component-name]`
3. 在项目中使用这些组件替换现有的基础组件

## 注意事项

- 所有 shadcn/ui 组件都使用 Tailwind CSS 和 CSS 变量
- 组件是完全可定制的，可以直接修改源代码
- 确保在使用组件前已正确配置 Tailwind 和路径别名

