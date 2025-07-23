## FEATURE:

查询youtube数据，然后使用进行ai进行批量处理
支持3中数据访问格式，单链接、多链接、账号链接
访问官方YouTube Data API v3，拿到数据后，通过表格进行展示
目前使用管理者的youtube账号访问api，以后会要求用户授权后才访问api，预留位置
表格展示后可以编辑内容，排序、筛选、单元格

##### 1. **视频数据抓取功能**

- **支持视频获取**：
    
    - 单个 YouTube 视频链接
        
    - 多个视频链接（批量输入，如换行粘贴、上传 CSV）
        
- **可获取字段**：
    
    - 视频标题
        
    - 视频播放量
        
    - 视频点赞量、收藏量
        
    - 视频发布时间
        
    - 视频封面图 URL
        
    - 视频页面链接
        
    - 视频简介文案（description）

- **支持账号获取：**
	-  指定 YouTube 账号（账号链接或频道ID）

- **可获取字段：**
	- 所有视频链接或者ID
	- 通过多视频链接获取方式，得到每个视频的数据字段

> ✅ 数据来源：YouTube Data API v3  https://developers.google.com/youtube/v3/determine_quota_cost?hl=zh-cn
> ✅ 使用测试凭证 / 开发者 Key，暂不接入用户 OAuth 登录

---

##### 2. **数据展示与交互界面**

- 类似 Excel 的列表页面、类似飞书的多维表格的功能
    
- 支持以下交互功能：
    
    - 播放量 / 发布时间 / 点赞量的排序和筛选
        
    - 点击字段内容可直接修改（短文本内联、长文本弹出大窗编辑）
        
    - 多选视频项进行批量操作（例如 AI 生成）
    
    - 用户可以自己增加单元格进行编辑操作

---

##### 3. **AI 文案增强功能**

- 接入单一语言大模型 API（如 OpenAI / Claude）：
    
    - 视频标题智能改写（更吸引眼球）
        
    - 视频简介内容摘要
        
    - 多语言翻译（英文 ↔ 中文）
        
    - 语言风格转换（如正式 ↔ 口语）
        

> ✅ 用户可手动输入 prompt，或使用预设模板  
> ✅ 批量选择内容支持一次性 AI 处理多条数据

---

##### 4. **编辑体验优化机制**

- 内容多的字段（如文案）支持弹出式窗口编辑：
    
    - 点击后展开大窗口，便于深度编辑
        
    - 支持 AI 生成按钮内嵌在编辑框中
        
- 所有字段改写后可保存状态（前端标记已编辑）
    

---

##### 5. **数据导出功能**

- 用户可将处理后的数据下载为本地文件（CSV、Excel、markdown）
    
- 可配置导出字段（导出哪些列）

##### 6. **其他功能**

 - 适配移动端界面

 - 获取的数据不保存在数据库，直接展示给用户，提示用户及时下载





## EXAMPLES:

1. 第一个example是tanstack项目，一个制作表格的工具，位置在context-engineering-intro/examples/table-main
- examples/table-main/README.md 可以阅读整项目介绍
- 表头-行-单元格渲染流程。  看 table-main/table/examples/react/basic 下面内容
- 单元格内联编辑、行级保存状态。  看 table-main/table/examples/react/editable-data 下面内容
- 文本／下拉多种筛选方式，可组合叠加。  看 table-main/table/examples/react/filters-faceted/filters-faceted   下面内容
- 拖拽重排列顺序，演示与 `react-dnd` 结合。  看 table-main/table/examples/react/column-ordering   下面内容
- 复选框批量选中 看table-main/table/examples/react/row-selection下面内容，和  看table-main/table/examples/react/  下面内容
- 数万行仍保持流畅滚动，适合大数据集。  看 table-main/table/examples/react/virtualized-rows  下面内容
- 把排序、过滤、拖拽、分页、虚拟化全部串起来。  看 table-main/table/examples/react/kitchen-sink  下面内容



## DOCUMENTATION:

tanstack的官方文档：https://tanstack.com/table/latest
YouTube Data API v3的官方文档：https://developers.google.com/youtube/v3/determine_quota_cost?hl=zh-cn



## OTHER CONSIDERATIONS:
- 包含 .env.example、README 以及设置说明
- 在 README 中包含项目结构。
- 虚拟环境已经设置好了必要的依赖项。
