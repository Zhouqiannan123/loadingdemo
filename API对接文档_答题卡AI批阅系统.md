# 答题卡AI批阅系统 API对接文档

## 1. 系统概述

### 1.1 基本信息
- **系统名称**: 答题卡AI批阅系统 (answer-card)
- **版本**: 1.0.0
- **开发商**: 子衿社
- **服务地址**: http://172.18.81.254:9002
- **基础路径**: /api-answer-card

### 1.2 系统功能
本系统提供基于AI的教辅批阅服务，支持拍照识别、教辅匹配、智能批阅、结果修正等完整功能。

### 1.3 主要特性
- 📸 **拍照搜索**: 支持微信MediaId、OSS路径、文件上传三种方式
- 🔍 **智能匹配**: 基于图像embedding的教辅页面匹配
- 🤖 **AI批阅**: 多模态大模型支持的智能批阅
- ✏️ **结果修正**: 支持用户手动修正批阅结果
- 📊 **统计分析**: 提供详细的批阅统计和错题分析

## 2. 认证与权限

### 2.1 请求头设置
```http
Content-Type: application/json  # JSON请求
Content-Type: application/x-www-form-urlencoded  # 表单请求
Content-Type: multipart/form-data  # 文件上传
```

### 2.2 用户身份标识
系统通过以下参数识别用户身份：
- `appid`: 应用ID
- `openid`: 用户唯一标识

## 3. 通用响应格式

### 3.1 标准响应结构
```json
{
  "status": 200,           // 响应状态码：200-成功，201-失败
  "msg": "success",        // 响应信息
  "data": {}              // 响应数据
}
```

### 3.2 分页响应结构
```json
{
  "status": 200,
  "msg": "success",
  "data": {
    "totalElements": 100,    // 总记录数
    "totalPages": 10,        // 总页数
    "first": true,          // 是否首页
    "last": false,          // 是否末页
    "size": 10,             // 页面大小
    "content": [],          // 数据列表
    "numberOfElements": 10  // 当前页记录数
  }
}
```

## 4. 核心API接口

### 4.1 教辅书籍管理

#### 4.1.1 获取书籍列表
```http
POST /api-answer-card/mp/aimarking/match/record/list
```

**请求参数**:
```json
{
  "gradeId": 6,              // 年级ID (必需)
  "volumeId": 1,             // 册次ID (必需)  
  "versionSubjectList": [    // 版本科目过滤 (必需)
    {
      "versionId": 1,        // 版本ID
      "subjectId": 2         // 科目ID
    }
  ]
}
```

**响应示例**:
```json
{
  "status": 200,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "abbrName": "小学数学练习册",
      "fullName": "人教版小学数学三年级上册练习册",
      "thumbCoverPath": "https://oss.example.com/cover.jpg",
      "sn": "9787107234567",
      "esn": "001",
      "subject": {"id": 2, "name": "数学"},
      "version": {"id": 1, "name": "人教版"},
      "gradeList": [{"id": 6, "name": "三年级"}],
      "volume": {"id": 1, "name": "上册"},
      "course": "小学数学"
    }
  ]
}
```

#### 4.1.2 检查书籍是否支持批阅
```http
GET /api-answer-card/mp/aimarking/match/record/onMarking?bookId=1
```

**响应示例**:
```json
{
  "status": 200,
  "msg": "success", 
  "data": true  // true-支持批阅，false-不支持
}
```

### 4.2 拍照搜索与匹配

#### 4.2.1 通过文件上传搜索
```http
POST /api-answer-card/mp/aimarking/match/record/searchByPhotoFile
Content-Type: multipart/form-data
```

**请求参数**:
- `file`: 图片文件 (必需)
- `channel`: 入口渠道，如"local" (必需)
- `bookIds`: 书籍ID列表，逗号分隔 (可选)

#### 4.2.2 通过OSS路径搜索
```http
POST /api-answer-card/mp/aimarking/match/record/searchByPhotoPath
```

**请求参数**:
- `photoPath`: 图片OSS路径 (必需)
- `channel`: 入口渠道 (必需) 
- `bookIds`: 书籍ID列表，逗号分隔 (可选)

#### 4.2.3 通过微信MediaId搜索
```http
POST /api-answer-card/mp/aimarking/match/record/searchByMediaId
```

**请求参数**:
- `mediaId`: 微信临时素材ID (必需)
- `channel`: 入口渠道 (必需)
- `bookIds`: 书籍ID列表，逗号分隔 (可选)

