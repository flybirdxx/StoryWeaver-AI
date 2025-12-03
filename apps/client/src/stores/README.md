# Zustand Stores

全局状态管理 Store，使用 Zustand + Immer 实现。

## useProjectStore

管理项目相关的全局状态，包括分镜列表、当前项目 ID、选中的分镜等。

### 使用示例

```typescript
import { useProjectStore } from './stores/useProjectStore';

function MyComponent() {
  // 获取整个 store
  const { panels, setPanels, updatePanelStatus } = useProjectStore();
  
  // 或者只订阅需要的部分（性能优化）
  const panels = useProjectStore((state) => state.panels);
  const setPanels = useProjectStore((state) => state.setPanels);
  
  // 使用
  useEffect(() => {
    setPanels(loadedPanels);
  }, []);
  
  const handleStatusUpdate = (id: string) => {
    updatePanelStatus(id, 'completed', 'https://example.com/image.jpg');
  };
  
  return (
    <div>
      {panels.map(panel => (
        <div key={panel.id}>{panel.prompt}</div>
      ))}
    </div>
  );
}
```

### API

- `panels: Panel[]` - 当前项目的分镜列表
- `currentProjectId: string | null` - 当前选中的项目 ID
- `selectedPanelId: string | number | null` - 当前选中的分镜 ID
- `setPanels(panels: Panel[])` - 设置分镜列表
- `updatePanelStatus(id, status, url?)` - 更新分镜状态和图片 URL
- `updatePanelImage(id, imageUrl, isUrl?)` - 更新分镜图片
- `setCurrentProjectId(id)` - 设置当前项目 ID
- `setSelectedPanelId(id)` - 设置选中的分镜 ID
- `addPanel(panel)` - 添加新分镜
- `removePanel(id)` - 删除分镜

## useCharacterStore

管理角色相关的全局状态，包括角色列表。

### 使用示例

```typescript
import { useCharacterStore } from './stores/useCharacterStore';

function MyComponent() {
  const characters = useCharacterStore((state) => state.characters);
  const addCharacter = useCharacterStore((state) => state.addCharacter);
  
  const handleAdd = () => {
    addCharacter({
      id: 'new-id',
      name: '新角色',
      description: '角色描述'
    });
  };
  
  return (
    <div>
      {characters.map(char => (
        <div key={char.id}>{char.name}</div>
      ))}
    </div>
  );
}
```

### API

- `characters: Character[]` - 角色列表
- `setCharacters(characters: Character[])` - 设置角色列表
- `addCharacter(character: Character)` - 添加或更新角色
- `updateCharacter(id, updates)` - 更新角色
- `removeCharacter(id)` - 删除角色

## useSettingsStore

管理系统设置相关的全局状态，包括 API Keys。

### 使用示例

```typescript
import { useSettingsStore } from './stores/useSettingsStore';

function MyComponent() {
  const geminiApiKey = useSettingsStore((state) => state.geminiApiKey);
  const setGeminiApiKey = useSettingsStore((state) => state.setGeminiApiKey);
  
  const handleSave = () => {
    setGeminiApiKey('AIzaSy...');
  };
  
  return (
    <div>
      <input 
        type="password" 
        value={geminiApiKey} 
        onChange={(e) => setGeminiApiKey(e.target.value)} 
      />
    </div>
  );
}
```

### API

- `geminiApiKey: string` - Gemini API Key
- `deepseekApiKey: string` - DeepSeek API Key
- `setGeminiApiKey(key: string)` - 设置 Gemini API Key（自动同步到 localStorage）
- `setDeepseekApiKey(key: string)` - 设置 DeepSeek API Key（自动同步到 localStorage）
- `loadFromLocalStorage()` - 从 localStorage 加载保存的 API Keys

## 未来扩展

可以添加更多 Store：
- `useUIStore` - UI 状态（侧边栏展开/收起、主题切换等）

