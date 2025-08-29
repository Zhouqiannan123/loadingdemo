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
      // 创建临时canvas来获取图片数据
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')

      tempCanvas.width = this.canvas.width
      tempCanvas.height = this.canvas.height

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

      // 计算差异
      this.calculateDifferences(blankData, answerData)
      this.generateAnimationFrames()

      document.getElementById('playBtn').disabled = false
      document.getElementById('resetBtn').disabled = false
      this.updateStatus('图片处理完成，可以开始播放动画！', 'success')
    } catch (error) {
      console.error('处理图片时出错:', error)
      this.updateStatus('处理图片时出错，请重试')
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

    // 按照从左到右、从上到下的顺序对差异点进行排序
    this.differenceData.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 10) {
        // 同一行的像素
        return a.x - b.x
      }
      return a.y - b.y
    })

    // 将像素点分组，模拟"字"的概念
    const groupSize = Math.max(1, Math.floor(this.differenceData.length / 100)) // 大概100帧动画

    for (let i = 0; i < this.differenceData.length; i += groupSize) {
      const frame = this.differenceData.slice(i, i + groupSize)
      this.animationFrames.push(frame)
    }

    console.log(`生成了 ${this.animationFrames.length} 个动画帧`)
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

    // 绘制当前帧的像素点
    const frame = this.animationFrames[this.currentFrame]
    const imageData = this.ctx.createImageData(1, 1)

    frame.forEach((pixel) => {
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

    // 设置下一帧
    this.animationTimer = setTimeout(() => {
      this.animateFrame()
    }, this.animationSpeed)
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

    this.updateStatus('动画播放完成！', 'success')
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
