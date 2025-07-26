# PowerShell脚本测试YouTube字幕API
$videoId = "ihgJy6wNJvI"
$videoUrl = "https://www.youtube.com/watch?v=$videoId"

Write-Host "🔍 测试YouTube字幕抓取API" -ForegroundColor Cyan
Write-Host "视频链接: $videoUrl" -ForegroundColor Yellow
Write-Host "=" * 60

# 测试API端点
$apiUrl = "http://localhost:3000/api/subtitles?id=$videoId"
Write-Host "🔄 正在调用API: $apiUrl" -ForegroundColor Green

try {
    # 检查服务器是否运行
    $testConnection = Test-NetConnection -ComputerName "localhost" -Port 3000 -WarningAction SilentlyContinue
    if (-not $testConnection.TcpTestSucceeded) {
        Write-Host "❌ 服务器未运行在端口3000" -ForegroundColor Red
        Write-Host "请先运行: npm run dev" -ForegroundColor Yellow
        exit 1
    }

    # 调用API
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -ContentType "application/json" -TimeoutSec 30
    
    Write-Host "✅ API调用成功" -ForegroundColor Green
    Write-Host ""
    
    if ($response -is [array] -and $response.Count -gt 0) {
        $result = $response[0]
        
        Write-Host "📊 字幕信息:" -ForegroundColor Cyan
        Write-Host "  视频ID: $($result.id)"
        Write-Host "  语言: $($result.lang)"
        Write-Host "  字幕条数: $($result.cues.Count)"
        
        if ($result.error) {
            Write-Host "  ❌ 错误: $($result.error)" -ForegroundColor Red
        } elseif ($result.cues.Count -gt 0) {
            Write-Host ""
            Write-Host "📝 字幕内容 (前10条):" -ForegroundColor Cyan
            Write-Host "-" * 80
            
            for ($i = 0; $i -lt [Math]::Min(10, $result.cues.Count); $i++) {
                $cue = $result.cues[$i]
                $startTime = [TimeSpan]::FromSeconds($cue.start).ToString("mm\:ss\.fff")
                $endTime = [TimeSpan]::FromSeconds($cue.start + $cue.dur).ToString("mm\:ss\.fff")
                $text = $cue.text -replace "`n", " "
                
                Write-Host ("{0:D2}. [{1} - {2}] {3}" -f ($i + 1), $startTime, $endTime, $text)
            }
            
            if ($result.cues.Count -gt 10) {
                Write-Host ""
                Write-Host "... 还有 $($result.cues.Count - 10) 条字幕" -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠️  该视频没有可用的字幕" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ API返回数据格式异常" -ForegroundColor Red
        Write-Host $response
    }
    
} catch {
    Write-Host "❌ API调用失败: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Message -like "*连接*" -or $_.Exception.Message -like "*Connection*") {
        Write-Host "提示: 请确保开发服务器正在运行 (npm run dev)" -ForegroundColor Yellow
    }
}