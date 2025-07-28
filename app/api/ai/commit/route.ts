import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 请求验证Schema
const CommitRequestSchema = z.object({
  originalColumnId: z.string().min(1, '原始列ID不能为空'),
  columnKey: z.string().min(1, '列键不能为空'),
  writeTarget: z.enum(['virtual', 'overwrite', 'append'], {
    errorMap: () => ({ message: '写入目标必须是 virtual、overwrite 或 append' })
  }),
  data: z.array(z.object({
    rowId: z.string().min(1, '行ID不能为空'),
    output: z.string().min(1, '输出内容不能为空'),
  })).min(1, '提交数据不能为空'),
  jobId: z.string().min(1, 'Job ID不能为空'),
});

type CommitRequest = z.infer<typeof CommitRequestSchema>;

// 模拟数据版本控制表结构
interface DatasetVersion {
  id: string;
  originalColumnId: string;
  columnName: string;
  versionNumber: number;
  backupData: Record<string, any>[];
  timestamp: string;
  operation: 'overwrite' | 'append';
  jobId: string;
}

// 内存存储（实际项目应使用数据库）
const datasetVersions: DatasetVersion[] = [];
let versionCounter = 1;

/**
 * 虚拟列提交落库API
 * 支持三种写入模式：
 * 1. virtual: 创建新列（默认命名：原列_ai_时间戳）
 * 2. overwrite: 覆盖原列（先备份到版本表）
 * 3. append: 追加到原列（用分隔符拼接）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证请求参数
    const validationResult = CommitRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: '请求参数验证失败', 
          details: validationResult.error.errors.map(e => e.message).join(', ')
        },
        { status: 400 }
      );
    }
    
    const { 
      originalColumnId, 
      columnKey, 
      writeTarget, 
      data, 
      jobId 
    }: CommitRequest = validationResult.data;
    
    console.log(`开始提交虚拟列数据: ${writeTarget} 模式，${data.length} 行数据`);
    
    // 根据写入模式执行不同的提交逻辑
    let result: any;
    
    switch (writeTarget) {
      case 'virtual':
        result = await commitAsVirtualColumn(originalColumnId, columnKey, data, jobId);
        break;
        
      case 'overwrite':
        result = await commitAsOverwrite(originalColumnId, data, jobId);
        break;
        
      case 'append':
        result = await commitAsAppend(originalColumnId, data, jobId);
        break;
        
      default:
        return NextResponse.json(
          { error: '不支持的写入模式' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      writeTarget,
      affectedRows: data.length,
      result,
      message: getSuccessMessage(writeTarget, data.length)
    });
    
  } catch (error) {
    console.error('虚拟列提交失败:', error);
    
    return NextResponse.json(
      { 
        error: '提交失败', 
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 虚拟列模式：创建新列
 */
async function commitAsVirtualColumn(
  originalColumnId: string,
  columnKey: string,
  data: Array<{ rowId: string; output: string }>,
  jobId: string
) {
  // 生成新列名（去重处理）
  const newColumnName = generateUniqueColumnName(originalColumnId);
  
  console.log(`创建新列: ${newColumnName}`);
  
  // 模拟数据库操作：ALTER TABLE 添加新列
  const alterTableSQL = `ALTER TABLE dataset ADD COLUMN ${newColumnName} TEXT;`;
  
  // 模拟数据库操作：批量更新新列数据
  const updateStatements = data.map(({ rowId, output }) => 
    `UPDATE dataset SET ${newColumnName} = '${escapeSQLString(output)}' WHERE id = '${rowId}';`
  );
  
  // 这里实际项目中应该执行真实的数据库操作
  // await db.execute(alterTableSQL);
  // for (const sql of updateStatements) {
  //   await db.execute(sql);
  // }
  
  return {
    type: 'new_column',
    columnName: newColumnName,
    sql: {
      alter: alterTableSQL,
      updates: updateStatements
    }
  };
}

/**
 * 覆盖模式：先备份再覆盖
 */
