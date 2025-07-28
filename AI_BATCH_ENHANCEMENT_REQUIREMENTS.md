# AI批量处理功能增强需求文档

## 📋 需求概述

### 🎯 项目背景
当前AI批量处理功能的数据源列是固定的（与目标列相同），用户希望能够独立选择数据源列，并在数据预览中查看选中行×选择列的具体单元格数据，以便更好地了解即将处理的数据内容。

### 🚀 需求目标
1. **增加数据源列选择功能**：在AI模型选择下方添加数据源列选择下拉框
2. **改进数据预览显示**：显示选中行与选择列交集的具体单元格数据
3. **保持现有功能完整性**：不影响现有的AI批量处理逻辑和用户体验

## 🔍 当前状态分析

### 现有功能流程
1. 用户在表格左侧选中行（如第1、2行）
2. 点击某列的AI批处理按钮（如"新基础文本列"）
3. 弹出AI批量处理窗口
4. 数据源自动为点击的列，数据预览显示该列的前3条数据

### 存在的问题
- **数据源固化**：数据源列无法独立选择，只能使用目标列
- **预览不直观**：用户无法看到将要处理的具体单元格数据
- **操作体验不佳**：用户需要推测数据内容，无法精确了解处理对象

## 🛠 解决方案设计

### 1. 数据源列选择功能

#### 界面设计
```
AI模型
[DeepSeek-V3 (高性能智能模型) ▼]

数据源列                    <- 新增功能
[选择要处理的数据列... ▼]     <- 新增下拉框

预设模板
[选择预设模板... ▼]
```

#### 技术实现方案
- **位置**：插入到AI模型选择和预设模板之间
- **数据源**：从表格的可见列中获取（排除系统列如select、index、actions）
- **默认值**：当前目标列（保持向后兼容）
- **验证**：确保选择的列包含有效数据

#### 界面要求
- 下拉框样式与现有组件保持一致
- 显示列的友好名称（title）而非技术ID
- 支持列的分类标识（如系统列、用户列）
- 提供列数据类型的视觉提示

### 2. 改进的数据预览功能

#### 当前数据预览
```
📊 数据预览 (前3条)
┌─────────────────────────┐
│ 第1条: [列数据内容]        │
│ 第2条: [列数据内容]        │
│ 第3条: [列数据内容]        │
└─────────────────────────┘
```

#### 改进后的数据预览
```
📊 数据预览 - 选中行×数据源列
💡 当前处理范围：选中行 (2行) | 数据源：标题列

┌─────────────────────────────────────┐
│ 🔸 第1行 (ID: row_1)                │
│ [标题列的具体内容...]                 │
│                                     │
│ 🔸 第2行 (ID: row_2)                │
│ [标题列的具体内容...]                 │
└─────────────────────────────────────┘

统计信息：共2个单元格将被处理
```

#### 功能增强点
- **行标识**：显示行号和行ID，便于用户定位
- **列信息**：明确显示数据源列名称
- **处理范围**：动态显示当前处理的行数统计
- **数据完整性**：显示选中行×数据源列的所有交集数据（非仅前3条）
- **空数据处理**：对空白或无效数据给出提示

### 3. 数据流改进

#### 当前数据流
```
用户选中行 → 点击列AI按钮 → 固定数据源=目标列 → 生成预览数据
```

#### 改进后数据流
```
用户选中行 → 点击列AI按钮 → 用户选择数据源列 → 动态生成预览数据
          ↓
     目标列(固定) + 数据源列(可选) → 精确的单元格数据预览
```

## 💻 技术实现细节

### 1. 组件接口扩展

#### AIPromptDrawer Props 扩展
```typescript
export interface AIPromptDrawerProps {
  // 现有属性...
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: AIBatchConfig) => void;
  columnId: string;        // 目标列（写入结果的列）
  columnName: string;
  dataCount: number;
  sampleData: string[];
  
  // 新增属性
  availableColumns: Array<{  // 可选择的数据源列
    id: string;
    title: string;
    dataType: string;
    isSystemColumn: boolean;
  }>;
  selectedRows: Array<{      // 选中的行数据
    rowId: string;
    rowIndex: number;
    data: Record<string, any>;
  }>;
  
  // 其他现有属性...
  selectedRowCount?: number;
  filteredRowCount?: number;
  totalRowCount?: number;
  processingScope?: 'selected' | 'filtered' | 'all';
}
```

#### AIBatchConfig 扩展
```typescript
export interface AIBatchConfig {
  // 现有属性...
  model: string;
  promptTemplate: string;
  maxConcurrency: number;
  dryRun: boolean;
  writeTarget: 'virtual' | 'overwrite' | 'append';
  processingScope?: 'selected' | 'filtered' | 'all';
  
  // 新增属性
  sourceColumnId: string;  // 数据源列ID
}
```

### 2. 状态管理

#### 新增状态
```typescript
// 在 AIPromptDrawer 组件内部
const [sourceColumnId, setSourceColumnId] = useState<string>(columnId); // 默认为目标列
const [previewData, setPreviewData] = useState<Array<{
  rowId: string;
  rowIndex: number;
  content: string;
  isEmpty: boolean;
}>>([]);
```

#### 数据预览计算逻辑
```typescript
const calculatePreviewData = useCallback(() => {
  if (!sourceColumnId || !selectedRows) return [];
  
  return selectedRows.map((row, index) => ({
    rowId: row.rowId,
    rowIndex: row.rowIndex,
    content: String(row.data[sourceColumnId] || ''),
    isEmpty: !row.data[sourceColumnId] || String(row.data[sourceColumnId]).trim() === ''
  }));
}, [sourceColumnId, selectedRows]);

useEffect(() => {
  setPreviewData(calculatePreviewData());
}, [calculatePreviewData]);
```