**匹配响应示例**:
```json
{
  "status": 200,
  "msg": "success",
  "data": {
    "id": 12345,              // 匹配记录ID
    "appid": "wx123456",
    "openid": "user123",
    "channel": "local",
    "photoPath": "https://oss.example.com/photo.jpg",
    "matchResultList": [      // 匹配结果列表
      {
        "id": 1001,           // 匹配项ID
        "bookId": 1,
        "bookFullName": "人教版小学数学三年级上册",
        "sn": "9787107234567",
        "courseName": "小学数学",
        "pageId": 15,
        "pageName": "第5页",
        "blankPagePath": "https://oss.example.com/blank.jpg",
        "width": 800,
        "height": 1200,
        "cosineSimilarity": 0.95  // 相似度得分
      }
    ]
  }
}
```

### 4.3 开始AI批阅

#### 4.3.1 选择匹配结果并开始批阅
```http
POST /api-answer-card/mp/aimarking/match/record/acceptMatchResult
```

**请求参数**:
- `matchRecordId`: 匹配记录ID (必需)
- `acceptIndex`: 选择的匹配项索引，从0开始 (必需)

**响应示例**:
```json
{
  "status": 200,
  "msg": "批阅任务已启动",
  "data": null
}
```

#### 4.3.2 执行AI批阅 (高级接口)
```http
POST /api-answer-card/aimarking/workbook/aimarkStudentPage
Content-Type: application/json
```

**请求参数**:
```json
{
  "userPicUrl": "https://oss.example.com/student.jpg",  // 学生答题图片
  "course": "小学数学",                                  // 课程名称
  "blankQrImgUrl": "https://oss.example.com/blank.jpg", // 空白页图片
  "answerImgUrl": "https://oss.example.com/answer.jpg", // 答案页图片
  "questionList": [                                      // 题目列表
    {
      "id": 1,
      "name": "第1题"
    }
  ]
}
```

### 4.4 批阅结果查询

#### 4.4.1 获取批阅记录详情
```http
GET /api-answer-card/mp/aimarking/record/getRecordById?id=123
```

**响应示例**:
```json
{
  "status": 200,
  "msg": "success",
  "data": {
    "id": 123,
    "appid": "wx123456",
    "openid": "user123",
    "courseName": "小学数学",
    "bookId": 1,
    "bookAbbrName": "数学练习册",
    "bookFullName": "人教版小学数学三年级上册练习册",
    "pageNo": 5,
    "pageName": "第5页",
    "photoPath": "https://oss.example.com/photo.jpg",
    "blankQrPagePath": "https://oss.example.com/blank.jpg",
    "answerPagePath": "https://oss.example.com/answer.jpg",
    "width": 800,
    "height": 1200,
    "aimarkResult": [         // AI批阅结果
      {
        "subStatus": 1,       // 分题状态：1-正确识别，2-漏识别，3-多余识别
        "questionId": 1,
        "questionName": "第1题",
        "aiOpinion": "计算错误，建议复习乘法口诀",
        "areBlank": 0,        // 0-已作答，1-未作答
        "areRight": 0,        // 0-错误，1-正确
        "areAmend": false,    // 是否修正过
        "confidence": "0.95", // 置信度
        "aiType": "multimodal",
        "version": "v1.0"
      }
    ],
    "amendQuestionList": [],  // 修正过的题目ID列表
    "status": 1,              // 批阅状态：0-进行中，1-完成，2-失败
    "startTime": "2024-01-15T10:00:00",
    "endTime": "2024-01-15T10:00:30",
    "restatus": 1,            // 评语状态：0-进行中，1-完成，2-失败  
    "airemarkResult": "本次作业完成较好，但需加强计算练习",
    "restartTime": "2024-01-15T10:00:30",
    "reendTime": "2024-01-15T10:00:45"
  }
}
```

#### 4.4.2 按日期查询批阅列表
```http
GET /api-answer-card/mp/aimarking/record/listByUserDay?createDay=2024-01-15&courseName=数学
```

**请求参数**:
- `createDay`: 查询日期，格式：yyyy-MM-dd (必需)
- `courseName`: 科目筛选，如"语文"、"数学"、"英语" (可选)

### 4.5 批阅结果修正

#### 4.5.1 修正题目批阅结果
```http
POST /api-answer-card/mp/aimarking/record/amendQuestionByRecordId
Content-Type: application/json
```

**请求参数**:
```json
{
  "recordId": 123,          // 批阅记录ID
  "questionId": 1,          // 题目ID
  "areCorrect": true        // 修正结果：true-正确，false-错误
}
```

### 4.6 统计分析

#### 4.6.1 按年级学科统计
```http
GET /api-answer-card/mp/aimarking/record/countCompleteInfoByGradeAndSubject?gradeId=6&subjectId=1&day=2024-01-15
```