async function commitAsOverwrite(
  originalColumnId: string,
  data: Array<{ rowId: string; output: string }>,
  jobId: string
) {
  console.log(`覆盖模式：备份并覆盖列 ${originalColumnId}`);
  
  // 1. 先备份原数据到版本表
  const backupVersion = await backupColumnData(originalColumnId, 'overwrite', jobId);
  
  // 2. 执行覆盖操作
  const updateStatements = data.map(({ rowId, output }) => 
    `UPDATE dataset SET ${originalColumnId} = '${escapeSQLString(output)}' WHERE id = '${rowId}';`
  );
  
  // 这里实际项目中应该执行真实的数据库操作
  // for (const sql of updateStatements) {
  //   await db.execute(sql);
  // }
  
  return {
    type: 'overwrite',
    columnName: originalColumnId,
    backupVersion: backupVersion.versionNumber,
    sql: {
      updates: updateStatements
    }
  };
}

/**
 * 追加模式：在原内容后拼接
 */
async function commitAsAppend(
  originalColumnId: string,
  data: Array<{ rowId: string; output: string }>,
  jobId: string
) {
  console.log(`追加模式：在列 ${originalColumnId} 后追加内容`);
  
  // 1. 先备份原数据到版本表
  const backupVersion = await backupColumnData(originalColumnId, 'append', jobId);
  
  // 2. 执行追加操作（使用换行符分隔）
  const updateStatements = data.map(({ rowId, output }) => 
    `UPDATE dataset SET ${originalColumnId} = CONCAT(${originalColumnId}, '\\n\\n--- AI生成内容 ---\\n', '${escapeSQLString(output)}') WHERE id = '${rowId}';`
  );
  
  // 这里实际项目中应该执行真实的数据库操作
  // for (const sql of updateStatements) {
  //   await db.execute(sql);
  // }
  
  return {
    type: 'append',
    columnName: originalColumnId,
    backupVersion: backupVersion.versionNumber,
    separator: '\\n\\n--- AI生成内容 ---\\n',
    sql: {
      updates: updateStatements
    }
  };
}

/**
 * 备份列数据到版本表
 */
async function backupColumnData(
  columnId: string,
  operation: 'overwrite' | 'append',
  jobId: string
): Promise<DatasetVersion> {
  // 模拟查询原数据
  const originalData: any[] = [
    // 这里实际项目中应该从数据库查询
    // SELECT id, ${columnId} FROM dataset WHERE id IN (...)
  ];
  
  const version: DatasetVersion = {
    id: `version_${versionCounter++}`,
    originalColumnId: columnId,
    columnName: columnId,
    versionNumber: versionCounter,
    backupData: originalData,
    timestamp: new Date().toISOString(),
    operation,
    jobId,
  };
  
  // 存储到版本表
  datasetVersions.push(version);
  
  console.log(`创建数据备份版本: ${version.versionNumber}`);
  
  return version;
}

/**
 * 生成唯一的列名
 */
function generateUniqueColumnName(originalColumnId: string): string {
  const timestamp = Date.now().toString().slice(-6);
  let baseName = `${originalColumnId}_ai_${timestamp}`;
  let counter = 1;
  let uniqueName = baseName;
  
  // 这里实际项目中应该查询数据库检查列是否存在
  // while (await columnExists(uniqueName)) {
  //   uniqueName = `${baseName}_${counter++}`;
  // }
  
  return uniqueName;
}

/**
 * SQL字符串转义
 */
function escapeSQLString(str: string): string {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

/**
 * 获取成功消息
 */
function getSuccessMessage(writeTarget: string, rowCount: number): string {
  const rowText = `${rowCount} 行数据`;
  
  switch (writeTarget) {
    case 'virtual':
      return `成功创建新列并写入 ${rowText}`;
    case 'overwrite':
      return `成功备份并覆盖 ${rowText}（可通过版本历史回滚）`;
    case 'append':
      return `成功在原列追加 ${rowText}`;
    default:
      return `成功处理 ${rowText}`;
  }
}

/**
 * 获取备份版本列表（用于回滚功能）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const columnId = searchParams.get('columnId');
  
  if (!columnId) {
    return NextResponse.json(
      { error: '缺少 columnId 参数' },
      { status: 400 }
    );
  }
  
  // 查询指定列的版本历史
  const versions = datasetVersions
    .filter(v => v.originalColumnId === columnId)
    .sort((a, b) => b.versionNumber - a.versionNumber); // 按版本号倒序
  
  return NextResponse.json({
    columnId,
    versions: versions.map(v => ({
      id: v.id,
      versionNumber: v.versionNumber,
      timestamp: v.timestamp,
      operation: v.operation,
      jobId: v.jobId,
      backupRowCount: v.backupData.length,
    }))
  });
}