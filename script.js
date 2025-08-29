class AnswerAnimator {
  constructor() {
    this.canvas = document.getElementById('mainCanvas')
    this.ctx = this.canvas.getContext('2d')
    this.blankImage = null
    this.answerImage = null
    this.differenceData = []
    this.animationFrames = []
    this.currentFrame = 0
    this.isAnimating = false
    this.animationSpeed = 14 // 毫秒 (对应速度9: 50 - 9*4 = 14ms)
    this.fastTransitionSpeed = 1 // 题目间快速切换的速度（毫秒，极速模式）
    this.animationTimer = null

    this.initializeEventListeners()
  }

  initializeEventListeners() {
    // 文件上传事件
    document.getElementById('blankImage').addEventListener('change', (e) => {
      this.loadImage(e.target.files[0], 'blank')
    })

    document.getElementById('answerImage').addEventListener('change', (e) => {
      this.loadImage(e.target.files[0], 'answer')
    })

    // 控制按钮事件
    document.getElementById('processBtn').addEventListener('click', () => {
      this.processImages()
    })

    document.getElementById('playBtn').addEventListener('click', () => {
      this.startAnimation()
    })

    document.getElementById('pauseBtn').addEventListener('click', () => {
      this.pauseAnimation()
    })

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.resetAnimation()
    })

    // 速度控制
    const speedRange = document.getElementById('speedRange')
    const speedValue = document.getElementById('speedValue')
    speedRange.addEventListener('input', (e) => {
      const speed = parseInt(e.target.value)
      speedValue.textContent = speed
      this.animationSpeed = 50 - speed * 4 // 反向映射，数值越大速度越快，范围：10-46ms
      this.fastTransitionSpeed = 1 // 过渡速度始终保持1ms极速
    })
  }

  loadImage(file, type) {
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        if (type === 'blank') {
          this.blankImage = img
          this.updateStatus('空白页面图片已加载')
        } else if (type === 'answer') {
          this.answerImage = img
          this.updateStatus('答案页面图片已加载')
        }

        this.checkImagesReady()
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  checkImagesReady() {
    if (this.blankImage && this.answerImage) {
      document.getElementById('processBtn').disabled = false
      this.updateStatus('图片已准备就绪，可以开始处理', 'success')
      this.setupCanvas()
    }
  }

  setupCanvas() {
    // 设置Canvas尺寸为图片尺寸
    const width = Math.max(this.blankImage.width, this.answerImage.width)
    const height = Math.max(this.blankImage.height, this.answerImage.height)

    this.canvas.width = width
    this.canvas.height = height

    // 绘制空白页面作为背景
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.drawImage(this.blankImage, 0, 0)
  }

  async processImages() {
    this.updateStatus('正在处理图片差异...')
    document.getElementById('processBtn').disabled = true

    try {
      // 验证图片是否正确加载
      if (!this.blankImage || !this.answerImage) {
        throw new Error('图片未正确加载')
      }

      // 创建临时canvas来获取图片数据
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')

      tempCanvas.width = this.canvas.width
      tempCanvas.height = this.canvas.height

      console.log(`处理图片尺寸: ${tempCanvas.width} x ${tempCanvas.height}`)

      // 获取空白图片数据
      tempCtx.drawImage(this.blankImage, 0, 0)
      const blankData = tempCtx.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      )

      // 获取答案图片数据
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
      tempCtx.drawImage(this.answerImage, 0, 0)
      const answerData = tempCtx.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      )

      console.log('图片数据获取完成，开始分析差异...')

      // 计算差异
      this.calculateDifferences(blankData, answerData)

      if (this.differenceData.length === 0) {
        throw new Error('未检测到图片差异，请确保上传了正确的图片')
      }

      console.log('差异分析完成，开始生成动画帧...')
      this.generateAnimationFrames()

      if (this.animationFrames.length === 0) {
        throw new Error('未能识别到有效的文字区域')
      }

      document.getElementById('playBtn').disabled = false
      document.getElementById('resetBtn').disabled = false
      this.updateStatus('图片处理完成，可以开始播放动画！', 'success')
    } catch (error) {
      console.error('处理图片时出错:', error)
      this.updateStatus(`处理图片时出错: ${error.message}，请重试`)
      document.getElementById('processBtn').disabled = false
    }
  }

  calculateDifferences(blankData, answerData) {
    const threshold = 30 // 像素差异阈值
    this.differenceData = []

    for (let i = 0; i < blankData.data.length; i += 4) {
      const rDiff = Math.abs(blankData.data[i] - answerData.data[i])
      const gDiff = Math.abs(blankData.data[i + 1] - answerData.data[i + 1])
      const bDiff = Math.abs(blankData.data[i + 2] - answerData.data[i + 2])

      const totalDiff = rDiff + gDiff + bDiff

      if (totalDiff > threshold) {
        const pixelIndex = i / 4
        const x = pixelIndex % this.canvas.width
        const y = Math.floor(pixelIndex / this.canvas.width)

        this.differenceData.push({
          x: x,
          y: y,
          r: answerData.data[i],
          g: answerData.data[i + 1],
          b: answerData.data[i + 2],
          a: answerData.data[i + 3],
        })
      }
    }

    console.log(`找到 ${this.differenceData.length} 个不同的像素点`)
  }

  generateAnimationFrames() {
    this.animationFrames = []

    try {
      // 使用连通分量分析来识别独立的文字
      console.log('开始连通分量分析...')
      const characters = this.findConnectedComponents()
      console.log(`找到 ${characters.length} 个连通分量`)

      if (characters.length === 0) {
        console.warn('未找到任何连通分量')
        return
      }

      // 按照阅读顺序对文字进行排序（从左到右，从上到下）
      characters.sort((a, b) => {
        const centerA = this.getComponentCenter(a)
        const centerB = this.getComponentCenter(b)

        // 如果y坐标差异较小（在同一行），按x坐标排序
        if (Math.abs(centerA.y - centerB.y) < 30) {
          return centerA.x - centerB.x
        }
        // 否则按y坐标排序
        return centerA.y - centerB.y
      })

      // 为每个文字分配动画帧，并标记类型（内容文字 vs 空白区域）
      this.animationFrames = characters.map((character, index) => {
        const center = this.getComponentCenter(character)
        const isTransition = this.isTransitionElement(
          character,
          characters,
          index
        )

        return {
          pixels: character,
          center: center,
          isTransition: isTransition, // 是否为题目间的过渡元素
          size: character.length,
        }
      })

      console.log(`识别出 ${this.animationFrames.length} 个独立文字/符号`)
    } catch (error) {
      console.error('生成动画帧时出错:', error)
      throw new Error('文字识别失败: ' + error.message)
    }
  }

  // 查找连通分量，识别独立的文字区域
  findConnectedComponents() {
    const width = this.canvas.width
    const height = this.canvas.height
    const visited = new Set()
    const components = []

    if (this.differenceData.length === 0) {
      console.warn('没有差异数据进行连通分量分析')
      return components
    }

    console.log(`开始分析 ${this.differenceData.length} 个差异像素点`)

    // 创建像素位置映射
    const pixelMap = new Map()
    this.differenceData.forEach((pixel) => {
      const key = `${pixel.x},${pixel.y}`
      pixelMap.set(key, pixel)
    })

    // 8方向连通性检查
    const directions = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ]

    // 迭代版本的深度优先搜索，避免栈溢出
    const dfs = (startX, startY, component) => {
      const stack = [[startX, startY]]
      let processedCount = 0

      while (stack.length > 0) {
        const [x, y] = stack.pop()
        const key = `${x},${y}`

        if (visited.has(key) || !pixelMap.has(key)) {
          continue
        }

        visited.add(key)
        component.push(pixelMap.get(key))
        processedCount++

        // 防止无限循环，设置处理上限
        if (processedCount > 50000) {
          console.warn('单个连通分量过大，停止处理')
          break
        }

        // 检查8个方向的邻居
        for (const [dx, dy] of directions) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighborKey = `${nx},${ny}`
            if (!visited.has(neighborKey) && pixelMap.has(neighborKey)) {
              stack.push([nx, ny])
            }
          }
        }
      }
    }

    // 遍历所有差异像素点
    let componentCount = 0
    this.differenceData.forEach((pixel, index) => {
      const key = `${pixel.x},${pixel.y}`
      if (!visited.has(key)) {
        const component = []
        dfs(pixel.x, pixel.y, component)

        // 过滤太小的组件（可能是噪点），但降低阈值以适应小字符
        if (component.length > 5) {
          components.push(component)
          componentCount++
        }

        // 提供进度反馈
        if (index % 1000 === 0) {
          console.log(`已处理 ${index}/${this.differenceData.length} 个像素点`)
        }
      }
    })

    console.log(`连通分量分析完成，找到 ${components.length} 个有效组件`)
    return components
  }

  // 计算连通分量的中心点
  getComponentCenter(component) {
    let sumX = 0
    let sumY = 0

    component.forEach((pixel) => {
      sumX += pixel.x
      sumY += pixel.y
    })

    return {
      x: sumX / component.length,
      y: sumY / component.length,
    }
  }

  // 判断是否为过渡元素（题目编号、标点符号等）
  isTransitionElement(character, allCharacters, index) {
    const center = this.getComponentCenter(character)
    const size = character.length

    // 更小尺寸的元素（如标点、题号）- 降低阈值
    if (size < 100) {
      return true
    }

    // 检查垂直间距，如果与上一个元素间距较大，可能是新题目的开始
    if (index > 0) {
      const prevCenter = this.getComponentCenter(allCharacters[index - 1])
      const verticalGap = Math.abs(center.y - prevCenter.y)

      // 降低间距阈值，更积极地识别题目间隔
      if (verticalGap > 30) {
        return true
      }
    }

    // 检查是否为题目编号（扩大识别范围）
    if (center.x < 150 && size < 300) {
      return true
    }

    // 检查是否为单独的符号或数字（通常是题目编号的一部分）
    if (size < 200) {
      return true
    }

    // 检查下一个元素的间距，如果与下一个元素间距较大，也可能是题目结尾
    if (index < allCharacters.length - 1) {
      const nextCenter = this.getComponentCenter(allCharacters[index + 1])
      const nextVerticalGap = Math.abs(nextCenter.y - center.y)

      if (nextVerticalGap > 30) {
        return true
      }
    }

    return false
  }

  startAnimation() {
    if (this.animationFrames.length === 0) return

    this.isAnimating = true
    document.getElementById('playBtn').disabled = true
    document.getElementById('pauseBtn').disabled = false

    this.animateFrame()
  }

  animateFrame() {
    if (!this.isAnimating || this.currentFrame >= this.animationFrames.length) {
      this.completeAnimation()
      return
    }

    // 获取当前帧数据
    const currentFrame = this.animationFrames[this.currentFrame]
    const characterPixels = currentFrame.pixels

    // 批量绘制整个文字
    characterPixels.forEach((pixel) => {
      const imageData = this.ctx.createImageData(1, 1)
      imageData.data[0] = pixel.r
      imageData.data[1] = pixel.g
      imageData.data[2] = pixel.b
      imageData.data[3] = pixel.a
      this.ctx.putImageData(imageData, pixel.x, pixel.y)
    })

    // 更新进度条
    const progress =
      ((this.currentFrame + 1) / this.animationFrames.length) * 100
    document.getElementById('progressFill').style.width = `${progress}%`

    this.currentFrame++

    // 根据元素类型选择播放速度
    const isTransition = currentFrame.isTransition
    const nextDelay = isTransition
      ? this.fastTransitionSpeed
      : this.animationSpeed

    // 记录速度使用情况用于调试
    if (isTransition) {
      console.log(
        `⚡极速过渡元素: 位置(${Math.round(
          currentFrame.center.x
        )}, ${Math.round(currentFrame.center.y)}), 大小:${
          currentFrame.size
        }, 极速模式:${nextDelay}ms`
      )
    }

    // 设置下一帧（显示下一个文字）
    this.animationTimer = setTimeout(() => {
      this.animateFrame()
    }, nextDelay)
  }

  pauseAnimation() {
    this.isAnimating = false
    if (this.animationTimer) {
      clearTimeout(this.animationTimer)
      this.animationTimer = null
    }

    document.getElementById('playBtn').disabled = false
    document.getElementById('pauseBtn').disabled = true
  }

  resetAnimation() {
    this.pauseAnimation()
    this.currentFrame = 0

    // 重新绘制空白页面
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.drawImage(this.blankImage, 0, 0)

    // 重置进度条
    document.getElementById('progressFill').style.width = '0%'

    document.getElementById('playBtn').disabled = false
    document.getElementById('resetBtn').disabled = false

    this.updateStatus('动画已重置，可以重新播放')
  }

  completeAnimation() {
    this.isAnimating = false
    document.getElementById('playBtn').disabled = false
    document.getElementById('pauseBtn').disabled = true
    document.getElementById('progressFill').style.width = '100%'

    // 显示完整的答案页面（V2版本效果）
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.drawImage(this.answerImage, 0, 0)

    this.updateStatus('🎉 动画播放完成！显示完整答案页面', 'success')
    console.log('动画完成，已显示完整答案页面')
  }

  updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status')
    statusElement.textContent = message
    statusElement.className = `status ${type}`
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new AnswerAnimator()
})