**响应示例**:
```json
{
  "status": 200,
  "msg": "success",
  "data": {
    "appid": "wx123456",
    "openid": "user123", 
    "pageCount": 5,               // 已批阅页数
    "questionCount": 20,          // 已批阅题目数
    "rightQuestionCount": 15,     // 正确题目数
    "rightQuestionPercent": 75,   // 正确率
    "wrongQuestionIdList": [      // 错题列表
      {
        "questionId": 1,
        "createDate": "2024-01-15",
        "recordId": 123
      }
    ]
  }
}
```

#### 4.6.2 按书籍统计
```http
GET /api-answer-card/mp/aimarking/record/countCompleteInfoByBookId?bookId=1
```

**响应示例**:
```json
{
  "status": 200,
  "msg": "success", 
  "data": {
    "bookId": 1,
    "bookInfo": {             // 书籍信息
      "id": 1,
      "fullName": "人教版小学数学三年级上册练习册",
      "thumbCoverPath": "https://oss.example.com/cover.jpg"
    },
    "markedPageIdList": [     // 已批阅的页面
      {
        "pageId": 15,
        "recordId": 123
      }
    ],
    "allPageList": [          // 书籍所有页面
      {
        "bookId": 1,
        "pageId": 15,
        "pageNo": 5,
        "pageName": "第5页"
      }
    ],
    "questionCount": 20,      // 总题目数
    "rightQuestionCount": 15, // 正确题目数  
    "rightQuestionPercent": 75 // 正确率
  }
}
```

### 4.7 教辅管理 (后台接口)

#### 4.7.1 创建批阅教辅
```http
POST /api-answer-card/aimarking/workbook/createWorkBook
```

**请求参数**:
- `bookId`: 书籍ID (必需)
- `createMatch`: 是否同时创建匹配库 (必需)

#### 4.7.2 删除教辅
```http
POST /api-answer-card/aimarking/workbook/delete
```

**请求参数**:
- `id`: 教辅ID (必需)

### 4.8 日志查询 (后台接口)

#### 4.8.1 批阅记录分页查询
```http
GET /api-answer-card/aimarking/record/page
```

**请求参数**:
- `search_EQ_appid`: 按APPID筛选 (可选)
- `search_EQ_openid`: 按OPENID筛选 (可选)
- `search_LIKE_bookName`: 按书籍名称模糊查询 (可选)
- `search_EQ_courseName`: 按课程名称筛选 (可选)
- `search_GTE_startTime`: 开始日期 (可选)
- `search_LTE_endTime`: 结束日期 (可选)
- `page`: 页码，从0开始 (可选)
- `size`: 页面大小，默认10 (可选)

#### 4.8.2 匹配记录分页查询
```http
GET /api-answer-card/aimarking/match/record/page
```

**请求参数**:
- `search_EQ_appid`: 按APPID筛选 (可选)
- `search_EQ_openid`: 按OPENID筛选 (可选)
- `search_EQ_acceptIndex`: 按匹配项索引筛选 (可选)
- `search_GTE_createTime`: 匹配开始时间 (可选)
- `search_LTE_createTime`: 匹配结束时间 (可选)
- `page`: 页码，从0开始 (可选)
- `size`: 页面大小，默认10 (可选)

## 5. 使用流程

### 5.1 标准批阅流程
```
1. 获取书籍列表 → 用户选择目标书籍
2. 拍照搜索 → 系统返回匹配结果
3. 选择匹配项 → 启动AI批阅
4. 查询批阅结果 → 获取详细批阅信息
5. (可选) 修正错误结果 → 提升准确性
6. 查看统计分析 → 了解学习情况
```

### 5.2 集成建议
1. **错误处理**: 建议对所有API调用实现重试机制
2. **状态轮询**: 批阅和评语生成是异步过程，需定期查询状态
3. **图片处理**: 建议上传前对图片进行压缩和格式转换
4. **缓存策略**: 书籍列表等基础数据建议本地缓存

## 6. 错误码说明

| 状态码 | 说明 | 处理建议 |
|--------|------|----------|
| 200 | 成功 | 正常处理 |
| 201 | 业务失败 | 检查请求参数和业务逻辑 |
| 400 | 请求参数错误 | 检查参数格式和必填项 |
| 401 | 未授权 | 检查认证信息 |
| 500 | 服务器内部错误 | 联系技术支持 |

## 7. 性能指标

### 7.1 响应时间
- **拍照搜索**: < 3秒
- **AI批阅**: 5-30秒 (取决于题目数量)
- **评语生成**: 3-10秒
- **查询接口**: < 1秒

### 7.2 支持格式
- **图片格式**: JPG, PNG, BMP
- **图片大小**: 建议不超过5MB
- **图片分辨率**: 建议600x800以上

## 8. 联系方式

- **技术支持**: 子衿社技术团队
- **API版本**: 1.0.0
- **文档更新**: 2024年1月

---

*本文档基于实际API接口生成，如有疑问请联系开发团队。*