### 3. YouTubeTable.tsx 修改

#### 数据传递逻辑修改
```typescript
// 扩展 getProcessingInfo 函数返回值
const getProcessingInfo = React.useCallback(() => {
  // 现有逻辑...
  
  return {
    processingScope,
    targetRows,
    dataCount,
    selectedRowCount: selectedRows.length,
    filteredRowCount: filteredRows.length,
    totalRowCount: allRows.length,
    // 新增：完整的行数据
    selectedRowsData: targetRows.map(row => ({
      rowId: row.original.id,
      rowIndex: row.index,
      data: row.original
    })),
    // 新增：可用列信息
    availableColumns: dynamicColumns.visibleConfigs
      .filter(col => !['select', 'index', 'actions'].includes(col.id))
      .map(col => ({
        id: col.id,
        title: col.title,
        dataType: col.dataType,
        isSystemColumn: col.isSystemColumn
      }))
  }
}, [rowSelection, table, columnFilters, globalFilter, dynamicColumns]);
```

#### AIPromptDrawer 调用修改
```typescript
<AIPromptDrawer
  isOpen={showAIDrawer}
  onClose={() => {
    setShowAIDrawer(false)
    setSelectedColumnForAI(null)
  }}
  onSubmit={handleAIBatchSubmit}
  columnId={selectedColumnForAI.id}
  columnName={selectedColumnForAI.name}
  
  // 传递新的数据结构
  availableColumns={(() => {
    const info = getProcessingInfo()
    return info.availableColumns
  })()}
  selectedRows={(() => {
    const info = getProcessingInfo()
    return info.selectedRowsData
  })()}
  
  // 保持现有兼容属性
  dataCount={(() => {
    const info = getProcessingInfo()
    return info.dataCount
  })()}
  sampleData={[]}  // 将被新的预览逻辑替代
  
  // 其他现有属性...
/>
```

## 🎨 用户界面设计

### 数据源列选择界面
```
┌─────────────────────────────────────┐
│ 数据源列                             │
│ ┌─────────────────────────────────┐  │
│ │ 📝 标题列               ▼     │  │
│ └─────────────────────────────────┘  │
│ 💡 选择包含待处理数据的列             │
└─────────────────────────────────────┘
```

### 改进的数据预览界面
```
┌─────────────────────────────────────┐
│ 📊 数据预览 - 选中行×数据源列        │
│                                     │
│ 📌 处理范围：选中行 (2行)             │
│ 📌 数据源：标题列                    │
│ 📌 目标列：新基础文本列               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔸 第1行                        │ │
│ │ 河南省富少林寺方丈释慧信被调查！... │ │
│ │                                 │ │
│ │ 🔸 第2行                        │ │
│ │ 美国众议院大动作: 中国富豪资产将被光│ │
│ │                                 │ │
│ │ ❌ 第3行                        │ │
│ │ (该行数据为空，将跳过处理)        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ✅ 共2个有效单元格将被处理           │
│ ⚠️ 1个空单元格将被跳过              │
└─────────────────────────────────────┘
```

## 🔄 实现步骤

### Phase 1: 基础功能实现
1. **扩展接口定义**：修改 AIPromptDrawer 的 Props 和 Config 接口
2. **添加数据源选择**：在 AIPromptDrawer 中添加列选择下拉框
3. **实现数据预览计算**：基于选中行和数据源列计算预览数据

### Phase 2: 界面优化
4. **美化数据预览界面**：实现新的预览布局和样式
5. **添加统计信息**：显示有效数据统计和空数据提示
6. **用户体验优化**：添加加载状态、错误处理等

### Phase 3: 集成测试
7. **修改 YouTubeTable.tsx**：更新数据传递逻辑
8. **测试兼容性**：确保现有功能正常工作
9. **性能优化**：优化大数据量情况下的预览计算

## 🧪 测试用例

### 功能测试
1. **基本功能**：选择不同数据源列，验证预览数据正确性
2. **边界情况**：空数据、大量数据、特殊字符等情况测试
3. **用户交互**：下拉框选择、数据更新、界面响应等测试

### 兼容性测试
1. **现有流程**：确保现有AI批处理功能完全正常
2. **数据完整性**：验证处理结果与预期一致
3. **界面适配**：确保在不同屏幕尺寸下正常显示

### 性能测试
1. **大数据量**：测试选中大量行时的预览性能
2. **实时更新**：测试列选择变化时的响应速度
3. **内存使用**：确保不会造成内存泄漏

## 📝 验收标准

### ✅ 必须实现的功能
- [ ] 数据源列选择下拉框正常工作
- [ ] 数据预览能正确显示选中行×选择列的数据
- [ ] 现有AI批处理功能完全正常
- [ ] 界面美观且用户体验良好

### ✅ 质量要求
- [ ] 代码符合项目规范和TypeScript类型安全
- [ ] 性能良好，无明显的响应延迟
- [ ] 错误处理完善，用户操作引导清晰
- [ ] 兼容现有的所有功能和配置

### ✅ 文档要求
- [ ] 代码注释完整，易于维护
- [ ] 用户操作说明清晰
- [ ] 技术文档更新到位

## 🎯 预期效果

### 用户体验提升
- **更直观**：用户可以清楚看到即将处理的具体数据内容
- **更灵活**：数据源列可以独立选择，不受目标列限制  
- **更准确**：精确了解处理范围，避免意外的数据处理

### 技术价值
- **架构优化**：数据源与目标列解耦，系统更加灵活
- **可扩展性**：为后续功能扩展奠定基础
- **代码质量**：遵循最小修改原则，保持系统稳定性

---

**文档版本**: v1.0  
**创建日期**: 2025-07-28  
**最后更新**: 2025-07-28  
**状态**: 待开发